import { splitCirclePieces } from '@/lib/voice-avatar/geometry'
import {
  advanceThinkingPhase,
  clamp01,
  easeInOutCubicBezier,
  isThinkingMode,
  MARK_GAP_FOLLOW,
  MARK_THINKING_LOOP,
  MARK_THINKING_TIMING,
  speakingHoldPhase,
  startPhaseMorph,
  stepPhaseMorph,
  thinkingGapMult,
  type MarkPhaseTween,
  wrap01,
} from '@/lib/voice-avatar/mark-motion'
import { SPLIT_CIRCLE_DEFAULTS as D, type SplitCircleMode } from '@/lib/voice-avatar/types'

const SPEAK_GAP_LERP = 0.28
const REST_GAP_FOLLOW = 10
const SPEAK_GAP_MIN = 0.4
const SPEAK_GAP_MAX = 2.3
const MORPH_LIVE_FROM = 2 / 3

export type MarkTickState = {
  phase: number
  gap: number
  mode: SplitCircleMode
  dir: 1 | -1
  tween: MarkPhaseTween | null
}

export type MarkVoiceLevels = {
  human?: number
  agent?: number
  thinkingGap?: boolean
  speaking?: boolean
}

export function createMarkTick(phase: number): MarkTickState {
  return {
    phase: wrap01(phase),
    gap: idleGapWidth(phase),
    mode: 'thinking',
    dir: 1,
    tween: null,
  }
}

export function tickMark(
  state: MarkTickState,
  now: number,
  dt: number,
  mode: SplitCircleMode,
  playing: boolean,
  voice?: MarkVoiceLevels | null,
): string[] {
  const hold = speakingHoldPhase(mode)

  if (mode !== state.mode) {
    state.mode = mode
    if (hold != null) {
      const morph = startPhaseMorph(state.phase, hold, now)
      state.tween = morph.tween
      if (morph.sign) state.dir = morph.sign
    } else {
      state.tween = null
      state.phase = wrap01(state.phase)
    }
  }

  if (playing) {
    const tween = state.tween

    if (hold == null && !tween) {
      const stepped = advanceThinkingPhase(state.phase, state.dir, dt)
      state.phase = stepped.phase
      state.dir = stepped.dir
      const target =
        voice?.thinkingGap === false
          ? idleGapWidth(state.phase)
          : D.gapWidth * thinkingGapMult(state.phase)
      state.gap +=
        (target - state.gap) * (1 - Math.exp(-dt * MARK_GAP_FOLLOW))
    } else if (tween) {
      const stepped = stepPhaseMorph(tween, now)
      state.phase = stepped.phase
      state.tween = stepped.tween
      const rest = idleGapWidth(state.phase)
      const live =
        voice?.speaking === true && hold != null
          ? liveSpeakGap(voice, mode)
          : rest
      let target = rest
      if (voice?.speaking === true && hold != null) {
        const liveBlend =
          stepped.u <= MORPH_LIVE_FROM
            ? 0
            : (stepped.u - MORPH_LIVE_FROM) / (1 - MORPH_LIVE_FROM)
        target =
          rest +
          (live - rest) * easeInOutCubicBezier(clamp01(liveBlend))
      }
      state.gap +=
        (target - state.gap) * (1 - Math.exp(-dt * MARK_GAP_FOLLOW))
    } else if (hold != null) {
      const target =
        voice?.speaking === true
          ? liveSpeakGap(voice, mode)
          : idleGapWidth(state.phase)
      const follow = voice?.speaking === true ? SPEAK_GAP_LERP : 1 - Math.exp(-dt * REST_GAP_FOLLOW)
      state.gap += (target - state.gap) * follow
    }
  } else {
    state.tween = null
    state.gap +=
      (idleGapWidth(state.phase) - state.gap) *
      (1 - Math.exp(-dt * MARK_GAP_FOLLOW))
  }

  return pieces(state.phase, state.gap)
}

export function restMark(phase: number): string[] {
  return pieces(phase, idleGapWidth(phase))
}

export function markPathsAt(phase: number, gap: number): string[] {
  return pieces(phase, gap)
}

function pieces(phase: number, gap: number): string[] {
  return splitCirclePieces({
    curvature: D.curvature,
    gapWidth: gap,
    cornerRadius: D.cornerRadius,
    phase,
    blobs: 2,
    warp: D.warp,
    timing: MARK_THINKING_TIMING,
    loop: MARK_THINKING_LOOP,
    phaseSpan: 'clamp',
  })
}

function idleGapWidth(phase: number): number {
  return D.gapWidth * thinkingGapMult(phase)
}

function speakGapMult(level: number): number {
  return SPEAK_GAP_MIN + (SPEAK_GAP_MAX - SPEAK_GAP_MIN) * level
}

function liveSpeakGap(voice: MarkVoiceLevels, mode: SplitCircleMode): number {
  const live = mode === 'agent' ? voice.agent : voice.human
  const level = live != null && Number.isFinite(live) ? clamp01(live) : 0
  return D.gapWidth * speakGapMult(level)
}

export { isThinkingMode }
