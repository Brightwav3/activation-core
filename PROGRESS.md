# Progress

## State

COMPLETE — Activation Core v0.1; maintenance only.

## Completed

- Provider-neutral contract, lifecycle, structured errors/events, health, capabilities, metrics.
- Runtime-owned stable IDs, cooldown, debounce, and suppression.
- Local configured phrase, double-clap, external, and fake providers.
- JSON/JSONL diagnostic CLI.
- Windows/WASAPI double-clap listener backed by local `decibri` PCM capture.
- Verified on real hardware on 2026-08-12 through Assistant Runtime: double-clap activation fired on every attempt, with no observed loss of detection.

## Verification

- `npm run verify` — PASS: TypeScript typecheck, 9/9 tests, production build.
- `node dist/cli/main.js capabilities --json` — PASS: wake phrase, clap, external; offline.
- `node dist/cli/main.js health --json` — PASS: all four diagnostic providers healthy.
- `node dist/cli/main.js test --provider=fake --json` — PASS: JSONL lifecycle and authoritative external activation event.
- Identity scan — PASS: only allowed branding/documentation references contain the ecosystem name.
- Hygiene scan — PASS: `node_modules/` and `dist/` are ignored; no secrets/config files are tracked.
- `decibri.inputDevices()` — PASS: six Windows audio inputs detected, including the default microphone.
- PCM clap regression — PASS: a `0.18` default threshold plus a 120ms refractory window turns repeated 100ms PCM frames from two physical claps into exactly one activation.
- Physical Windows microphone test — PASS: default microphone emitted real `activation.detected` double-clap events with 300–400ms intervals; cooldown correctly suppressed duplicate activations.

## Next

Stop feature work. Wake-word remains an explicit future local-model integration.
