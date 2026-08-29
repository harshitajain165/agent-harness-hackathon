import { authorizeHarness } from "@/lib/agent/auth";
import { getAttributedStripeRevenue } from "@/lib/stripe/attributed-revenue";

export const runtime = "nodejs";

const MAX_IDS = 50;
const MAX_ID_LENGTH = 64;

function parseIds(request: Request): string[] {
  const url = new URL(request.url);
  return url.searchParams
    .get("ids")
    ?.split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0 && id.length <= MAX_ID_LENGTH)
    .slice(0, MAX_IDS) ?? [];
}

export async function GET(request: Request) {
  const denied = authorizeHarness(request);
  if (denied) return denied;

  try {
    const revenue = await getAttributedStripeRevenue(parseIds(request));
    return Response.json(revenue);
  } catch (error) {
    console.error("Error fetching attributed Stripe revenue:", error);
    return Response.json(
      { error: "Failed to load Stripe revenue" },
      { status: 502 },
    );
  }
}
