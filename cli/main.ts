#!/usr/bin/env node
import { DoubleClapProvider, ExternalActivationProvider, FakeActivationProvider, WakePhraseProvider, ActivationRuntime, WindowsClapListener } from "../src/index.js";

const args = process.argv.slice(2);
const json = args.includes("--json");
const command = args.find((value) => !value.startsWith("--")) ?? "capabilities";
const option = (name: string) => args.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const write = (value: unknown) => process.stdout.write(`${JSON.stringify(value)}\n`);
const fail = (message: string) => { write({ error: { code: "ACTIVATION_CONFIGURATION_INVALID", message } }); process.exitCode = 2; };

if (!json) fail("Use --json for machine-readable output.");
else if (command === "listen" && option("provider") === "clap") {
  const clap = new DoubleClapProvider();
  const runtime = new ActivationRuntime({ providers: [clap] });
  const listener = new WindowsClapListener(clap, { sourceId: "windows-default-microphone", device: option("device") });
  const output = (async () => { for await (const event of runtime.events()) write(event); })();
  const stop = async () => { await listener.stop(); await runtime.stop(); await output; };
  process.once("SIGINT", () => { void stop(); });
  process.once("SIGTERM", () => { void stop(); });
  try { await runtime.start(); await listener.start(); }
  catch (cause) { write({ error: cause instanceof Error && "toJSON" in cause ? (cause as any).toJSON() : { code: "AUDIO_INPUT_UNAVAILABLE", message: cause instanceof Error ? cause.message : "Microphone unavailable." } }); process.exitCode = 1; await runtime.stop(); }
} else if (command === "capabilities" || command === "health" || command === "test") {
  const providers = [new WakePhraseProvider({ wakePhrases: ["computer"] }), new DoubleClapProvider(), new ExternalActivationProvider(), new FakeActivationProvider("fake", ["external"])];
  const runtime = new ActivationRuntime({ providers, cooldownMs: 0 });
  if (command === "capabilities") write(await runtime.capabilities());
  else if (command === "health") { await runtime.start(); write(await runtime.health()); await runtime.stop(); }
  else { const output: unknown[] = []; const consume = (async () => { for await (const event of runtime.events()) output.push(event); })(); await runtime.start(); (providers[3] as FakeActivationProvider).detect({ method: "external", sourceId: "diagnostic-test" }); await new Promise((resolve) => setImmediate(resolve)); await runtime.stop(); await consume; for (const event of output) write(event); }
} else fail(`Unknown command: ${command}. Use 'listen --provider=clap --json'.`);
