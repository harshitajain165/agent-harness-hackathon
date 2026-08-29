import { getAttributedStripeRevenue } from "@/lib/stripe/attributed-revenue";

export const runtime = "nodejs";

function parseIds(request: Request): string[] {
  const url = new URL(request.url);
  return url.searchParams
    .get("ids")
    ?.split(",")
    .map((id) => id.trim())
    .filter(Boolean) ?? [];
}

export async function GET(request: Request) {
  try {
    const revenue = await getAttributedStripeRevenue(parseIds(request));
    return Response.json(revenue);
  } catch {
    return Response.json(
      {
        connected: false,
        total: 0,
        payments: 0,
        subscriptions: 0,
        currency: "usd",
      },
      { status: 200 },
    );
  }
}
