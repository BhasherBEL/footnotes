import type { EffortDistance, RunSummary } from '../types'
import { EFFORT_METERS } from '../types'

export type Effort = { distance: EffortDistance; seconds: number; run: RunSummary }

export function effortsFor(runs: RunSummary[], distance: EffortDistance): Effort[] {
  return runs
    .filter((run) => run.bestEfforts[distance] !== undefined)
    .map((run) => ({ distance, seconds: run.bestEfforts[distance] as number, run }))
    .sort((a, b) => a.seconds - b.seconds)
}

export function bestEffortPerDistance(runs: RunSummary[]): Effort[] {
  return (Object.keys(EFFORT_METERS) as EffortDistance[])
    .map((distance) => effortsFor(runs, distance)[0])
    .filter((effort): effort is Effort => effort !== undefined)
}
