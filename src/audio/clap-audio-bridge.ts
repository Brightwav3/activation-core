import { DoubleClapProvider } from "../providers/clap.js";

export interface ClapAudioBridgeOptions { sourceId: string; deviceId?: string; roomId?: string; sampleRateHz: number; minimumPeak?: number; refractoryMs?: number; onPeak?: (peak: number) => void; }

/** Converts in-memory signed 16-bit PCM frames to normalized peak amplitude. Never stores frames. */
export class ClapAudioBridge {
  private lastForwardedAt?: number;
  constructor(private readonly provider: DoubleClapProvider, private readonly options: ClapAudioBridgeOptions) {
    if (options.sampleRateHz <= 0 || (options.minimumPeak ?? 0.18) < 0 || (options.refractoryMs ?? 120) < 0) throw new Error("Invalid PCM clap bridge configuration.");
  }
  ingest(frame: Int16Array, timestamp = new Date().toISOString()) {
    let peak = 0; for (const sample of frame) peak = Math.max(peak, Math.abs(sample));
    const normalizedPeak = peak / 32_768;
    this.options.onPeak?.(normalizedPeak);
    const time = Date.parse(timestamp);
    if (normalizedPeak < (this.options.minimumPeak ?? 0.18) || (this.lastForwardedAt !== undefined && time - this.lastForwardedAt < (this.options.refractoryMs ?? 120))) return;
    this.lastForwardedAt = time;
    this.provider.submitAmplitude(normalizedPeak, timestamp, { sourceId: this.options.sourceId, deviceId: this.options.deviceId, roomId: this.options.roomId });
  }
}
