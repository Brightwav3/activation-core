# Architecture

`ActivationProvider` is the only ingress contract. Providers emit normalized detections and expose their health/capabilities. `ActivationRuntime` starts/stops providers idempotently, fans out typed events, assigns opaque IDs, applies generic cooldown/debounce, aggregates health/capabilities, and records non-audio metrics.

The shipped providers are deterministic test/fake, configured phrase matching, double-clap pattern recognition, and external activation. On Windows, `WindowsClapListener` uses the local WASAPI-backed `decibri` PCM stream and passes in-memory frame peaks to the double-clap provider; it never records those frames. All keep implementation details behind the provider boundary. A downstream runtime may consume `activation.detected` to start a realtime session, but Activation Core has no dependency on that runtime.

Privacy boundary: no raw audio is stored or uploaded. Activation proves only a configured signal occurred, never a user's identity or authority for sensitive actions.
