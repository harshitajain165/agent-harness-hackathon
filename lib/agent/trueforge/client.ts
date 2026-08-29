import { TrueForge } from "@truefoundry/trueforge-sdk";

let client: TrueForge | undefined;

/** Lazy singleton — only constructed once TRUEFORGE_BASE_URL is actually used. */
export function trueForgeClient(): TrueForge {
  if (!client) {
    const baseUrl = process.env.TRUEFORGE_BASE_URL;
    if (!baseUrl) throw new Error("TRUEFORGE_BASE_URL is not set");
    // The SDK defaults to a 60s timeout, which is far shorter than our turns.
    // A single Bright Data YouTube fetch takes ~75s, and a turn that analyses
    // several competitors runs for minutes — without this the SSE stream drops
    // mid-turn and surfaces as a network error rather than a timeout.
    client = new TrueForge({
      baseUrl,
      timeoutInSeconds: Number(process.env.TRUEFORGE_TIMEOUT_SECONDS ?? 900),
    });
  }
  return client;
}
