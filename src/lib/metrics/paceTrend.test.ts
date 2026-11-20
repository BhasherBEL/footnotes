import { describe, expect, it } from 'vitest'
import {
  efficiencyFactor,
  nearestHeartRate,
  referenceHeartRates,
  runPoints,
  speedAtHeartRate,
  trendWindowDays,
  weeklyTrend,
} from './paceTrend'
import { addWeeks, periodRange, startOfWeek, type PeriodRange } from '../period'
import type { RunSummary } from '../types'

function run(startTime: string, overrides: Partial<RunSummary> = {}): RunSummary {
  return {
    id: startTime,
    startTime,
    sport: 'running',
    subSport: 'generic',
    name: 'run',
    distance: 10000,
    movingTime: 3000,
    elapsedTime: 3000,
    ascent: 0,
    avgHeartRate: 145,
    maxHeartRate: 160,
    heartRateSeconds: { 140: 2400, 155: 600 },
    bestEfforts: {},
    steadyHeartRateFit: { intercept: 1.5, slope: 0.01, minHeartRate: 140, maxHeartRate: 150 },
    splitTrack: [],
    route: [],
    lapBoundaries: [],
    startLatitude: null,
    startLongitude: null,
    deviceProfile: {},
    steps: null,
    trainingLoad: null,
    gradeFactor: 1,
    ...overrides,
  }
}

describe('speedAtHeartRate', () => {
  it('reads the fit at the reference heart rate', () => {
    expect(speedAtHeartRate(run('2026-11-01T09:00:00'), 145)).toBeCloseTo(2.95, 6)
  })

  it('accepts both edges of the fitted range', () => {
    expect(speedAtHeartRate(run('2026-11-01T09:00:00'), 140)).toBeCloseTo(2.9, 6)
    expect(speedAtHeartRate(run('2026-11-01T09:00:00'), 150)).toBeCloseTo(3.0, 6)
  })

  it('rejects a heart rate one beat outside the fitted range', () => {
    expect(speedAtHeartRate(run('2026-11-01T09:00:00'), 139)).toBeNull()
    expect(speedAtHeartRate(run('2026-11-01T09:00:00'), 151)).toBeNull()
  })

  it('returns nothing without a fit', () => {
    expect(
      speedAtHeartRate(run('2026-11-01T09:00:00', { steadyHeartRateFit: null }), 145),
    ).toBeNull()
  })

  it('scales the speed by the grade factor', () => {
    expect(speedAtHeartRate(run('2026-11-01T09:00:00', { gradeFactor: 1.1 }), 145)).toBeCloseTo(
      2.95 * 1.1,
      6,
    )
  })
})

describe('efficiencyFactor', () => {
  it('is meters per minute per beat', () => {
    expect(efficiencyFactor(run('2026-11-01T09:00:00'))).toBeCloseTo(((10000 / 3000) * 60) / 145, 6)
  })

  it('needs an average heart rate', () => {
    expect(efficiencyFactor(run('2026-11-01T09:00:00', { avgHeartRate: null }))).toBeNull()
  })

  it('is 10% higher with a 1.1 grade factor than on the flat', () => {
    const flat = efficiencyFactor(run('2026-11-01T09:00:00', { gradeFactor: 1 })) as number
    const hilly = efficiencyFactor(run('2026-11-01T09:00:00', { gradeFactor: 1.1 })) as number
    expect(hilly).toBeCloseTo(flat * 1.1, 6)
  })
})

describe('runPoints', () => {
  const runs = [
    run('2026-10-05T09:00:00'),
    run('2026-10-12T09:00:00', {
      steadyHeartRateFit: { intercept: 1.6, slope: 0.01, minHeartRate: 140, maxHeartRate: 150 },
    }),
    run('2026-10-26T09:00:00', {
      steadyHeartRateFit: { intercept: 1.7, slope: 0.01, minHeartRate: 140, maxHeartRate: 150 },
    }),
    run('2026-11-02T09:00:00', { steadyHeartRateFit: null }),
  ]

  it('keeps every run that has a usable fit for pace', () => {
    const points = runPoints(runs, 'pace', 145)
    expect(points).toHaveLength(3)
    expect(points[0].value).toBeCloseTo(2.95, 6)
  })

  it('skips a run with no fit for pace', () => {
    const points = runPoints(
      [run('2026-11-02T09:00:00', { steadyHeartRateFit: null })],
      'pace',
      145,
    )
    expect(points).toHaveLength(0)
  })

  it('gives an efficiency point to a run with no fit but an average heart rate', () => {
    const points = runPoints(
      [run('2026-11-02T09:00:00', { steadyHeartRateFit: null, avgHeartRate: 150 })],
      'efficiency',
      150,
    )
    expect(points).toHaveLength(1)
    expect(points[0].value).toBeCloseTo(((10000 / 3000) * 60) / 150, 6)
  })

  it('averages the previous 28 days at the end of each week', () => {
    const range = periodRange(runs, '12w')
    const trend = weeklyTrend(runPoints(runs, 'pace', 145), range, 28)
    expect(trend.length).toBeGreaterThan(0)
    expect(trend[0].value).toBeCloseTo(2.95, 6)
    const last = trend[trend.length - 1]
    expect(last.value).toBeCloseTo(3.1, 6)
  })

  it('skips weeks with no value', () => {
    const range = periodRange([runs[0]], 'all')
    const trend = weeklyTrend(runPoints([runs[0]], 'pace', 145), range, 56)
    expect(trend).toHaveLength(1)
  })
})

describe('trendWindowDays', () => {
  it('gives each period its own window', () => {
    expect(trendWindowDays('4w')).toBe(14)
    expect(trendWindowDays('12w')).toBe(28)
    expect(trendWindowDays('1y')).toBe(56)
    expect(trendWindowDays('all')).toBe(56)
  })
})

describe('weeklyTrend window', () => {
  it('includes a point 13 days before the week end and excludes one 15 days before', () => {
    const weekStart = startOfWeek(new Date('2026-11-16T00:00:00'))
    const weekEnd = addWeeks(weekStart, 1)
    const range: PeriodRange = {
      start: weekStart,
      end: weekEnd,
      latest: weekEnd,
      windowStart: weekStart,
    }
    const within = new Date(weekEnd.getTime() - 13 * 86400000)
    const outside = new Date(weekEnd.getTime() - 15 * 86400000)
    const trend = weeklyTrend(
      [
        { date: within, value: 10 },
        { date: outside, value: 100 },
      ],
      range,
      14,
    )
    expect(trend).toHaveLength(1)
    expect(trend[0].value).toBe(10)
  })
})

describe('referenceHeartRates', () => {
  it('spans the ten and ninety percent of the loaded runs', () => {
    const heartRates = [150, 155, 160, 165, 170, 175, 180, 185, 190]
    const runs = heartRates.map((heartRate, index) =>
      run(`2026-11-0${index + 1}T09:00:00`, { avgHeartRate: heartRate }),
    )
    const options = referenceHeartRates(runs)
    expect(options[0]).toBeLessThanOrEqual(155)
    expect(options[options.length - 1]).toBeGreaterThanOrEqual(185)
    for (const option of options) expect(option % 5).toBe(0)
  })

  it('falls back to the fixed range with a single run', () => {
    const runs = [run('2026-11-01T09:00:00', { avgHeartRate: 150 })]
    const options = referenceHeartRates(runs)
    expect(options[0]).toBe(120)
    expect(options[options.length - 1]).toBe(180)
  })
})

describe('nearestHeartRate', () => {
  it('picks the closest option', () => {
    expect(nearestHeartRate([150, 155, 160], 162)).toBe(160)
  })

  it('returns the wanted value when there are no options', () => {
    expect(nearestHeartRate([], 162)).toBe(162)
  })
})
