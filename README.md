# Activation Core

Headless, local-first activation infrastructure for the Jarvis ecosystem. It detects configured signals and emits structured events; it does not transcribe, converse, reason, authorize, or persist raw audio.

## Quick start

```powershell
npm install
npm run verify
node dist/cli/main.js capabilities --json
node dist/cli/main.js health --json
node dist/cli/main.js test --provider=fake --json
node dist/cli/main.js listen --provider=clap --json
```

## Public flow

```text
provider detection → ActivationRuntime → activation.detected → downstream consumer
```

Every authoritative event contains opaque `activationId`, ISO `timestamp`, activation method, optional confidence, and source/device/room metadata. The runtime owns cooldown and debounce; providers cannot grant authority themselves.

## Configuration

```ts
import { createRuntime } from "activation-core";
const runtime = createRuntime({
  cooldownMs: 2_000,
  providers: {
    wakePhrase: { wakePhrases: ["computer"], minimumConfidence: 0.7 },
    doubleClap: { enabled: true, minimumIntervalMs: 150, maximumIntervalMs: 700, amplitudeThreshold: 0.7 },
    external: { enabled: true }
  }
});
```

The supplied wake adapter is a local text-signal boundary designed for a real local detector to feed; it deliberately contains neither microphone capture nor cloud/model dependency. `DoubleClapProvider` accepts amplitude samples injected by an audio boundary. These separations keep hardware and audio capture outside this repository.

## Real Windows double-clap

`listen --provider=clap --json` opens the default Windows microphone through WASAPI, analyzes each 16-bit/16 kHz PCM frame in memory, and emits JSONL when two peaks meet the configured timing and amplitude rules. Stop it with `Ctrl+C`. It neither writes nor uploads audio. Use `--device=<name-or-id>` to choose a non-default input. Wake-word audio ingestion remains intentionally unimplemented.
