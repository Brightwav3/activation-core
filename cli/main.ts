#!/usr/bin/env node
import { DoubleClapProvider, ExternalActivationProvider, FakeActivationProvider, WakePhraseProvider, ActivationRuntime } from "../src/index.js";

const json = process.argv.includes("--json");
const [command = "capabilities"] = process.argv.slice(2).filter((value) => !value.startsWith("--"));
const providers = [new WakePhraseProvider({ wakePhrases: ["computer"] }), new DoubleClapProvider(), new ExternalActivationProvider(), new FakeActivationProvider("fake", ["external"])];
const runtime = new ActivationRuntime({ providers, cooldownMs: 0 });
const write = (value: unknown) => process.stdout.write(`${JSON.stringify(value)}\n`);

if (!json) { write({ error: { code: "ACTIVATION_CONFIGURATION_INVALID", message: "Use --json for machine-readable output." } }); process.exitCode = 2; }
else if (command === "capabilities") write(await runtime.capabilities());
else if (command === "health") { await runtime.start(); write(await runtime.health()); await runtime.stop(); }
else if (command === "test" || command === "listen") {
  const output: unknown[] = []; const consume = (async () => { for await (const event of runtime.events()) output.push(event); })();
  await runtime.start(); const fake = providers[3] as FakeActivationProvider; fake.detect({ method: "external", sourceId: command === "listen" ? "diagnostic-listen" : "diagnostic-test" });
  await new Promise((resolve) => setImmediate(resolve)); await runtime.stop(); await consume;
  for (const event of output) write(event);
} else { write({ error: { code: "ACTIVATION_CONFIGURATION_INVALID", message: `Unknown command: ${command}` } }); process.exitCode = 2; }
