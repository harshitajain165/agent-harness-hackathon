export type SplitCircleMode = 'thinking' | 'human' | 'agent'

export const SPLIT_CIRCLE_MODE_PHASE = {
  human: 0.38,
  agent: 0.62,
} as const

export const SPLIT_CIRCLE_DEFAULTS = {
  gapWidth: 0.07,
  curvature: 0.76,
  cornerRadius: 0.075,
  warp: 'flip',
} as const

export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const
