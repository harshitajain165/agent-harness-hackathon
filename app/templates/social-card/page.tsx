import { SmallestLogo } from "@/components/brand/smallest-logo";

export const dynamic = "force-dynamic";

/**
 * Internal-only template, not linked anywhere in the app nav: create-image-post.ts
 * screenshots this page (via Playwright, ?headline=&highlight=&eyebrow=) instead of the
 * real target site. Reuses the app's own Aeonik Pro font (app/layout.tsx) and logo
 * (components/brand/smallest-logo.tsx) so the card is real, on-brand HTML/CSS rendering —
 * no ffmpeg drawtext needed (this build has no font/text-overlay support anyway).
 *
 * Colors here are a visual approximation of provided reference art, not sourced from an
 * official brand style guide — adjust ACCENT/background if the real brand spec differs.
 */

const ACCENT = "#DD7A3C";

// app/api/mcp/route.ts caps headline at 90 chars, but a fixed 68px font that never adapts
// would still leave a long headline visually cramped (or, before that cap existed, silently
// clipped by the card's hidden overflow) — scale down for longer text instead.
function headlineFontSize(length: number) {
  if (length <= 30) return 68;
  if (length <= 50) return 58;
  if (length <= 70) return 48;
  return 40;
}

function splitHeadline(headline: string, highlight?: string) {
  if (!highlight) return [{ text: headline, accent: false }];
  const index = headline.indexOf(highlight);
  if (index === -1) return [{ text: headline, accent: false }];
  const before = headline.slice(0, index);
  const after = headline.slice(index + highlight.length);
  return [
    { text: before, accent: false },
    { text: highlight, accent: true },
    { text: after, accent: false },
  ].filter((part) => part.text.length > 0);
}

export default async function SocialCardPage({
  searchParams,
}: {
  searchParams: Promise<{ headline?: string; highlight?: string; eyebrow?: string }>;
}) {
  const { headline = "", highlight, eyebrow } = await searchParams;
  const parts = splitHeadline(headline, highlight);

  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "relative",
          width: 1032,
          height: 1032,
          borderRadius: 40,
          overflow: "hidden",
          background: "radial-gradient(120% 90% at 20% 15%, #FDF3EC 0%, #FCE9DC 55%, #FADFCC 100%)",
        }}
      >
        {/* Decorative background arcs — approximate, not a sourced brand asset. */}
        <svg
          viewBox="0 0 1032 1032"
          width={1032}
          height={1032}
          style={{ position: "absolute", inset: 0 }}
        >
          <g fill="none" stroke={ACCENT} strokeOpacity={0.35} strokeWidth={2}>
            <path d="M -100 260 C 220 60, 520 60, 620 260 S 900 520 1160 380" />
            <path d="M -100 340 C 180 180, 480 180, 600 340 S 860 560 1160 460" />
            <path d="M -100 760 C 260 900, 560 940, 700 760 S 900 560 1160 700" />
            <path d="M -100 840 C 220 960, 500 1000, 640 860 S 880 660 1160 780" />
          </g>
        </svg>

        <div
          style={{
            position: "relative",
            display: "flex",
            height: "100%",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 96px",
            textAlign: "center",
            fontFamily: "var(--font-aeonik-pro), sans-serif",
          }}
        >
          {eyebrow ? (
            <div
              style={{
                fontSize: 22,
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: ACCENT,
                marginBottom: 20,
              }}
            >
              {eyebrow}
            </div>
          ) : null}

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 44 }}>
            <SmallestLogo style={{ width: 30, height: 34, color: "#161311" }} />
            <span style={{ fontSize: 26, fontWeight: 500, color: "#161311" }}>smallest.ai</span>
          </div>

          <div
            style={{
              fontSize: headlineFontSize(headline.length),
              fontWeight: 500,
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
              color: "#161311",
              maxWidth: 820,
              overflowWrap: "break-word",
              wordBreak: "break-word",
            }}
          >
            {parts.map((part, i) =>
              part.accent ? (
                <span key={i} style={{ color: ACCENT }}>
                  {part.text}
                </span>
              ) : (
                <span key={i}>{part.text}</span>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
