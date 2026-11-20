import type { RunSummary } from '../types'
import type { Period } from '../settings/settings.svelte'
import { addDays, addWeeks, startOfMonth, startOfWeek } from '../period'
import type { PeriodRange } from '../period'

export type Bucket = { start: Date; distance: number; runs: number }

export function bucketSize(period: Period): 'week' | 'month' {
  return period === '4w' || period === '12w' ? 'week' : 'month'
}

function weekStarts(range: PeriodRange): Date[] {
  const starts: Date[] = []
  for (let week = startOfWeek(range.start); week <= range.end; week = addWeeks(week, 1)) {
    starts.push(week)
  }
  return starts
}

function monthStarts(range: PeriodRange): Date[] {
  const starts: Date[] = []
  for (
    let month = startOfMonth(range.start);
    month <= range.end;
    month = new Date(month.getFullYear(), month.getMonth() + 1, 1)
  ) {
    starts.push(month)
  }
  return starts
}

export function distanceBuckets(
  runs: RunSummary[],
  range: PeriodRange,
  size: 'week' | 'month',
): Bucket[] {
  const starts = size === 'week' ? weekStarts(range) : monthStarts(range)
  const buckets = starts.map((start) => ({ start, distance: 0, runs: 0 }))
  for (const run of runs) {
    const date = new Date(run.startTime)
    const start = size === 'week' ? startOfWeek(date) : startOfMonth(date)
    const bucket = buckets.find((candidate) => candidate.start.getTime() === start.getTime())
    if (!bucket) continue
    bucket.distance += run.distance
    bucket.runs++
  }
  return buckets
}

export function averageBucketedDistance(buckets: Bucket[]): number {
  const first = buckets.findIndex((bucket) => bucket.runs > 0)
  if (first === -1) return 0
  return (
    buckets.slice(first).reduce((sum, bucket) => sum + bucket.distance, 0) /
    (buckets.length - first)
  )
}

export type DailyDistance = { date: Date; distance: number }

export function dailyDistances(runs: RunSummary[], range: PeriodRange): DailyDistance[] {
  const days: DailyDistance[] = []
  for (let day = new Date(range.start); day <= range.end; day = addDays(day, 1)) {
    days.push({ date: new Date(day), distance: 0 })
  }
  for (const run of runs) {
    const date = new Date(run.startTime)
    const day = days.find(
      (candidate) =>
        candidate.date.getFullYear() === date.getFullYear() &&
        candidate.date.getMonth() === date.getMonth() &&
        candidate.date.getDate() === date.getDate(),
    )
    if (day) day.distance += run.distance
  }
  return days
}
