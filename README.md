# Activation Core

Headless, local-first activation infrastructure for the Jarvis ecosystem. It detects configured signals and emits structured events; it does not transcribe, converse, reason, authorize, or persist raw audio.

## Quick start

```powershell
npm install
npm run verify
node dist/cli/main.js capabilities --json
node dist/cli/main.js health --json
node dist/cli/main.js test --provider=fake --json
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
