import { TrueForge } from "@truefoundry/trueforge-sdk";

let client: TrueForge | undefined;

/** Lazy singleton — only constructed once TRUEFORGE_BASE_URL is actually used. */
export function trueForgeClient(): TrueForge {
  if (!client) {
    const baseUrl = process.env.TRUEFORGE_BASE_URL;
    if (!baseUrl) throw new Error("TRUEFORGE_BASE_URL is not set");
    client = new TrueForge({ baseUrl });
  }
  return client;
}
