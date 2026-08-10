export type ActivationMethod = "wake_phrase" | "clap" | "snap" | "button" | "external" | "future";
export type LifecycleState = "created" | "starting" | "running" | "stopping" | "stopped" | "failed";
export type HealthState = "healthy" | "degraded" | "unhealthy";

export interface Detection {
  method: ActivationMethod;
  timestamp?: string;
  confidence?: number;
  sourceId?: string;
  deviceId?: string;
  roomId?: string;
  metadata?: Record<string, unknown>;
}

export interface ActivationEvent extends Required<Pick<Detection, "method">> {
  activationId: string;
  type: "activation.detected";
  timestamp: string;
  confidence?: number;
  sourceId?: string;
  deviceId?: string;
  roomId?: string;
  metadata?: Record<string, unknown>;
}

export type RuntimeEvent =
  | ActivationEvent
  | { type: "activation.started" | "activation.stopped"; timestamp: string }
  | { type: "activation.suppressed"; timestamp: string; providerId: string; method: ActivationMethod; reason: "cooldown" | "debounce" }
  | { type: "activation.provider.started"; timestamp: string; providerId: string }
  | { type: "activation.provider.failed"; timestamp: string; providerId: string; error: ActivationError }
  | { type: "activation.error"; timestamp: string; error: ActivationError };

export interface ActivationHealth { state: HealthState; detail?: string; }
export interface ActivationCapabilities { activationMethods: ActivationMethod[]; offline: boolean; }

export interface ProviderEvent { type: "detection"; detection: Detection; }
export interface ActivationProvider {
  readonly id: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  events(): AsyncIterable<ProviderEvent>;
  health(): Promise<ActivationHealth>;
  capabilities(): Promise<ActivationCapabilities>;
}

export class ActivationError extends Error {
  constructor(public readonly code: "ACTIVATION_PROVIDER_UNAVAILABLE" | "ACTIVATION_CONFIGURATION_INVALID" | "AUDIO_INPUT_UNAVAILABLE" | "PROVIDER_START_FAILED" | "PROVIDER_RUNTIME_FAILED" | "OPERATION_CANCELLED", message: string) { super(message); this.name = "ActivationError"; }
  toJSON() { return { code: this.code, message: this.message }; }
}
