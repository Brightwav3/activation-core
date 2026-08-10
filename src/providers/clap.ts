import { FakeActivationProvider } from "./fake.js";

export interface DoubleClapProviderOptions { id?: string; minimumIntervalMs?: number; maximumIntervalMs?: number; amplitudeThreshold?: number; confidenceThreshold?: number; }
export class DoubleClapProvider extends FakeActivationProvider {
  private firstClap?: number;
  private readonly minimumIntervalMs: number;
  private readonly maximumIntervalMs: number;
  private readonly amplitudeThreshold: number;
  constructor(options: DoubleClapProviderOptions = {}) { super(options.id ?? "double-clap", ["clap"]); this.minimumIntervalMs = options.minimumIntervalMs ?? 150; this.maximumIntervalMs = options.maximumIntervalMs ?? 700; this.amplitudeThreshold = options.amplitudeThreshold ?? 0.18; if (this.minimumIntervalMs < 0 || this.maximumIntervalMs < this.minimumIntervalMs || this.amplitudeThreshold < 0 || this.amplitudeThreshold > 1) throw new Error("Invalid double-clap configuration."); }
  submitAmplitude(amplitude: number, timestamp = new Date().toISOString(), metadata: { sourceId?: string; deviceId?: string; roomId?: string } = {}) {
    if (amplitude < this.amplitudeThreshold) return; const time = Date.parse(timestamp);
    if (this.firstClap === undefined || time - this.firstClap > this.maximumIntervalMs) { this.firstClap = time; return; }
    const interval = time - this.firstClap; this.firstClap = undefined;
    if (interval >= this.minimumIntervalMs) this.detect({ method: "clap", timestamp, confidence: amplitude, ...metadata, metadata: { pattern: "double_clap", intervalMs: interval } });
  }
}
