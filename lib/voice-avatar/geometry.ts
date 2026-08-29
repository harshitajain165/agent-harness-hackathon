export type SplitCircleParams = {
  /** Ignored — paths are always a unit disk. Kept so call sites can pass size. */
  size?: number
  /** 0 = gap just above the circle, 1 = just below. */
  gapPosition: number
  /**
   * Signed curvature. Positive = bow downward (logo smile).
   * Negative = bow upward. 0 = straight cut.
   */
  curvature: number
  /** Gap thickness as a fraction of the diameter. */
  gapWidth: number
  /** Preferred corner fillet radius as a fraction of the diameter. */
  cornerRadius: number
  /**
   * `cycle` pinches the gap shut only at the wrap so the disk never parks.
   * `reset` lingers on a full circle at each pole.
   */
  loop?: LoopMode
}

export type SplitCirclePiece = {
  id: number
  d: string
}

export type SplitCirclePaths = {
  top: string
  bottom: string
}

export type TimingMode =
  | 'linear'
  | 'smooth'
  | 'easeOut'
  | 'easeInOut'
  | 'circ'
  | 'expo'
export type WarpMode = 'fixed' | 'flip'
export type LoopMode = 'cycle' | 'reset'

/**
 * Displace the gap centerline with a sine. `amount` 0 = pure arc (curvature
 * intact); 1 = full amplitude. Phase is in turns [0, 1). Corner fillets still
 * apply at the rim.
 */
export type GapWaveParams = {
  amount: number
  amplitude: number
  cycles: number
  phase: number
}

export const GAP_WAVE_DEFAULTS = {
  amount: 0,
  amplitude: 0.045,
  cycles: 2,
  phase: 0,
} as const satisfies GapWaveParams

type Vec2 = { x: number; y: number }

const TAU = Math.PI * 2
const EPS = 1e-3
const ORIGIN: Vec2 = { x: 0.5, y: 0.5 }
const RADIUS = 0.5
const TOP_POLE: Vec2 = { x: 0.5, y: 0 }
const BOTTOM_POLE: Vec2 = { x: 0.5, y: 1 }
const WAVE_SAMPLES = 28
const WAVE_EPS = 0.004
/**
 * Keep ping-pong / reset gaps off the exact poles. Hitting 0 or 1 collapses a
 * piece to a singular full-disk handoff → color swap + scale jitter.
 */
const POLE_INSET = 0.02

/** Cap: M + 5×A + Z. Band: M + 8×A + Z. */
export const CAP_SIGNATURE = 'M A A A A A Z'
export const BAND_SIGNATURE = 'M A A A A A A A A Z'

/**
 * Map clock phase → gapPosition. Duration advances phase at a constant rate;
 * this is the only remapping layer (no second easing on top).
 */
export function gapPositionFromPhase(phase: number, mode: TimingMode): number {
  const t = clamp01(phase)
  switch (mode) {
    case 'linear':
      return t
    case 'smooth':
      return 0.5 - 0.5 * Math.cos(Math.PI * t)
    case 'easeOut':
      return 1 - (1 - t) ** 3
    case 'easeInOut': {
      const x = t * t * (3 - 2 * t)
      return x
    }
    case 'circ':
      return t < 0.5
        ? 0.5 * (1 - Math.sqrt(1 - (2 * t) ** 2))
        : 0.5 * (Math.sqrt(1 - (2 * t - 2) ** 2) + 1)
    case 'expo':
      if (t === 0 || t === 1) return t
      return t < 0.5
        ? 0.5 * 2 ** (20 * t - 10)
        : 1 - 0.5 * 2 ** (10 - 20 * t)
  }
}

/**
 * Signed curvature for the gap bow.
 * - fixed: always `amount` (downward smile when positive)
 * - flip: continuous cos warp — bows toward the center, straight at the equator
 */
export function signedCurvature(
  amount: number,
  gapPosition: number,
  mode: WarpMode,
): number {
  if (mode === 'fixed') return amount
  return amount * Math.cos(Math.PI * clamp01(gapPosition))
}

export function splitCirclePaths(params: SplitCircleParams): SplitCirclePaths {
  const cut = makeCut(params)
  return {
    top: capPath(cut, 'top'),
    bottom: capPath(cut, 'bottom'),
  }
}

/**
 * Paths indexed by blob identity (not spatial slot).
 * Every entry is a closed path on a fixed command template — never empty.
 */
/**
 * How `phase` maps into the unit interval.
 * `wrap` — unbounded clocks (continuous travel); 1 ≡ 0.
 * `clamp` — closed ping-pong [0, 1]; 1 is the bottom pole (must not become 0).
 */
export type PhaseSpan = 'wrap' | 'clamp'

/** Lab layout: bunch or spread cuts; offsets nudge individual gaps (turns). */
export type GapLayoutParams = {
  /** 1 = evenly spaced cuts. Lower bunches gaps for thin slivers / goo merge. */
  gapSpread?: number
  /** Extra phase per cut (length blobs − 1). */
  gapOffsets?: readonly number[]
}

export function splitCirclePieces(
  params: Omit<SplitCircleParams, 'gapPosition' | 'curvature'> &
    GapLayoutParams & {
      phase: number
      blobs: number
      curvature: number
      warp: WarpMode
      timing: TimingMode
      loop?: LoopMode
      wave?: GapWaveParams
      phaseSpan?: PhaseSpan
    },
): string[] {
  return splitCirclePieceList(params).reduce<string[]>((paths, piece) => {
    paths[piece.id] = piece.d
    return paths
  }, Array.from({ length: Math.min(4, Math.max(2, Math.round(params.blobs))) }, () => ''))
}

export function splitCirclePieceList(
  params: Omit<SplitCircleParams, 'gapPosition' | 'curvature'> &
    GapLayoutParams & {
      phase: number
      blobs: number
      curvature: number
      warp: WarpMode
      timing: TimingMode
      loop?: LoopMode
      wave?: GapWaveParams
      phaseSpan?: PhaseSpan
    },
): SplitCirclePiece[] {
  const blobs = Math.min(4, Math.max(2, Math.round(params.blobs)))
  const loop = params.loop ?? 'cycle'
  const closed =
    params.phaseSpan === 'clamp' ||
    (params.phaseSpan == null && loop === 'reset')
  const unit = closed ? clamp01(params.phase) : wrap01(params.phase)
  const frac = gapPositionFromPhase(unit, params.timing)
  // Closed ping-pong: clock stays in [0, 1] (frac may be 1 at the bottom pole).
  const clock = closed ? frac : Math.floor(params.phase) + frac
  const wave = normalizeWave(params.wave)
  const place = (t: number) => {
    const u = closed ? clamp01(t) : wrap01(t)
    // Closed / reset travel must never sit on the geometric poles.
    return closed ? poleInset(u) : u
  }

  if (blobs === 2) {
    const cut = makeCut({
      gapPosition: place(clock),
      curvature: signedCurvature(params.curvature, place(clock), params.warp),
      gapWidth: params.gapWidth,
      cornerRadius: params.cornerRadius,
      loop,
    })
    const top = capPath(cut, 'top', 0, wave)
    const bottom = capPath(cut, 'bottom', 0, wave)
    const shift = loop === 'cycle' && !closed ? posMod(Math.floor(clock), 2) : 0
    return [
      { id: posMod(0 - shift, 2), d: top },
      { id: posMod(1 - shift, 2), d: bottom },
    ]
  }

  const spread = Math.max(0.02, params.gapSpread ?? 1)
  const offsets = params.gapOffsets ?? []
  const cuts = Array.from({ length: blobs - 1 }, (_, index) => {
    const t = cutPhase(clock, index, blobs, spread, offsets)
    const gapPosition = place(t)
    return {
      index,
      cut: makeCut({
        gapWidth: params.gapWidth,
        cornerRadius: params.cornerRadius,
        gapPosition,
        curvature: signedCurvature(
          params.curvature,
          gapPosition,
          params.warp,
        ),
        loop,
      }),
    }
  })

  return piecesFromCuts(cuts, blobs, clock, loop, wave)
}

/** Letter tokens only, so `M 0.1 0.2 A … Z` becomes `M A A … Z`. */
export function pathCommandSignature(d: string): string {
  return d
    .replace(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g, ' ')
    .replace(/[^A-Za-z]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

type Cut = {
  yMid: number
  thickness: number
  preferredF: number
  G: Vec2
  rhoTop: number
  rhoBottom: number
  /** +1 = smile down (G above the cut), -1 = smile up. */
  bow: 1 | -1
}

function makeCut({
  gapPosition,
  curvature,
  gapWidth,
  cornerRadius,
  loop: loopMode,
}: SplitCircleParams): Cut {
  const preferredF = Math.max(0, cornerRadius)
  const pos = clamp01(gapPosition)
  const yMid = ORIGIN.y - RADIUS + pos * (2 * RADIUS)

  const baseThickness = Math.max(EPS, gapWidth)
  const distToNearPole = Math.min(pos, 1 - pos) * (2 * RADIUS)
  const loop = loopMode ?? 'cycle'
  const collapseSpan =
    loop === 'reset'
      ? baseThickness * 1.25
      : Math.max(baseThickness * 0.28, RADIUS * 0.016)
  const collapseT = clamp01(distToNearPole / collapseSpan)
  // Floor thickness so a piece never becomes an empty / full-disk handoff.
  const thickness = Math.max(
    EPS,
    baseThickness * (collapseT * collapseT * (3 - 2 * collapseT)),
  )

  const absK = Math.max(Math.abs(curvature), 0.002)
  const bow: 1 | -1 = curvature >= 0 ? 1 : -1
  const rhoMid = Math.max(RADIUS / absK, RADIUS + EPS)

  return {
    yMid,
    thickness,
    preferredF,
    G: { x: ORIGIN.x, y: yMid - bow * rhoMid },
    rhoTop: Math.max(EPS, rhoMid - bow * (thickness / 2)),
    rhoBottom: Math.max(EPS, rhoMid + bow * (thickness / 2)),
    bow,
  }
}

/**
 * Spatial stack, then rotate identity backward once per wrapped gap.
 * The dying bottom cap is the same id as the new top cap; neighbors shift
 * down the stack instead of swapping the two surviving fills.
 */
function piecesFromCuts(
  cuts: { index: number; cut: Cut }[],
  blobs: number,
  clock: number,
  loop: LoopMode,
  wave: GapWaveParams,
): SplitCirclePiece[] {
  const ordered = [...cuts].sort((a, b) => a.cut.yMid - b.cut.yMid)
  const padOuter = blobs >= 3 ? 3 : 0
  const spatial: string[] = Array.from({ length: blobs }, () => '')
  spatial[0] = capPath(ordered[0].cut, 'top', padOuter, wave)
  for (let i = 0; i < ordered.length - 1; i += 1) {
    spatial[i + 1] = bandPath(ordered[i].cut, ordered[i + 1].cut, wave)
  }
  spatial[blobs - 1] = capPath(
    ordered[ordered.length - 1].cut,
    'bottom',
    padOuter,
    wave,
  )

  const wraps = loop === 'cycle' ? gapWrapCount(clock, blobs) : 0
  return spatial.map((d, slot) => ({
    id: posMod(slot - wraps, blobs),
    d,
  }))
}

/** Phase for cut `index` (0 … blobs−2). Spread < 1 bunches gaps toward the clock. */
function cutPhase(
  clock: number,
  index: number,
  blobs: number,
  spread: number,
  offsets: readonly number[],
): number {
  const spacing = spread / blobs
  return clock + index * spacing + (offsets[index] ?? 0)
}

/** How many of the n−1 gaps have crossed a pole on this unbounded clock. */
function gapWrapCount(clock: number, blobs: number): number {
  let wraps = 0
  for (let i = 0; i < blobs - 1; i += 1) {
    wraps += Math.floor(clock + i / blobs)
  }
  return wraps
}

/**
 * Corner rounding only — never half the remaining height, or the cap
 * becomes a disk and the gap stops reading as vertical travel.
 */
function filletBudget(height: number, preferredF: number, radius: number): number {
  if (preferredF < EPS || height <= 0) return 0
  const chord = 2 * Math.sqrt(Math.max(0, height * (2 * radius - height)))
  return Math.min(preferredF, height * 0.28, chord * 0.18)
}

function pieceHeight(cut: Cut, side: 'top' | 'bottom'): number {
  if (side === 'top') {
    const outerY = ORIGIN.y - RADIUS
    const innerY = gapYAtCenter(cut, 'top')
    return Math.max(0, innerY - outerY)
  }
  const innerY = gapYAtCenter(cut, 'bottom')
  const outerY = ORIGIN.y + RADIUS
  return Math.max(0, outerY - innerY)
}

function gapYAtCenter(cut: Cut, side: 'top' | 'bottom'): number {
  const rho = side === 'top' ? cut.rhoTop : cut.rhoBottom
  return cut.G.y + cut.bow * rho
}

function capPath(
  cut: Cut,
  side: 'top' | 'bottom',
  extraOuter = 0,
  wave: GapWaveParams = GAP_WAVE_DEFAULTS,
): string {
  if (wave.amount > WAVE_EPS) {
    return wavyCapPath(cut, side, wave)
  }

  const height = pieceHeight(cut, side)
  const corners =
    resolveCorners(cut, side, filletBudget(height, cut.preferredF, RADIUS)) ??
    degenerateCorners(side)

  const { left, right, F } = corners
  const filletR = Math.max(F, EPS)
  const innerR = Math.abs(side === 'top' ? cut.rhoTop : cut.rhoBottom)
  const innerCW = cut.bow > 0 ? side === 'top' : side === 'bottom'
  const pole = side === 'top' ? TOP_POLE : BOTTOM_POLE

  if (side === 'top') {
    return (
      `M ${fmt(right.outer)} ` +
      arc(right.Q, filletR, right.outer, right.inner, true) +
      arc(cut.G, innerR, right.inner, left.inner, innerCW) +
      arc(left.Q, filletR, left.inner, left.outer, true) +
      splitThrough(ORIGIN, RADIUS, left.outer, pole, right.outer, true, extraOuter) +
      'Z'
    )
  }

  return (
    `M ${fmt(left.outer)} ` +
    arc(left.Q, filletR, left.outer, left.inner, true) +
    arc(cut.G, innerR, left.inner, right.inner, innerCW) +
    arc(right.Q, filletR, right.inner, right.outer, true) +
    splitThrough(ORIGIN, RADIUS, right.outer, pole, left.outer, true, extraOuter) +
    'Z'
  )
}

function bandPath(above: Cut, below: Cut, wave: GapWaveParams = GAP_WAVE_DEFAULTS): string {
  if (wave.amount > WAVE_EPS) {
    return wavyBandPath(above, below, wave)
  }

  const top =
    resolveCorners(
      above,
      'bottom',
      filletBudget(pieceHeight(above, 'bottom'), above.preferredF, RADIUS),
    ) ?? degenerateCorners('bottom')
  const bottom =
    resolveCorners(
      below,
      'top',
      filletBudget(pieceHeight(below, 'top'), below.preferredF, RADIUS),
    ) ?? degenerateCorners('top')

  return (
    `M ${fmt(top.left.inner)} ` +
    arc(
      above.G,
      Math.abs(above.rhoBottom),
      top.left.inner,
      top.right.inner,
      above.bow > 0 ? false : true,
    ) +
    arc(top.right.Q, Math.max(top.F, EPS), top.right.inner, top.right.outer, true) +
    arc(ORIGIN, RADIUS, top.right.outer, bottom.right.outer, true) +
    arc(
      bottom.right.Q,
      Math.max(bottom.F, EPS),
      bottom.right.outer,
      bottom.right.inner,
      true,
    ) +
    arc(
      below.G,
      Math.abs(below.rhoTop),
      bottom.right.inner,
      bottom.left.inner,
      below.bow > 0 ? true : false,
    ) +
    arc(
      bottom.left.Q,
      Math.max(bottom.F, EPS),
      bottom.left.inner,
      bottom.left.outer,
      true,
    ) +
    arc(ORIGIN, RADIUS, bottom.left.outer, top.left.outer, true) +
    arc(top.left.Q, Math.max(top.F, EPS), top.left.outer, top.left.inner, true) +
    'Z'
  )
}

function normalizeWave(wave?: GapWaveParams): GapWaveParams {
  if (!wave) return { ...GAP_WAVE_DEFAULTS }
  return {
    amount: clamp01(wave.amount),
    amplitude: Math.max(0, wave.amplitude),
    cycles: Math.max(0.25, wave.cycles),
    phase: ((wave.phase % 1) + 1) % 1,
  }
}

function midRho(cut: Cut): number {
  return (Math.abs(cut.rhoTop) + Math.abs(cut.rhoBottom)) * 0.5
}

/** Arc centerline y at x (smile/straight cut). */
function arcCenterY(cut: Cut, x: number): number {
  const rho = midRho(cut)
  const dx = x - cut.G.x
  const h = rho * rho - dx * dx
  if (h <= 0) return cut.yMid
  return cut.G.y + cut.bow * Math.sqrt(h)
}

/** Soften wave near fillet ends so the rim corner joins without a kink. */
const WAVE_EDGE_SOFT = 0.1

function blendedCenterY(
  cut: Cut,
  x: number,
  x0: number,
  x1: number,
  wave: GapWaveParams,
): number {
  const yArc = arcCenterY(cut, x)
  if (wave.amount <= WAVE_EPS) return yArc
  const span = Math.max(x1 - x0, EPS)
  const u = clamp01((x - x0) / span)
  const edge =
    u < WAVE_EDGE_SOFT
      ? smooth01(u / WAVE_EDGE_SOFT)
      : u > 1 - WAVE_EDGE_SOFT
        ? smooth01((1 - u) / WAVE_EDGE_SOFT)
        : 1
  const displace =
    wave.amount *
    wave.amplitude *
    edge *
    Math.sin(TAU * (wave.cycles * u + wave.phase))
  return yArc + displace
}

function smooth01(t: number): number {
  const x = clamp01(t)
  return x * x * (3 - 2 * x)
}

function gapChordX(cut: Cut): [number, number] {
  const hits = intersectCircles(ORIGIN, RADIUS - EPS * 2, cut.G, midRho(cut))
  if (hits.length >= 2) {
    const [left, right] = orderLeftRight(hits)
    return [left.x, right.x]
  }
  const half = Math.sqrt(Math.max(0, RADIUS * RADIUS - (cut.yMid - ORIGIN.y) ** 2))
  return [ORIGIN.x - half, ORIGIN.x + half]
}

/**
 * Sample one parallel of the gap between fillet inner points (left → right).
 * Endpoints pin to `from`/`to` so fillet arcs join cleanly.
 */
function sampleGapEdgeBetween(
  cut: Cut,
  side: 'top' | 'bottom',
  wave: GapWaveParams,
  from: Vec2,
  to: Vec2,
): Vec2[] {
  const [chord0, chord1] = gapChordX(cut)
  const half = cut.thickness * 0.5
  const sign = side === 'top' ? -1 : 1
  const points: Vec2[] = []
  for (let i = 0; i <= WAVE_SAMPLES; i += 1) {
    const t = i / WAVE_SAMPLES
    const x = from.x + (to.x - from.x) * t
    const y = blendedCenterY(cut, x, chord0, chord1, wave) + sign * half
    points.push(projectIntoDisk({ x, y }, RADIUS - EPS * 2))
  }
  points[0] = from
  points[points.length - 1] = to
  return points
}

function projectIntoDisk(p: Vec2, radius: number): Vec2 {
  const dx = p.x - ORIGIN.x
  const dy = p.y - ORIGIN.y
  const d = Math.hypot(dx, dy)
  if (d <= radius) return p
  const s = radius / Math.max(d, EPS)
  return { x: ORIGIN.x + dx * s, y: ORIGIN.y + dy * s }
}

function polyline(points: Vec2[], reverse = false): string {
  if (points.length === 0) return ''
  const seq = reverse ? [...points].reverse() : points
  let d = ''
  for (let i = 1; i < seq.length; i += 1) {
    d += `L ${fmt(seq[i])} `
  }
  return d
}

function wavyCapPath(cut: Cut, side: 'top' | 'bottom', wave: GapWaveParams): string {
  const height = pieceHeight(cut, side)
  const corners =
    resolveCorners(cut, side, filletBudget(height, cut.preferredF, RADIUS)) ??
    degenerateCorners(side)
  const { left, right, F } = corners
  const filletR = Math.max(F, EPS)
  const edge = sampleGapEdgeBetween(cut, side, wave, left.inner, right.inner)
  if (edge.length < 2) {
    return capPath(cut, side, 0, GAP_WAVE_DEFAULTS)
  }
  const pole = side === 'top' ? TOP_POLE : BOTTOM_POLE

  if (side === 'top') {
    return (
      `M ${fmt(right.outer)} ` +
      arc(right.Q, filletR, right.outer, right.inner, true) +
      polyline(edge, true) +
      arc(left.Q, filletR, left.inner, left.outer, true) +
      splitThrough(ORIGIN, RADIUS, left.outer, pole, right.outer, true) +
      'Z'
    )
  }

  return (
    `M ${fmt(left.outer)} ` +
    arc(left.Q, filletR, left.outer, left.inner, true) +
    polyline(edge, false) +
    arc(right.Q, filletR, right.inner, right.outer, true) +
    splitThrough(ORIGIN, RADIUS, right.outer, pole, left.outer, true) +
    'Z'
  )
}

function wavyBandPath(above: Cut, below: Cut, wave: GapWaveParams): string {
  const top =
    resolveCorners(
      above,
      'bottom',
      filletBudget(pieceHeight(above, 'bottom'), above.preferredF, RADIUS),
    ) ?? degenerateCorners('bottom')
  const bottom =
    resolveCorners(
      below,
      'top',
      filletBudget(pieceHeight(below, 'top'), below.preferredF, RADIUS),
    ) ?? degenerateCorners('top')

  const topEdge = sampleGapEdgeBetween(
    above,
    'bottom',
    wave,
    top.left.inner,
    top.right.inner,
  )
  const bottomEdge = sampleGapEdgeBetween(
    below,
    'top',
    wave,
    bottom.left.inner,
    bottom.right.inner,
  )
  if (topEdge.length < 2 || bottomEdge.length < 2) {
    return bandPath(above, below, GAP_WAVE_DEFAULTS)
  }

  return (
    `M ${fmt(top.left.inner)} ` +
    polyline(topEdge, false) +
    arc(top.right.Q, Math.max(top.F, EPS), top.right.inner, top.right.outer, true) +
    arc(ORIGIN, RADIUS, top.right.outer, bottom.right.outer, true) +
    arc(
      bottom.right.Q,
      Math.max(bottom.F, EPS),
      bottom.right.outer,
      bottom.right.inner,
      true,
    ) +
    polyline(bottomEdge, true) +
    arc(
      bottom.left.Q,
      Math.max(bottom.F, EPS),
      bottom.left.inner,
      bottom.left.outer,
      true,
    ) +
    arc(ORIGIN, RADIUS, bottom.left.outer, top.left.outer, true) +
    arc(top.left.Q, Math.max(top.F, EPS), top.left.outer, top.left.inner, true) +
    'Z'
  )
}

type Corner = { Q: Vec2; inner: Vec2; outer: Vec2 }
type CornerPair = { left: Corner; right: Corner; F: number }

function degenerateCorners(side: 'top' | 'bottom'): CornerPair {
  const inward = side === 'top' ? 1 : -1
  const poleY = side === 'top' ? TOP_POLE.y : BOTTOM_POLE.y
  const outerY = poleY + inward * ((EPS * EPS) / (2 * RADIUS))
  const innerY = outerY + inward * EPS
  const F = EPS
  const make = (x: number): Corner => ({
    Q: { x, y: (outerY + innerY) / 2 },
    inner: { x, y: innerY },
    outer: { x, y: outerY },
  })
  return {
    F,
    left: make(ORIGIN.x - EPS),
    right: make(ORIGIN.x + EPS),
  }
}

/**
 * Largest fillet that still fits. Prefer rounded tips; only allow sharp when
 * the user sets corner radius to ~0. Otherwise collapse to an epsilon cap.
 */
function resolveCorners(
  cut: Cut,
  side: 'top' | 'bottom',
  preferredF: number,
): CornerPair | null {
  const maxF = Math.max(0, preferredF)
  if (maxF < EPS) {
    return tryCorners(cut, side, 0)
  }

  const atMax = tryCorners(cut, side, maxF)
  if (atMax) return atMax

  let lo = EPS
  let hi = maxF
  let best: CornerPair | null = null

  for (let i = 0; i < 14; i += 1) {
    const mid = (lo + hi) / 2
    const candidate = tryCorners(cut, side, mid)
    if (candidate) {
      best = candidate
      lo = mid
    } else {
      hi = mid
    }
  }

  if (!best) {
    for (let f = maxF; f >= EPS; f -= Math.max(EPS, maxF / 20)) {
      const candidate = tryCorners(cut, side, f)
      if (candidate) return candidate
    }
  }

  return best ?? tryCorners(cut, side, 0)
}

function tryCorners(
  cut: Cut,
  side: 'top' | 'bottom',
  F: number,
): CornerPair | null {
  const rho = side === 'top' ? cut.rhoTop : cut.rhoBottom
  const sameSideAsG = (side === 'top') === (cut.bow > 0)

  if (F < EPS) {
    const hits = intersectCircles(ORIGIN, RADIUS, cut.G, Math.abs(rho))
    if (hits.length < 2) return null
    const [left, right] = orderLeftRight(hits)
    if (!cornersFaceGapPoints(left, left, right, right, side)) return null
    return {
      F: 0,
      left: { Q: left, inner: left, outer: left },
      right: { Q: right, inner: right, outer: right },
    }
  }

  const qs = intersectCircles(
    ORIGIN,
    RADIUS - F,
    cut.G,
    Math.abs(rho) + (sameSideAsG ? -F : F),
  )

  if (qs.length < 2) return null
  const [leftQ, rightQ] = orderLeftRight(qs)
  const left = filletCorner(cut, leftQ, side)
  const right = filletCorner(cut, rightQ, side)
  if (!cornersFaceGapPoints(left.outer, left.inner, right.outer, right.inner, side)) {
    return null
  }
  return { F, left, right }
}

function filletCorner(cut: Cut, Q: Vec2, side: 'top' | 'bottom'): Corner {
  const outer = pointOnRay(ORIGIN, Q, RADIUS)
  const inner = pointOnRay(
    cut.G,
    Q,
    Math.abs(side === 'top' ? cut.rhoTop : cut.rhoBottom),
  )
  return { Q, inner, outer }
}

function cornersFaceGapPoints(
  leftOuter: Vec2,
  leftInner: Vec2,
  rightOuter: Vec2,
  rightInner: Vec2,
  side: 'top' | 'bottom',
): boolean {
  const dyLeft = leftInner.y - leftOuter.y
  const dyRight = rightInner.y - rightOuter.y
  if (side === 'top') return dyLeft >= -0.05 && dyRight >= -0.05
  return dyLeft <= 0.05 && dyRight <= 0.05
}

/**
 * Outer rim through `mid` (the cap pole). `extra` adds equal subdivisions so a
 * 4-blob cap can match the band's 8-arc token count.
 */
function splitThrough(
  center: Vec2,
  radius: number,
  from: Vec2,
  mid: Vec2,
  to: Vec2,
  clockwise: boolean,
  extra = 0,
): string {
  if (extra <= 0) {
    return (
      arc(center, radius, from, mid, clockwise) +
      arc(center, radius, mid, to, clockwise)
    )
  }
  const first = 1 + Math.floor(extra / 2)
  const second = 1 + extra - Math.floor(extra / 2)
  return (
    subdivideArc(center, radius, from, mid, clockwise, first) +
    subdivideArc(center, radius, mid, to, clockwise, second)
  )
}

function subdivideArc(
  center: Vec2,
  radius: number,
  from: Vec2,
  to: Vec2,
  clockwise: boolean,
  parts: number,
): string {
  const r = Math.max(Math.abs(radius), EPS)
  const a0 = Math.atan2(from.y - center.y, from.x - center.x)
  let delta = Math.atan2(to.y - center.y, to.x - center.x) - a0
  if (clockwise) {
    if (delta <= 0) delta += TAU
  } else if (delta >= 0) {
    delta -= TAU
  }
  let path = ''
  let prev = from
  for (let i = 1; i <= parts; i += 1) {
    const end =
      i === parts
        ? to
        : {
            x: center.x + r * Math.cos(a0 + (delta * i) / parts),
            y: center.y + r * Math.sin(a0 + (delta * i) / parts),
          }
    path += arc(center, r, prev, end, clockwise)
    prev = end
  }
  return path
}

function arc(
  center: Vec2,
  radius: number,
  from: Vec2,
  to: Vec2,
  clockwise: boolean,
): string {
  const r = Math.max(Math.abs(radius), EPS)
  const a0 = Math.atan2(from.y - center.y, from.x - center.x)
  let a1 = Math.atan2(to.y - center.y, to.x - center.x)
  let delta = a1 - a0
  if (clockwise) {
    if (delta <= 0) delta += TAU
  } else if (delta >= 0) {
    delta -= TAU
  }
  let end = to
  if (Math.abs(delta) < EPS) {
    delta = clockwise ? EPS : -EPS
    a1 = a0 + delta
    end = {
      x: center.x + r * Math.cos(a1),
      y: center.y + r * Math.sin(a1),
    }
  }
  const large = Math.abs(delta) > Math.PI ? 1 : 0
  const sweep = clockwise ? 1 : 0
  return `A ${fmtNum(r)} ${fmtNum(r)} 0 ${large} ${sweep} ${fmt(end)} `
}

function intersectCircles(c1: Vec2, r1: number, c2: Vec2, r2: number): Vec2[] {
  if (r1 <= 0 || r2 <= 0) return []
  const dx = c2.x - c1.x
  const dy = c2.y - c1.y
  const d = Math.hypot(dx, dy)
  if (d < 1e-8 || d > r1 + r2 + 1e-6 || d < Math.abs(r1 - r2) - 1e-6) return []
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
  const hSq = r1 * r1 - a * a
  const h = Math.sqrt(Math.max(0, hSq))
  const mx = c1.x + (a * dx) / d
  const my = c1.y + (a * dy) / d
  const px = (-dy / d) * h
  const py = (dx / d) * h
  if (h < 1e-6) return [{ x: mx, y: my }]
  return [
    { x: mx + px, y: my + py },
    { x: mx - px, y: my - py },
  ]
}

function orderLeftRight(points: Vec2[]): [Vec2, Vec2] {
  const sorted = [...points].sort((a, b) => a.x - b.x)
  return [sorted[0], sorted[sorted.length - 1]]
}

function pointOnRay(from: Vec2, through: Vec2, distance: number): Vec2 {
  const dx = through.x - from.x
  const dy = through.y - from.y
  const len = Math.hypot(dx, dy)
  if (len < 1e-8) return { x: through.x, y: through.y }
  return {
    x: from.x + (dx / len) * distance,
    y: from.y + (dy / len) * distance,
  }
}

function clamp01(value: number): number {
  if (value <= 0) return 0
  if (value >= 1) return 1
  return value
}

/** Map unit phase into (POLE_INSET, 1−POLE_INSET). */
function poleInset(pos: number): number {
  return POLE_INSET + clamp01(pos) * (1 - 2 * POLE_INSET)
}

function wrap01(value: number): number {
  return ((value % 1) + 1) % 1
}

function posMod(value: number, n: number): number {
  return ((value % n) + n) % n
}

function fmtNum(value: number): string {
  return value.toFixed(4)
}

function fmt(point: Vec2): string {
  return `${fmtNum(point.x)} ${fmtNum(point.y)}`
}

