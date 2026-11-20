import { describe, expect, it } from 'vitest'
import { heatLevel, heatTop, weeksOfDays } from './consistency'
import type { DailyDistance } from './buckets'

describe('heatTop', () => {
  it('rounds the maximum distance up to the next whole unit', () => {
    const days: DailyDistance[] = [
      { date: new Date(2026, 10, 1), distance: 0 },
      { date: new Date(2026, 10, 2), distance: 23400 },
    ]
    expect(heatTop(days, 'km')).toBe(24)
  })

  it('floors at one for an empty period', () => {
    expect(heatTop([], 'km')).toBe(1)
  })

  it('floors at one when every day is a rest day', () => {
    const days: DailyDistance[] = [{ date: new Date(2026, 10, 1), distance: 0 }]
    expect(heatTop(days, 'km')).toBe(1)
  })
})

describe('heatLevel', () => {
  it('returns zero for a day with no distance', () => {
    expect(heatLevel(0, 20)).toBe(0)
  })

  it('splits the scale into quarters', () => {
    const top = 20
    expect(heatLevel(1, top)).toBe(1)
    expect(heatLevel(4.9, top)).toBe(1)
    expect(heatLevel(5, top)).toBe(2)
    expect(heatLevel(9.9, top)).toBe(2)
    expect(heatLevel(10, top)).toBe(3)
    expect(heatLevel(14.9, top)).toBe(3)
    expect(heatLevel(15, top)).toBe(4)
    expect(heatLevel(20, top)).toBe(4)
  })
})

describe('weeksOfDays', () => {
  it('cuts the days into weeks of seven', () => {
    const days: DailyDistance[] = Array.from({ length: 21 }, (_, index) => ({
      date: new Date(2026, 10, 2 + index),
      distance: 0,
    }))
    const weeks = weeksOfDays(days)
    expect(weeks).toHaveLength(3)
    expect(weeks[0].days).toHaveLength(7)
    expect(weeks[2].start.getDate()).toBe(16)
  })
})
