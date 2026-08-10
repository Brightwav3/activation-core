# Activation Core — WORKPLAN

## Goal

Build a small, headless, agent-first activation subsystem. It turns configured local or external signals into one canonical `activation.detected` event. It is a standalone repository in the Jarvis root and integrates only through public contracts.

## Scope

Provider contracts; lifecycle; wake phrase, double-clap, and external activation; confidence, cooldown, debounce, metadata; health, capabilities, metrics, configuration, JSON CLI, deterministic tests.

## Non-goals

No STT, TTS, conversation logic, model/AI SDK, memory, device networking, room-routing decisions, GUI, raw-audio persistence, or authorization.

## Contract

`ActivationProvider` supports `start`, `stop`, `events`, `health`, and `capabilities`. `ActivationRuntime` emits canonical lifecycle, detected, suppressed, provider-failure, and error events. Each activation has an opaque stable `activationId`; supported methods include `wake_phrase`, `clap`, and `external`.

## Architecture

Providers own one signal class and yield normalized detections. The runtime owns lifecycle, filtering, ID creation, event ordering, health, capability aggregation, and metrics. Consumers receive an async event stream or use the CLI's JSON/JSONL output. Audio implementations are injection-based local adapters, so the normal test suite never requires hardware.

## Definition of Done

Headless provider-independent runtime; deterministic fake provider; lifecycle, errors, cooldown, debounce, metadata, health, capabilities, metrics; configured local wake phrase; verified double clap; external trigger; JSON CLI; generic consumer demonstration; no name/cloud/model/audio-storage dependency; tests, build, hygiene, and documentation audit pass.

## Stop condition

After all Definition-of-Done criteria are verified, mark v0.1 complete and stop; downstream conversation, model, and device work belongs elsewhere.
