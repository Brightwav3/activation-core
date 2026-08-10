import { Microphone } from "decibri";
import { ActivationError } from "../contracts.js";
import { DoubleClapProvider } from "../providers/clap.js";
import { ClapAudioBridge } from "./clap-audio-bridge.js";

type MicrophoneStream = { on(event: "data", listener: (chunk: Buffer) => void): unknown; off?: (event: "data", listener: (chunk: Buffer) => void) => unknown; stop(): void; };
export interface WindowsClapListenerOptions { sourceId: string; deviceId?: string; roomId?: string; device?: string; onPeak?: (peak: number) => void; microphoneFactory?: () => Promise<MicrophoneStream>; }

/** Windows/WASAPI PCM capture adapter. It analyses frames in memory and never records them. */
export class WindowsClapListener {
  private microphone?: MicrophoneStream;
  private bridge: ClapAudioBridge;
  private readonly onData = (chunk: Buffer) => this.bridge.ingest(new Int16Array(chunk.buffer, chunk.byteOffset, Math.floor(chunk.byteLength / Int16Array.BYTES_PER_ELEMENT)));
  constructor(provider: DoubleClapProvider, private readonly options: WindowsClapListenerOptions) { this.bridge = new ClapAudioBridge(provider, { sourceId: options.sourceId, deviceId: options.deviceId, roomId: options.roomId, sampleRateHz: 16_000, onPeak: options.onPeak }); }
  async start() {
    if (this.microphone) return;
    try {
      this.microphone = await (this.options.microphoneFactory?.() ?? Microphone.open({ sampleRate: 16_000, channels: 1, framesPerBuffer: 1_600, device: this.options.device }));
      this.microphone.on("data", this.onData);
    } catch (cause) { throw new ActivationError("AUDIO_INPUT_UNAVAILABLE", cause instanceof Error ? cause.message : "Windows microphone could not be opened."); }
  }
  async stop() { const microphone = this.microphone; if (!microphone) return; microphone.off?.("data", this.onData); microphone.stop(); this.microphone = undefined; }
  isRunning() { return this.microphone !== undefined; }
}
