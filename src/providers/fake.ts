import { AsyncQueue } from "../queue.js";
import type { ActivationCapabilities, ActivationHealth, ActivationMethod, ActivationProvider, Detection, ProviderEvent } from "../contracts.js";

export class FakeActivationProvider implements ActivationProvider {
  private queue = new AsyncQueue<ProviderEvent>();
  private active = false;
  constructor(public readonly id: string, private readonly methods: ActivationMethod[] = ["external"]) {}
  async start() { this.active = true; }
  async stop() { this.active = false; this.queue.close(); }
  detect(detection: Detection) { if (this.active) this.queue.push({ type: "detection", detection }); }
  events() { return this.queue; }
  async health(): Promise<ActivationHealth> { return { state: "healthy" }; }
  async capabilities(): Promise<ActivationCapabilities> { return { activationMethods: this.methods, offline: true }; }
}
