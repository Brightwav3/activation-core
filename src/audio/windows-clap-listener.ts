import { LocalClapListener } from "./local-clap-listener.js";
import type { ClapListenerOptions } from "./listener.js";

/**
 * @deprecated The implementation was never Windows-specific — it uses decibri's
 * host microphone binding. Use {@link LocalClapListener} instead. This alias is
 * kept so existing callers and CLIs keep compiling.
 */
export const WindowsClapListener = LocalClapListener;
/** @deprecated Use `ClapListenerOptions`. */
export type WindowsClapListenerOptions = ClapListenerOptions;
