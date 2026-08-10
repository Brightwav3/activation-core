import { DoubleClapProvider } from "../providers/clap.js";

export interface ClapAudioBridgeOptions { sourceId: string; deviceId?: string; roomId?: string; sampleRateHz: number; }

/** Converts in-memory signed 16-bit PCM frames to normalized peak amplitude. Never stores frames. */
export class ClapAudioBridge {
  constructor(private readonly provider: DoubleClapProvider, private readonly options: ClapAudioBridgeOptions) {
    if (options.sampleRateHz <= 0) throw new Error("sampleRateHz must be positive.");
  }
  ingest(frame: Int16Array, timestamp = new Date().toISOString()) {
    let peak = 0; for (const sample of frame) peak = Math.max(peak, Math.abs(sample));
    this.provider.submitAmplitude(peak / 32_768, timestamp, { sourceId: this.options.sourceId, deviceId: this.options.deviceId, roomId: this.options.roomId });
  }
}
