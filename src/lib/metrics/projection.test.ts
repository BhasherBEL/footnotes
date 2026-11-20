import { describe, expect, it } from 'vitest'
import { projectedMonth, projectedWeek, weekdayAverages } from './projection'
import type { DailyDistance } from './buckets'

function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

function patternDistance(index: number): number {
  if (index === 0 || index === 2 || index === 4) return 5000
  if (index === 6) return 10000
  return 0
}

function buildWeeks(
  firstMonday: Date,
  weekCount: number,
  overrides: Map<number, number>,
): DailyDistance[] {
  const days: DailyDistance[] = []
  for (let offset = 0; offset < weekCount * 7; offset++) {
    const date = new Date(firstMonday)
    date.setDate(date.getDate() + offset)
    const index = weekdayIndex(date)
    const distance = overrides.has(offset) ? overrides.get(offset)! : patternDistance(index)
    days.push({ date, distance })
  }
  return days
}

const firstMonday = new Date(2026, 9, 19)
const currentWeekStart = new Date(2026, 10, 16)

describe('weekdayAverages', () => {
  it('returns null with fewer than three complete weeks', () => {
    const days = buildWeeks(firstMonday, 2, new Map())
    expect(weekdayAverages(days, new Date(2026, 10, 2))).toBeNull()
  })

  it('averages the tidy pattern over four complete weeks', () => {
    const days = buildWeeks(firstMonday, 4, new Map())
    const averages = weekdayAverages(days, currentWeekStart)
    expect(averages).toEqual([5000, 0, 5000, 0, 5000, 0, 10000])
  })
})

describe('projectedWeek', () => {
  it('projects the tidy pattern total mid-week', () => {
    const overrides = new Map([
      [28, 5000],
      [29, 0],
      [30, 0],
    ])
    const days = buildWeeks(firstMonday, 5, overrides)
    const today = new Date(2026, 10, 18)
    expect(projectedWeek(days, currentWeekStart, today)).toBe(25000)
  })

  it('counts only the actual distance when today already has a run', () => {
    const overrides = new Map([[34, 3000]])
    const days = buildWeeks(firstMonday, 5, overrides)
    const today = new Date(2026, 10, 22)
    expect(projectedWeek(days, currentWeekStart, today)).toBe(18000)
  })

  it('counts the weekday average when today has no run', () => {
    const overrides = new Map([[34, 0]])
    const days = buildWeeks(firstMonday, 5, overrides)
    const today = new Date(2026, 10, 22)
    expect(projectedWeek(days, currentWeekStart, today)).toBe(25000)
  })

  it('returns null when today is outside the week', () => {
    const days = buildWeeks(firstMonday, 5, new Map())
    const today = new Date(2026, 10, 23)
    expect(projectedWeek(days, currentWeekStart, today)).toBeNull()
  })

  it('never projects below the distance already recorded', () => {
    const overrides = new Map([
      [28, 50000],
      [29, 20000],
      [30, 30000],
    ])
    const days = buildWeeks(firstMonday, 5, overrides)
    const today = new Date(2026, 10, 18)
    const recordedSoFar = 50000 + 20000 + 30000
    const projected = projectedWeek(days, currentWeekStart, today)
    expect(projected).toBe(115000)
    expect(projected).not.toBeNull()
    expect(projected!).toBeGreaterThanOrEqual(recordedSoFar)
  })
})

describe('projectedMonth', () => {
  const monthStart = new Date(2026, 11, 1)

  it('projects the tidy pattern total mid-month', () => {
    const days = buildWeeks(firstMonday, 8, new Map())
    const today = new Date(2026, 11, 10)
    expect(projectedMonth(days, monthStart, today)).toBe(105000)
  })

  it('excludes the week straddling the start of the month from the averages', () => {
    const overrides = new Map([
      [44, 0],
      [45, 0],
      [46, 0],
      [47, 0],
      [48, 0],
    ])
    const days = buildWeeks(firstMonday, 8, overrides)
    const today = new Date(2026, 11, 2)
    expect(projectedMonth(days, monthStart, today)).toBe(105000)
  })

  it('returns null when today is outside the month', () => {
    const days = buildWeeks(firstMonday, 8, new Map())
    const today = new Date(2026, 10, 30)
    expect(projectedMonth(days, monthStart, today)).toBeNull()
  })

  it('returns null with fewer than three complete weeks before the month', () => {
    const days = buildWeeks(firstMonday, 3, new Map())
    const today = new Date(2026, 10, 15)
    expect(projectedMonth(days, new Date(2026, 10, 2), today)).toBeNull()
  })
})
