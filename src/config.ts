import { ActivationError, type ActivationProvider } from "./contracts.js";
import { ActivationRuntime } from "./runtime.js";
import { WakePhraseProvider } from "./providers/wake.js";
import { DoubleClapProvider } from "./providers/clap.js";
import { ExternalActivationProvider } from "./providers/external.js";

export interface ActivationConfig { cooldownMs?: number; debounceMs?: number; providers: { wakePhrase?: { enabled?: boolean; wakePhrases: string[]; minimumConfidence?: number }; doubleClap?: { enabled?: boolean; minimumIntervalMs?: number; maximumIntervalMs?: number; amplitudeThreshold?: number }; external?: { enabled?: boolean } }; }
export function createRuntime(config: ActivationConfig): ActivationRuntime {
  if (!config || !config.providers) throw new ActivationError("ACTIVATION_CONFIGURATION_INVALID", "Configuration must contain providers.");
  const providers: ActivationProvider[] = [];
  const wake = config.providers.wakePhrase; if (wake?.enabled !== false) { if (!wake?.wakePhrases) throw new ActivationError("ACTIVATION_CONFIGURATION_INVALID", "wakePhrase.wakePhrases is required when wake phrase is enabled."); providers.push(new WakePhraseProvider({ wakePhrases: wake.wakePhrases, minimumConfidence: wake.minimumConfidence })); }
  const clap = config.providers.doubleClap; if (clap?.enabled) providers.push(new DoubleClapProvider(clap));
  if (config.providers.external?.enabled) providers.push(new ExternalActivationProvider());
  return new ActivationRuntime({ providers, cooldownMs: config.cooldownMs, debounceMs: config.debounceMs });
}
