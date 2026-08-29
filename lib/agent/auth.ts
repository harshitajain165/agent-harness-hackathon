import { timingSafeEqual } from "crypto";

function secretsEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function requestToken(request: Request) {
  const header = request.headers.get("x-harness-secret");
  if (header) return header;
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return "";
}

export function authorizeHarness(request: Request): Response | null {
  const secret = process.env.HARNESS_SECRET;
  const privileged = Boolean(process.env.AGENT_API_URL && process.env.AGENT_API_KEY);

  if (privileged && !secret) {
    return Response.json(
      { error: "HARNESS_SECRET is required when AGENT_API_KEY is set" },
      { status: 503 }
    );
  }

  if (!secret) return null;

  if (!secretsEqual(requestToken(request), secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
