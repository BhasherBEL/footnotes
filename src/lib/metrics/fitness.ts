import { addWeeks, startOfWeek } from '../period'
import type { RunSummary } from '../types'

const TIME_CONSTANT_DAYS = 42
const MILLISECONDS_PER_DAY = 86400000

export function runLoad(run: RunSummary): number {
  if (run.trainingLoad !== null) return run.trainingLoad
  if (run.avgHeartRate === null) return 0
  return (run.movingTime / 60) * (run.avgHeartRate / 100) ** 1.92
}

export function fitness(runs: RunSummary[], on: Date): number {
  const sorted = runs
    .filter((run) => new Date(run.startTime).getTime() <= on.getTime())
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())

  let value = 0
  let previous: Date | null = null
  for (const run of sorted) {
    const date = new Date(run.startTime)
    if (previous !== null) {
      const days = (date.getTime() - previous.getTime()) / MILLISECONDS_PER_DAY
      value *= Math.exp(-days / TIME_CONSTANT_DAYS)
    }
    value += runLoad(run)
    previous = date
  }

  if (previous !== null) {
    const days = (on.getTime() - previous.getTime()) / MILLISECONDS_PER_DAY
    value *= Math.exp(-days / TIME_CONSTANT_DAYS)
  }

  return value / TIME_CONSTANT_DAYS
}

export function fitnessSeries(runs: RunSummary[], dates: Date[]): number[] {
  const sorted = [...runs].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  )

  let value = 0
  let previous: Date | null = null
  let nextRunIndex = 0

  return dates.map((date) => {
    while (
      nextRunIndex < sorted.length &&
      new Date(sorted[nextRunIndex].startTime).getTime() <= date.getTime()
    ) {
      const run = sorted[nextRunIndex]
      const runDate = new Date(run.startTime)
      if (previous !== null) {
        const days = (runDate.getTime() - previous.getTime()) / MILLISECONDS_PER_DAY
        value *= Math.exp(-days / TIME_CONSTANT_DAYS)
      }
      value += runLoad(run)
      previous = runDate
      nextRunIndex++
    }

    if (previous === null) return 0
    const days = (date.getTime() - previous.getTime()) / MILLISECONDS_PER_DAY
    return (value * Math.exp(-days / TIME_CONSTANT_DAYS)) / TIME_CONSTANT_DAYS
  })
}

export function weekBand(
  runs: RunSummary[],
  weekStart: Date,
): { minimal: number; maximal: number } | null {
  if (runs.length === 0) return null

  const earliest = runs.reduce(
    (min, run) => Math.min(min, new Date(run.startTime).getTime()),
    Infinity,
  )
  const historyDays = (weekStart.getTime() - earliest) / MILLISECONDS_PER_DAY
  if (historyDays < 14) return null

  const earliestWeekStart = startOfWeek(new Date(earliest))

  let total = 0
  let weeksFound = 0
  for (let weekAgo = 1; weekAgo <= 4; weekAgo++) {
    const start = addWeeks(weekStart, -weekAgo)
    if (start.getTime() < earliestWeekStart.getTime()) continue
    const end = addWeeks(weekStart, -weekAgo + 1)
    total += runs
      .filter((run) => {
        const time = new Date(run.startTime).getTime()
        return time >= start.getTime() && time < end.getTime()
      })
      .reduce((sum, run) => sum + run.distance, 0)
    weeksFound++
  }

  if (weeksFound === 0) return null

  const average = total / weeksFound
  return { minimal: average * 0.8, maximal: average * 1.3 }
}
