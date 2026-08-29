# UI sample payloads

Exactly what the Bright Data half of Nolan hands the UI. Design against these —
they are generated from the real engine and a real Bright Data capture, not
hand-written mockups, so the field names and shapes are the ones you'll get.

| File | Rendered as |
|---|---|
| `post.json` | One competitor post card. Real LinkedIn post, normalised |
| `recipe-break.json` | The scraper-broke moment. Real engine output |
| `repair-proposal.json` | The approval card: old selector → new, per field |
| `repair-applied.json` | The green state after approval |
| `insights-report.json` | The payoff panel: insights, recommendations, improved prompt |

Types live in `apps/tool-server/src/recipes/contract.ts`.

## Notes for design

- **Engagement varies wildly.** The sample post has 13 likes. Competitor posts in
  this vertical run from single digits to a few thousand. Don't design a card that
  only looks right at four digits — and `metrics.engagementRate` (per 1,000
  followers) is the fair comparison across accounts of different sizes.
- **`hook` is the first line only.** It's what shows above LinkedIn's "…see more",
  and it's the thing the insights panel has opinions about. Worth giving it
  visual weight separate from `text`.
- **X posts have `reposts`, LinkedIn doesn't.** Same card, so treat it as optional.
- **`media` can be empty.** Several competitor posts are text-only.
- **At the break, `partial` may still hold fields that extracted fine.** Showing
  what survived alongside what broke reads better than an all-or-nothing error.
- **Insights carry `evidence` URLs.** Nothing on screen should be an unsourced
  claim; the panel needs somewhere to put those links.
