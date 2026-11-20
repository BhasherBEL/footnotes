import { describe, expect, it } from 'vitest'
import { addWeeks, periodRange, runsInRange, startOfWeek, weekCount } from './period'
import { bucketSize, distanceBuckets } from './metrics/buckets'
import type { RunSummary } from './types'

function run(startTime: string, distance = 10000): RunSummary {
  return {
    id: startTime,
    startTime,
    sport: 'running',
    subSport: 'generic',
    name: 'run',
    distance,
    movingTime: 3600,
    elapsedTime: 3600,
    ascent: 0,
    avgHeartRate: null,
    maxHeartRate: null,
    heartRateSeconds: {},
    bestEfforts: {},
    steadyHeartRateFit: null,
    splitTrack: [],
    route: [],
    lapBoundaries: [],
    startLatitude: null,
    startLongitude: null,
    deviceProfile: {},
    steps: null,
    trainingLoad: null,
    gradeFactor: 1,
  }
}

const runs = [
  run('2026-09-05T09:00:00'),
  run('2026-10-20T09:00:00'),
  run('2026-11-15T09:00:00', 18400),
  run('2026-11-17T09:00:00', 5200),
]

describe('startOfWeek', () => {
  it('returns the Monday of the week', () => {
    expect(startOfWeek(new Date('2026-11-15T09:00:00')).toDateString()).toBe(
      new Date('2026-11-09T00:00:00').toDateString(),
    )
    expect(startOfWeek(new Date('2026-11-16T09:00:00')).toDateString()).toBe(
      new Date('2026-11-16T00:00:00').toDateString(),
    )
  })
})

describe('periodRange', () => {
  it('ends with the week of the most recent run, not today', () => {
    const range = periodRange(runs, '12w')
    expect(range.start.toDateString()).toBe(new Date('2026-08-31T00:00:00').toDateString())
    expect(range.end.toDateString()).toBe(new Date('2026-11-22T00:00:00').toDateString())
    expect(weekCount(range)).toBe(12)
  })

  it('covers four weeks', () => {
    const range = periodRange(runs, '4w')
    expect(range.start.toDateString()).toBe(new Date('2026-10-26T00:00:00').toDateString())
    expect(weekCount(range)).toBe(4)
  })

  it('goes back to the first run for all time', () => {
    const range = periodRange(runs, 'all')
    expect(range.start.toDateString()).toBe(new Date('2026-08-31T00:00:00').toDateString())
  })

  it('clamps a year to the same range as all time when the history is shorter', () => {
    const shortRuns = [run('2026-10-01T09:00:00'), run('2026-11-12T09:00:00')]
    const yearRange = periodRange(shortRuns, '1y')
    const allRange = periodRange(shortRuns, 'all')
    expect(yearRange.start.toDateString()).toBe(allRange.start.toDateString())
    expect(yearRange.end.toDateString()).toBe(allRange.end.toDateString())
  })

  it('still covers fifty-two weeks when the history spans two years', () => {
    const longRuns = [run('2024-11-10T09:00:00'), run('2026-11-15T09:00:00')]
    expect(weekCount(periodRange(longRuns, '1y'))).toBe(52)
  })

  it('clamps four weeks to the first run when the history is only two weeks', () => {
    const shortRuns = [run('2026-11-03T09:00:00'), run('2026-11-15T09:00:00')]
    const range = periodRange(shortRuns, '4w')
    expect(range.start.toDateString()).toBe(
      startOfWeek(new Date('2026-11-03T09:00:00')).toDateString(),
    )
    expect(weekCount(range)).toBe(2)
  })

  it('keeps the unclamped window start for a year over a six-week history', () => {
    const shortRuns = [run('2026-10-01T09:00:00'), run('2026-11-12T09:00:00')]
    const range = periodRange(shortRuns, '1y')
    const lastWeek = startOfWeek(new Date('2026-11-12T09:00:00'))
    expect(range.windowStart.toDateString()).toBe(addWeeks(lastWeek, -51).toDateString())
    expect(range.start.toDateString()).toBe(
      startOfWeek(new Date('2026-10-01T09:00:00')).toDateString(),
    )
  })

  it('keeps only the runs inside the range', () => {
    const range = periodRange(runs, '4w')
    expect(runsInRange(runs, range).map((entry) => entry.startTime)).toEqual([
      '2026-11-15T09:00:00',
      '2026-11-17T09:00:00',
    ])
  })
})

describe('distanceBuckets', () => {
  it('builds one weekly bucket per week, including the empty ones', () => {
    const range = periodRange(runs, '12w')
    const buckets = distanceBuckets(runsInRange(runs, range), range, 'week')
    expect(buckets).toHaveLength(12)
    expect(buckets.filter((bucket) => bucket.distance > 0)).toHaveLength(4)
    expect(buckets[buckets.length - 1].distance).toBe(5200)
    expect(buckets[buckets.length - 2].distance).toBe(18400)
  })

  it('buckets by month over a year', () => {
    const range = periodRange(runs, '1y')
    const buckets = distanceBuckets(runsInRange(runs, range), range, 'month')
    const withRuns = buckets.filter((bucket) => bucket.runs > 0)
    expect(withRuns).toHaveLength(3)
    expect(withRuns[withRuns.length - 1].distance).toBe(23600)
  })

  it('chooses weekly buckets for short periods and monthly for long ones', () => {
    expect(bucketSize('4w')).toBe('week')
    expect(bucketSize('12w')).toBe('week')
    expect(bucketSize('1y')).toBe('month')
    expect(bucketSize('all')).toBe('month')
  })
})
