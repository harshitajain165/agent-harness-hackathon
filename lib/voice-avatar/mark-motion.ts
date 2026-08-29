import { gapPositionFromPhase } from '@/lib/voice-avatar/geometry'
import { EASE_IN_OUT, SPLIT_CIRCLE_MODE_PHASE, type SplitCircleMode } from '@/lib/voice-avatar/types'

export const MARK_THINKING_PERIOD = 1.2
export const MARK_THINKING_SPEED_MEAN = 0.45 + 2 / Math.PI
export const MARK_THINKING_TIMING = 'smooth' as const
export const MARK_THINKING_LOOP = 'reset' as const
export const MARK_GAP_FOLLOW = 14
export const MARK_MORPH_MIN = 0.55
export const MARK_MORPH_MAX = 0.85
export const MARK_GAP_MULT_MIN = 0.5
export const MARK_GAP_MULT_MAX = 0.9

export type MarkPhaseTween = {
  from: number
  to: number
  start: number
  duration: number
}

export function isThinkingMode(mode: SplitCircleMode): boolean {
  return mode === 'thinking'
}

export function speakingHoldPhase(mode: SplitCircleMode): number | null {
  if (mode === 'human' || mode === 'agent') return SPLIT_CIRCLE_MODE_PHASE[mode]
  return null
}

export function thinkingGapMult(phase: number): number {
  const gapPosition = gapPositionFromPhase(clamp01(phase), MARK_THINKING_TIMING)
  return (
    MARK_GAP_MULT_MIN +
    (MARK_GAP_MULT_MAX - MARK_GAP_MULT_MIN) * Math.sin(Math.PI * gapPosition)
  )
}

export function advanceThinkingPhase(
  phase: number,
  dir: 1 | -1,
  dt: number,
): { phase: number; dir: 1 | -1 } {
  let nextPhase = clamp01(phase)
  let nextDirection = dir
  const speed =
    (0.45 + Math.sin(Math.PI * nextPhase)) / MARK_THINKING_SPEED_MEAN
  nextPhase += nextDirection * (dt / MARK_THINKING_PERIOD) * speed

  if (nextPhase >= 1) {
    nextPhase = Math.max(0, Math.min(1, 2 - nextPhase))
    nextDirection = -1
  } else if (nextPhase <= 0) {
    nextPhase = Math.max(0, Math.min(1, -nextPhase))
    nextDirection = 1
  }

  return { phase: nextPhase, dir: nextDirection }
}

export function startPhaseMorph(
  from: number,
  hold: number,
  now: number,
): { tween: MarkPhaseTween | null; sign: 1 | -1 | null } {
  const delta = shortestDelta(from, hold)
  if (Math.abs(delta) < 0.004) return { tween: null, sign: null }
  const span = Math.abs(delta) * 2
  const duration =
    (MARK_MORPH_MIN + (MARK_MORPH_MAX - MARK_MORPH_MIN) * span) * 1000
  return {
    tween: { from, to: from + delta, start: now, duration },
    sign: delta < 0 ? -1 : 1,
  }
}

export function stepPhaseMorph(
  tween: MarkPhaseTween,
  now: number,
): { phase: number; tween: MarkPhaseTween | null; u: number } {
  const u = Math.min(1, (now - tween.start) / Math.max(tween.duration, 1))
  const eased = easeInOutCubicBezier(u)
  if (u >= 1) return { phase: tween.to, tween: null, u: 1 }
  return {
    phase: tween.from + (tween.to - tween.from) * eased,
    tween,
    u,
  }
}

export function wrap01(value: number): number {
  return ((value % 1) + 1) % 1
}

export function clamp01(value: number): number {
  if (value <= 0) return 0
  if (value >= 1) return 1
  return value
}

function shortestDelta(from: number, to: number): number {
  let delta = wrap01(to) - wrap01(from)
  if (delta > 0.5) delta -= 1
  if (delta < -0.5) delta += 1
  return delta
}

export function easeInOutCubicBezier(x: number): number {
  const [x1, y1, x2, y2] = EASE_IN_OUT
  let t = x
  for (let index = 0; index < 8; index += 1) {
    const current = cubic(t, x1, x2) - x
    const derivative = cubicDerivative(t, x1, x2)
    if (Math.abs(current) < 1e-6) break
    t -= current / Math.max(derivative, 1e-6)
  }
  return cubic(t, y1, y2)
}

function cubic(t: number, p1: number, p2: number): number {
  const inverse = 1 - t
  return (
    3 * inverse * inverse * t * p1 +
    3 * inverse * t * t * p2 +
    t * t * t
  )
}

function cubicDerivative(t: number, p1: number, p2: number): number {
  return (
    3 * (1 - t) * (1 - t) * p1 +
    6 * (1 - t) * t * (p2 - p1) +
    3 * t * t * (1 - p2)
  )
}
