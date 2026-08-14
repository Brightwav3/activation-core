import { Microphone } from "decibri";
import { ActivationError } from "../contracts.js";
import { DoubleClapProvider } from "../providers/clap.js";
import { ClapAudioBridge } from "./clap-audio-bridge.js";
import type { ClapListener, ClapListenerOptions, MicrophoneStream } from "./listener.js";

/**
 * Local PCM capture adapter built on decibri's host microphone binding.
 * It analyses frames in memory and never records them. The decibri binding
 * advertises win32/darwin/linux; only win32 is hardware-verified here.
 */
export class LocalClapListener implements ClapListener {
  private microphone?: MicrophoneStream;
  private bridge: ClapAudioBridge;
  private readonly onData = (chunk: Buffer) => { const frame = new Int16Array(chunk.buffer, chunk.byteOffset, Math.floor(chunk.byteLength / Int16Array.BYTES_PER_ELEMENT)); this.options.onFrame?.(frame); this.bridge.ingest(frame); };
  constructor(provider: DoubleClapProvider, private readonly options: ClapListenerOptions) { this.bridge = new ClapAudioBridge(provider, { sourceId: options.sourceId, deviceId: options.deviceId, roomId: options.roomId, sampleRateHz: 16_000, onPeak: options.onPeak }); }
  async start() {
    if (this.microphone) return;
    try {
      this.microphone = await (this.options.microphoneFactory?.() ?? Microphone.open({ sampleRate: 16_000, channels: 1, framesPerBuffer: 1_600, device: this.options.device }));
      this.microphone.on("data", this.onData);
    } catch (cause) { throw new ActivationError("AUDIO_INPUT_UNAVAILABLE", cause instanceof Error ? cause.message : "The host microphone could not be opened."); }
  }
  async stop() { const microphone = this.microphone; if (!microphone) return; microphone.off?.("data", this.onData); microphone.stop(); this.microphone = undefined; }
  isRunning() { return this.microphone !== undefined; }
}
