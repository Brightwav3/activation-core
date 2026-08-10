import { FakeActivationProvider } from "./fake.js";
import type { Detection } from "../contracts.js";

export class ExternalActivationProvider extends FakeActivationProvider {
  constructor(id = "external") { super(id, ["external"]); }
  trigger(request: Omit<Detection, "method"> = {}) { this.detect({ method: "external", ...request }); }
}
