# Activation Core — rules for agents

This file is loaded automatically. It carries rules, not description.
`README.md` says what this repository owns. `ARCHITECTURE.md` says how it is
shaped. [`docs/decisions/`](docs/decisions/README.md) says why — read it before
changing a boundary.

`AGENTS.md` is a byte-identical copy of this file. Change both or change neither.

Activation Core detects that a configured signal occurred. That is all it does and
all it may claim.

## Ecosystem invariants that govern this repository

None currently. When one is added to [`INVARIANTS.md`](../INVARIANTS.md) naming
this repository, quote its sentence verbatim here and in `AGENTS.md`.

## Rules in this repository

1. **Activation is never identity and never authority.** A clap is a sound anyone
   audible can make; a phrase match proves a phrase was spoken, not who spoke it.
   Do not attach a user, a permission, or a token to a detection.
   [ADR 0001](docs/decisions/0001-activation-proves-a-signal-not-a-person.md)
2. **Never store or upload raw audio.** Not for debugging, not in a bounded ring
   buffer, not "temporarily". `WindowsClapListener` passes in-memory frame **peaks**
   to the provider and never the frames.
3. **Metrics stay non-audio.**
4. **`ActivationProvider` is the only ingress contract.** Implementation details —
   WASAPI, `decibri`, pattern thresholds — stay behind it.
5. **Do not depend on what activation starts.** A downstream runtime consumes
   `activation.detected`; nothing here knows about realtime sessions.
6. **Providers are started and stopped idempotently**, and the runtime owns
   cooldown, debounce, opaque ids, and health aggregation — not the providers.
7. **No assistant name, provider name, or model id** in any contract or event.

## Before you finish

- Changed a boundary, chose between two homes for something, or rejected an
  approach a next agent would try? Write an ADR. The six triggers and the
  template are in [../docs/decisions/README.md](../docs/decisions/README.md).
- Edited this file? Copy it to `AGENTS.md` in the same change. They must stay
  byte-identical — Claude Code reads one, Codex reads the other, and a structure
  test compares them.
- Reasoning belongs in `docs/decisions/`, not in `ARCHITECTURE.md`.
