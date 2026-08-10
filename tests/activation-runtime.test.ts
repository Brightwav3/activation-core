import assert from "node:assert/strict";
import test from "node:test";
import { EventEmitter } from "node:events";
import { ActivationRuntime, FakeActivationProvider, WakePhraseProvider, DoubleClapProvider, ExternalActivationProvider, ClapAudioBridge } from "../src/index.js";
import { WindowsClapListener } from "../src/audio/windows-clap-listener.js";

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

test("turns live PCM frame peaks into double-clap detections without persisting audio", async () => {
  const provider = new DoubleClapProvider({ id: "clap", minimumIntervalMs: 150, maximumIntervalMs: 700, amplitudeThreshold: 0.7 });
  const runtime = new ActivationRuntime({ providers: [provider], cooldownMs: 0 });
  const events: any[] = [];
  const consume = (async () => { for await (const event of runtime.events()) events.push(event); })();
  await runtime.start();
  const bridge = new ClapAudioBridge(provider, { sourceId: "windows-default-microphone", sampleRateHz: 16_000 });
  bridge.ingest(Int16Array.from([0, 30_000, 0]), "2026-08-10T10:00:00.000Z");
  bridge.ingest(Int16Array.from([0, -30_000, 0]), "2026-08-10T10:00:00.250Z");
  await next(); await runtime.stop(); await consume;
  const event = events.find((value) => value.type === "activation.detected");
  assert.equal(event.method, "clap");
  assert.equal(event.sourceId, "windows-default-microphone");
  assert.equal(event.metadata.pattern, "double_clap");
});

test("reports each in-memory PCM peak for microphone diagnostics", () => {
  const peaks: number[] = [];
  const bridge = new ClapAudioBridge(new DoubleClapProvider(), { sourceId: "test", sampleRateHz: 16_000, onPeak: (peak) => peaks.push(peak) });
  bridge.ingest(Int16Array.from([0, 16_384, 0]));
  assert.deepEqual(peaks, [0.5]);
});

test("treats repeated PCM peaks from each physical clap as two claps", async () => {
  const provider = new DoubleClapProvider();
  const runtime = new ActivationRuntime({ providers: [provider], cooldownMs: 0 });
  const events: any[] = [];
  const consume = (async () => { for await (const event of runtime.events()) events.push(event); })();
  await runtime.start();
  const bridge = new ClapAudioBridge(provider, { sourceId: "test", sampleRateHz: 16_000, refractoryMs: 120 });
  bridge.ingest(Int16Array.from([0, 11_900, 0]), "2026-08-10T10:00:00.000Z");
  bridge.ingest(Int16Array.from([0, 11_000, 0]), "2026-08-10T10:00:00.100Z");
  bridge.ingest(Int16Array.from([0, 11_500, 0]), "2026-08-10T10:00:00.300Z");
  bridge.ingest(Int16Array.from([0, 11_700, 0]), "2026-08-10T10:00:00.400Z");
  await next(); await runtime.stop(); await consume;
  assert.equal(events.filter((event) => event.type === "activation.detected").length, 1);
});

test("starts and releases a Windows PCM microphone stream", async () => {
  class TestMicrophone extends EventEmitter { stopped = false; stop() { this.stopped = true; } }
  const microphone = new TestMicrophone();
  const listener = new WindowsClapListener(new DoubleClapProvider(), { sourceId: "windows-default-microphone", microphoneFactory: async () => microphone });
  await listener.start();
  assert.equal(listener.isRunning(), true);
  await listener.stop();
  assert.equal(microphone.stopped, true);
  assert.equal(listener.isRunning(), false);
});
