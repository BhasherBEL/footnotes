import type { DailyDistance } from './buckets'
import { addDays, startOfWeek } from '../period'

const minCompleteWeeks = 3

function atMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function weekDates(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

function buildDistanceIndex(days: DailyDistance[]): Map<number, number> {
  const index = new Map<number, number>()
  for (const day of days) {
    index.set(atMidnight(day.date).getTime(), day.distance)
  }
  return index
}

function completeWeekStarts(
  index: Map<number, number>,
  days: DailyDistance[],
  weekStart: Date,
): Date[] {
  const seen = new Set<number>()
  const starts: Date[] = []
  for (const day of days) {
    const start = startOfWeek(day.date)
    if (start.getTime() >= weekStart.getTime()) continue
    if (seen.has(start.getTime())) continue
    seen.add(start.getTime())
    const hasAllDays = weekDates(start).every((date) => index.has(date.getTime()))
    if (hasAllDays) starts.push(start)
  }
  return starts
}

function computeWeekdayAverages(
  index: Map<number, number>,
  days: DailyDistance[],
  weekStart: Date,
): number[] | null {
  const starts = completeWeekStarts(index, days, weekStart)
  if (starts.length < minCompleteWeeks) return null

  const totals = new Array(7).fill(0)
  for (const start of starts) {
    weekDates(start).forEach((date, dayIndex) => {
      totals[dayIndex] += index.get(date.getTime()) ?? 0
    })
  }
  return totals.map((total) => total / starts.length)
}

export function weekdayAverages(days: DailyDistance[], weekStart: Date): number[] | null {
  return computeWeekdayAverages(buildDistanceIndex(days), days, weekStart)
}

function endOfMonth(monthStart: Date): Date {
  return new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
}

function monthDates(monthStart: Date): Date[] {
  const end = endOfMonth(monthStart)
  const dates: Date[] = []
  for (let date = monthStart; date.getTime() <= end.getTime(); date = addDays(date, 1)) {
    dates.push(date)
  }
  return dates
}

function projectPeriod(
  index: Map<number, number>,
  dates: Date[],
  averages: number[],
  todayMidnight: Date,
): number {
  let total = 0
  for (const date of dates) {
    const dayIndex = (date.getDay() + 6) % 7
    const distance = index.get(date.getTime()) ?? 0
    if (date.getTime() < todayMidnight.getTime()) {
      total += distance
    } else if (date.getTime() === todayMidnight.getTime()) {
      total += distance > 0 ? distance : averages[dayIndex]
    } else {
      total += averages[dayIndex]
    }
  }
  return total
}

export function projectedWeek(days: DailyDistance[], weekStart: Date, today: Date): number | null {
  const index = buildDistanceIndex(days)
  const averages = computeWeekdayAverages(index, days, weekStart)
  if (!averages) return null

  const todayMidnight = atMidnight(today)
  const weekEnd = addDays(weekStart, 6)
  if (
    todayMidnight.getTime() < weekStart.getTime() ||
    todayMidnight.getTime() > weekEnd.getTime()
  ) {
    return null
  }

  return projectPeriod(index, weekDates(weekStart), averages, todayMidnight)
}

export function projectedMonth(
  days: DailyDistance[],
  monthStart: Date,
  today: Date,
): number | null {
  const index = buildDistanceIndex(days)
  const averages = computeWeekdayAverages(index, days, startOfWeek(monthStart))
  if (!averages) return null

  const todayMidnight = atMidnight(today)
  const monthEnd = endOfMonth(monthStart)
  if (
    todayMidnight.getTime() < monthStart.getTime() ||
    todayMidnight.getTime() > monthEnd.getTime()
  ) {
    return null
  }

  return projectPeriod(index, monthDates(monthStart), averages, todayMidnight)
}
