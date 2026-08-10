import { randomUUID } from "node:crypto";
import { AsyncQueue } from "./queue.js";
import { ActivationError, type ActivationCapabilities, type ActivationEvent, type ActivationHealth, type ActivationMethod, type ActivationProvider, type Detection, type LifecycleState, type RuntimeEvent } from "./contracts.js";

export interface RuntimeOptions { providers: ActivationProvider[]; cooldownMs?: number; debounceMs?: number; now?: () => Date; }
export interface ActivationMetrics { detections: number; suppressed: number; providerFailures: number; }

export class ActivationRuntime {
  private state: LifecycleState = "created";
  private readonly output = new AsyncQueue<RuntimeEvent>();
  private readonly options: Required<Pick<RuntimeOptions, "cooldownMs" | "debounceMs">> & RuntimeOptions;
  private lastAccepted?: number;
  private lastSeen = new Map<string, number>();
  private workers: Promise<void>[] = [];
  private metric: ActivationMetrics = { detections: 0, suppressed: 0, providerFailures: 0 };

  constructor(options: RuntimeOptions) {
    if (!options.providers.length) throw new ActivationError("ACTIVATION_CONFIGURATION_INVALID", "At least one activation provider is required.");
    if ((options.cooldownMs ?? 0) < 0 || (options.debounceMs ?? 0) < 0) throw new ActivationError("ACTIVATION_CONFIGURATION_INVALID", "Cooldown and debounce must be non-negative.");
    this.options = { ...options, cooldownMs: options.cooldownMs ?? 2_000, debounceMs: options.debounceMs ?? 100 };
  }
  events(): AsyncIterable<RuntimeEvent> { return this.output; }
  lifecycle(): LifecycleState { return this.state; }
  metrics(): ActivationMetrics { return { ...this.metric }; }

  async start() {
    if (this.state === "running" || this.state === "starting") return;
    this.state = "starting";
    try {
      for (const provider of this.options.providers) { await provider.start(); this.emit({ type: "activation.provider.started", timestamp: this.timestamp(), providerId: provider.id }); this.workers.push(this.consume(provider)); }
      this.state = "running"; this.emit({ type: "activation.started", timestamp: this.timestamp() });
    } catch (cause) { this.state = "failed"; const error = this.normalize(cause, "PROVIDER_START_FAILED"); this.emit({ type: "activation.error", timestamp: this.timestamp(), error }); throw error; }
  }
  async stop() {
    if (this.state === "stopped" || this.state === "created") { this.state = "stopped"; return; }
    this.state = "stopping";
    await Promise.all(this.options.providers.map((provider) => provider.stop()));
    await Promise.allSettled(this.workers); this.workers = [];
    this.state = "stopped"; this.emit({ type: "activation.stopped", timestamp: this.timestamp() }); this.output.close();
  }
  async health(): Promise<{ state: "healthy" | "degraded" | "unhealthy"; providers: Record<string, ActivationHealth["state"]> }> {
    const entries = await Promise.all(this.options.providers.map(async (provider) => [provider.id, (await provider.health()).state] as const));
    const providers = Object.fromEntries(entries); const states = Object.values(providers);
    return { state: states.every((state) => state === "healthy") ? "healthy" : states.some((state) => state === "healthy") ? "degraded" : "unhealthy", providers };
  }
  async capabilities(): Promise<ActivationCapabilities> { const all = await Promise.all(this.options.providers.map((provider) => provider.capabilities())); return { activationMethods: [...new Set(all.flatMap((value) => value.activationMethods))], offline: all.every((value) => value.offline) }; }
  private async consume(provider: ActivationProvider) { try { for await (const event of provider.events()) if (event.type === "detection") this.accept(provider.id, event.detection); } catch (cause) { this.metric.providerFailures++; this.emit({ type: "activation.provider.failed", timestamp: this.timestamp(), providerId: provider.id, error: this.normalize(cause, "PROVIDER_RUNTIME_FAILED") }); } }
  private accept(providerId: string, detection: Detection) { const time = Date.parse(detection.timestamp ?? this.timestamp()); const priorSeen = this.lastSeen.get(providerId); const reason = this.lastAccepted !== undefined && time - this.lastAccepted < this.options.cooldownMs ? "cooldown" : priorSeen !== undefined && time - priorSeen < this.options.debounceMs ? "debounce" : undefined; this.lastSeen.set(providerId, time); if (reason) { this.metric.suppressed++; this.emit({ type: "activation.suppressed", timestamp: new Date(time).toISOString(), providerId, method: detection.method, reason }); return; } this.lastAccepted = time; this.metric.detections++; const event: ActivationEvent = { activationId: randomUUID().replaceAll("-", ""), type: "activation.detected", method: detection.method, timestamp: new Date(time).toISOString(), ...(detection.confidence === undefined ? {} : { confidence: detection.confidence }), ...(detection.sourceId ? { sourceId: detection.sourceId } : {}), ...(detection.deviceId ? { deviceId: detection.deviceId } : {}), ...(detection.roomId ? { roomId: detection.roomId } : {}), ...(detection.metadata ? { metadata: detection.metadata } : {}) }; this.emit(event); }
  private emit(event: RuntimeEvent) { this.output.push(event); }
  private timestamp() { return (this.options.now?.() ?? new Date()).toISOString(); }
  private normalize(cause: unknown, code: ActivationError["code"]) { return cause instanceof ActivationError ? cause : new ActivationError(code, cause instanceof Error ? cause.message : "Activation provider failed."); }
}
