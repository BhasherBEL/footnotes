import type { RunSummary } from './types'
import type { Period } from './settings/settings.svelte'

export type PeriodRange = { start: Date; end: Date; latest: Date | null; windowStart: Date }

export function startOfWeek(date: Date): Date {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return monday
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addDays(date: Date, days: number): Date {
  const moved = new Date(date)
  moved.setDate(moved.getDate() + days)
  return moved
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7)
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

const weeksOf: Record<Exclude<Period, 'all'>, number> = { '4w': 4, '12w': 12, '1y': 52 }

export function periodRange(runs: RunSummary[], period: Period): PeriodRange {
  if (runs.length === 0) {
    const thisWeek = startOfWeek(new Date())
    return {
      start: thisWeek,
      end: endOfDay(addDays(thisWeek, 6)),
      latest: null,
      windowStart: thisWeek,
    }
  }

  const latest = new Date(runs[runs.length - 1].startTime)
  const first = new Date(runs[0].startTime)
  const lastWeek = startOfWeek(latest)
  const periodStart =
    period === 'all' ? startOfWeek(first) : addWeeks(lastWeek, 1 - weeksOf[period])
  const firstWeek = startOfWeek(first)
  const start = periodStart < firstWeek ? firstWeek : periodStart
  return { start, end: endOfDay(addDays(lastWeek, 6)), latest, windowStart: periodStart }
}

export function runsInRange(runs: RunSummary[], range: PeriodRange): RunSummary[] {
  return runs.filter((run) => {
    const time = new Date(run.startTime).getTime()
    return time >= range.start.getTime() && time <= range.end.getTime()
  })
}

export function weekCount(range: PeriodRange): number {
  const days = (range.end.getTime() - range.start.getTime()) / 86400000
  return Math.max(1, Math.round((days + 1) / 7))
}
