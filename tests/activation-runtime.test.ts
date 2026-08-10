import assert from "node:assert/strict";
import test from "node:test";
import { ActivationRuntime, FakeActivationProvider, WakePhraseProvider, DoubleClapProvider, ExternalActivationProvider } from "../src/index.js";

const next = () => new Promise((resolve) => setImmediate(resolve));

test("turns a provider detection into one structured authoritative event", async () => {
  const provider = new FakeActivationProvider("fake", ["wake_phrase"]);
  const runtime = new ActivationRuntime({ providers: [provider], cooldownMs: 1_000 });
  const events: unknown[] = [];
  const consume = (async () => { for await (const event of runtime.events()) events.push(event); })();

  await runtime.start();
  provider.detect({ method: "wake_phrase", confidence: 0.91, sourceId: "mic-1", roomId: "office" });
  await next();
  await runtime.stop();
  await consume;

  const detected = events.find((event: any) => event.type === "activation.detected") as any;
  assert.match(detected.activationId, /^[a-z0-9_-]{16,}$/);
  assert.equal(detected.method, "wake_phrase");
  assert.equal(detected.sourceId, "mic-1");
  assert.equal(detected.roomId, "office");
  assert.equal(detected.confidence, 0.91);
});

test("suppresses duplicate provider detections during generic cooldown", async () => {
  const provider = new FakeActivationProvider("fake", ["clap"]);
  const runtime = new ActivationRuntime({ providers: [provider], cooldownMs: 10_000 });
  const events: any[] = [];
  const consume = (async () => { for await (const event of runtime.events()) events.push(event); })();

  await runtime.start();
  provider.detect({ method: "clap", timestamp: "2026-08-10T10:00:00.000Z" });
  provider.detect({ method: "clap", timestamp: "2026-08-10T10:00:00.100Z" });
  await next();
  await runtime.stop();
  await consume;

  assert.equal(events.filter((event) => event.type === "activation.detected").length, 1);
  assert.equal(events.find((event) => event.type === "activation.suppressed")?.reason, "cooldown");
});

test("emits only a configured local wake phrase", async () => {
  const provider = new WakePhraseProvider({ id: "wake", wakePhrases: ["computer"] });
  const runtime = new ActivationRuntime({ providers: [provider], cooldownMs: 0 });
  const events: any[] = [];
  const consume = (async () => { for await (const event of runtime.events()) events.push(event); })();
  await runtime.start();
  provider.submitText("hello there", 0.9);
  provider.submitText("computer", 0.83, { deviceId: "desk-mic" });
  await next(); await runtime.stop(); await consume;
  const detected = events.filter((event) => event.type === "activation.detected");
  assert.equal(detected.length, 1);
  assert.equal(detected[0].method, "wake_phrase");
  assert.equal(detected[0].metadata.phrase, "computer");
  assert.equal(detected[0].deviceId, "desk-mic");
});

test("requires two loud claps within the configured timing window", async () => {
  const provider = new DoubleClapProvider({ id: "clap", minimumIntervalMs: 150, maximumIntervalMs: 700, amplitudeThreshold: 0.7 });
  const runtime = new ActivationRuntime({ providers: [provider], cooldownMs: 0 });
  const events: any[] = [];
  const consume = (async () => { for await (const event of runtime.events()) events.push(event); })();
  await runtime.start();
  provider.submitAmplitude(0.9, "2026-08-10T10:00:00.000Z");
  provider.submitAmplitude(0.9, "2026-08-10T10:00:00.200Z");
  provider.submitAmplitude(0.9, "2026-08-10T10:00:02.000Z");
  await next(); await runtime.stop(); await consume;
  assert.equal(events.filter((event) => event.type === "activation.detected").length, 1);
});

test("accepts machine-facing external activations with source metadata", async () => {
  const provider = new ExternalActivationProvider("external");
  const runtime = new ActivationRuntime({ providers: [provider], cooldownMs: 0 });
  const events: any[] = [];
  const consume = (async () => { for await (const event of runtime.events()) events.push(event); })();
  await runtime.start();
  provider.trigger({ sourceId: "phone", roomId: "kitchen", metadata: { action: "tap" } });
  await next(); await runtime.stop(); await consume;
  const event = events.find((value) => value.type === "activation.detected");
  assert.equal(event.method, "external"); assert.equal(event.sourceId, "phone"); assert.equal(event.metadata.action, "tap");
});
