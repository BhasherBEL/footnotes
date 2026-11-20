import { distanceValue } from '../format'
import type { Units } from '../types'
import type { DailyDistance } from './buckets'

export function heatTop(days: DailyDistance[], units: Units): number {
  const maxMeters = Math.max(0, ...days.map((day) => day.distance))
  return Math.max(1, Math.ceil(distanceValue(maxMeters, units)))
}

export function heatLevel(meters: number, top: number): number {
  if (meters <= 0) return 0
  if (meters >= top * 0.75) return 4
  if (meters >= top * 0.5) return 3
  if (meters >= top * 0.25) return 2
  return 1
}

export type HeatWeek = { start: Date; days: DailyDistance[] }

export function weeksOfDays(days: DailyDistance[]): HeatWeek[] {
  const weeks: HeatWeek[] = []
  for (let index = 0; index < days.length; index += 7) {
    const slice = days.slice(index, index + 7)
    if (slice.length === 0) continue
    weeks.push({ start: slice[0].date, days: slice })
  }
  return weeks
}
