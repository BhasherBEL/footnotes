import type { RunSummary } from '../types'
import type { PeriodRange } from '../period'
import type { Period } from '../settings/settings.svelte'
import { addWeeks, startOfWeek } from '../period'

export type TrendPoint = { date: Date; value: number }

const fallbackHeartRates = Array.from({ length: 13 }, (_, index) => 120 + index * 5)
const minimumHeartRate = 100
const maximumHeartRate = 210
const minimumSpan = 20
const heartRateStep = 5

const windowDaysByPeriod: Record<Period, number> = {
  '4w': 14,
  '12w': 28,
  '1y': 56,
  all: 56,
}

export function trendWindowDays(period: Period): number {
  return windowDaysByPeriod[period]
}

export function speedAtHeartRate(run: RunSummary, heartRate: number): number | null {
  const fit = run.steadyHeartRateFit
  if (!fit) return null
  if (heartRate < fit.minHeartRate) return null
  if (heartRate > fit.maxHeartRate) return null
  const speed = fit.intercept + fit.slope * heartRate
  return speed > 0 ? speed * run.gradeFactor : null
}

export function efficiencyFactor(run: RunSummary): number | null {
  if (!run.avgHeartRate || run.movingTime === 0) return null
  return (((run.distance * run.gradeFactor) / run.movingTime) * 60) / run.avgHeartRate
}

export function runPoints(
  runs: RunSummary[],
  measure: 'pace' | 'efficiency',
  referenceHeartRate: number,
): TrendPoint[] {
  const points: TrendPoint[] = []
  for (const run of runs) {
    const value =
      measure === 'pace' ? speedAtHeartRate(run, referenceHeartRate) : efficiencyFactor(run)
    if (value === null) continue
    points.push({ date: new Date(run.startTime), value })
  }
  return points
}

export function weeklyTrend(
  points: TrendPoint[],
  range: PeriodRange,
  windowDays: number,
): TrendPoint[] {
  const trend: TrendPoint[] = []
  const firstWeek = startOfWeek(range.start)
  for (let week = firstWeek; week <= range.end; week = addWeeks(week, 1)) {
    const weekEnd = addWeeks(week, 1)
    const windowStart = new Date(weekEnd.getTime() - windowDays * 86400000)
    const inWindow = points.filter(
      (point) => point.date >= windowStart && point.date < weekEnd && point.date <= range.end,
    )
    if (inWindow.length === 0) continue
    const mean = inWindow.reduce((sum, point) => sum + point.value, 0) / inWindow.length
    const date = new Date(Math.min(weekEnd.getTime() - 86400000, range.end.getTime()))
    trend.push({ date, value: mean })
  }
  return trend
}

function roundDownToStep(value: number): number {
  return Math.floor(value / heartRateStep) * heartRateStep
}

function roundUpToStep(value: number): number {
  return Math.ceil(value / heartRateStep) * heartRateStep
}

function percentile(sorted: number[], fraction: number): number {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round(fraction * (sorted.length - 1))))
  return sorted[index]
}

export function referenceHeartRates(runs: RunSummary[]): number[] {
  const values = runs
    .map((run) => run.avgHeartRate)
    .filter((value): value is number => typeof value === 'number')
  if (values.length < 3) return fallbackHeartRates

  const sorted = [...values].sort((a, b) => a - b)
  let low = roundDownToStep(percentile(sorted, 0.1))
  let high = roundUpToStep(percentile(sorted, 0.9))

  while (high - low < minimumSpan) {
    low -= heartRateStep
    high += heartRateStep
  }

  low = Math.max(minimumHeartRate, low)
  high = Math.min(maximumHeartRate, high)

  const options: number[] = []
  for (let beats = low; beats <= high; beats += heartRateStep) options.push(beats)
  return options
}

export function nearestHeartRate(options: number[], wanted: number): number {
  if (options.length === 0) return wanted
  let closest = options[0]
  let closestDistance = Math.abs(options[0] - wanted)
  for (const option of options.slice(1)) {
    const distance = Math.abs(option - wanted)
    if (distance < closestDistance) {
      closest = option
      closestDistance = distance
    }
  }
  return closest
}
