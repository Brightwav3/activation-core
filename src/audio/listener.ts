/** Platform-neutral microphone stream shape consumed by the activation listeners. */
export type MicrophoneStream = {
  on(event: "data", listener: (chunk: Buffer) => void): unknown;
  off?: (event: "data", listener: (chunk: Buffer) => void) => unknown;
  stop(): void;
};

export interface ClapListenerOptions {
  sourceId: string;
  deviceId?: string;
  roomId?: string;
  device?: string;
  onPeak?: (peak: number) => void;
  onFrame?: (frame: Int16Array) => void;
  microphoneFactory?: () => Promise<MicrophoneStream>;
}

/**
 * The activation microphone boundary. Every platform leaf implements exactly this;
 * shared composition never names a concrete implementation.
 */
export interface ClapListener {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}
