# ADR 0001: Activation proves a configured signal occurred — never identity, never authority

- **Status:** Accepted
- **Date:** 2026-08-15
- **Decision owners:** M.A.R.K. II architecture
- **Retroactive:** records a decision already implemented behind the provider
  boundary

## Context

Activation is the first thing that happens in an interaction, which makes it a
tempting place to attach meaning it cannot support. A wake word or a clap starts a
session; the natural next thought is that it also identifies who started it, and
from there that it authorizes what follows.

It does neither. A double clap is a sound anyone in the room can make. A phrase
match proves a phrase was spoken, not who spoke it. Treating activation as identity
would make the assistant's permission boundary equal to whoever is nearest the
microphone.

The second pressure is audio retention. Detecting a clap or a phrase means
processing microphone frames, and storing them would make debugging easier and the
detectors improvable. It would also make a component whose whole job is to listen
continuously into a component that continuously records.

## Decision

**Activation proves only that a configured signal occurred.** It never establishes a
user's identity and never carries authority for a sensitive action. Anything
requiring either must obtain it elsewhere.

**No raw audio is stored or uploaded.** On Windows, `WindowsClapListener` reads the
local WASAPI-backed PCM stream and passes **in-memory frame peaks** to the
double-clap provider — never the frames themselves. Metrics are non-audio.

**`ActivationProvider` is the only ingress contract.** Providers emit normalised
detections and expose their own health and capabilities; implementation details
stay behind the boundary. The shipped providers are a deterministic test fake,
configured phrase matching, double-clap pattern recognition, and external
activation.

**Activation Core has no dependency on what it starts.** A downstream runtime may
consume `activation.detected` to open a realtime session; nothing here knows that.

## Rejected alternatives

### Treat a recognised wake phrase as identifying the speaker

Rejected. It equates the permission boundary with proximity to a microphone, and
speaker recognition is a different problem with different evidence requirements.

### Let activation carry an authority token downstream

Rejected. It moves an authorization decision to the component with the least
information, and the signal it is based on can be produced by anyone audible.

### Retain a short audio buffer for debugging and detector improvement

Rejected. A component that listens continuously must not record continuously; the
buffer is exactly the thing a user cannot verify is bounded. Frame peaks give the
detectors what they need without keeping content.

### Let Activation Core start the realtime session itself

Rejected. It would couple the ingress boundary to whatever consumes it, and there
is more than one plausible consumer.

## Consequences

### Positive

- The privacy claim is structural — there is no audio to leak.
- Providers are replaceable without any consumer noticing.
- Activation cannot become an accidental authorization path.

### Costs

- Detector improvement cannot use recorded failures; reproduction needs synthetic
  or live signals.
- Any capability requiring identity must obtain it separately, which no component
  currently provides.

## Enforced in

- `ARCHITECTURE.md`

## Explicit non-decisions

This ADR does not decide which activation providers a deployment enables, does not
define cooldown or debounce values, does not authorize speaker recognition, and
does not govern what a downstream runtime does on `activation.detected`.
