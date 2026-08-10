import { FakeActivationProvider } from "./fake.js";

export interface WakePhraseProviderOptions { id?: string; wakePhrases: string[]; minimumConfidence?: number; }
export class WakePhraseProvider extends FakeActivationProvider {
  private readonly phrases: string[];
  private readonly minimumConfidence: number;
  constructor(options: WakePhraseProviderOptions) {
    const phrases = options.wakePhrases.map((phrase) => phrase.trim().toLocaleLowerCase()).filter(Boolean);
    if (!phrases.length) throw new Error("At least one wake phrase is required.");
    super(options.id ?? "wake-phrase", ["wake_phrase"]); this.phrases = phrases; this.minimumConfidence = options.minimumConfidence ?? 0;
  }
  submitText(text: string, confidence?: number, metadata: { sourceId?: string; deviceId?: string; roomId?: string } = {}) {
    const normalized = text.trim().toLocaleLowerCase(); const phrase = this.phrases.find((value) => value === normalized);
    if (phrase && (confidence ?? 1) >= this.minimumConfidence) this.detect({ method: "wake_phrase", confidence, ...metadata, metadata: { phrase } });
  }
}
