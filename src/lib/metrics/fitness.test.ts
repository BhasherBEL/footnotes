import { describe, expect, it } from 'vitest'
import { fitness, fitnessSeries, runLoad, weekBand } from './fitness'
import type { RunSummary } from '../types'

function makeRun(overrides: Partial<RunSummary>): RunSummary {
  return {
    id: 'run',
    startTime: '2026-01-01T08:00:00Z',
    sport: 'running',
    subSport: 'generic',
    name: 'run',
    distance: 5000,
    movingTime: 1800,
    elapsedTime: 1800,
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
    ...overrides,
  }
}

describe('runLoad', () => {
  it('prefers the stored training load', () => {
    const run = makeRun({ trainingLoad: 80, avgHeartRate: 150, movingTime: 1800 })
    expect(runLoad(run)).toBe(80)
  })

  it('falls back to a heart-rate TRIMP when there is no stored load', () => {
    const run = makeRun({ trainingLoad: null, avgHeartRate: 150, movingTime: 1800 })
    expect(runLoad(run)).toBeCloseTo((1800 / 60) * (150 / 100) ** 1.92, 6)
  })

  it('returns zero with neither a load nor an average heart rate', () => {
    const run = makeRun({ trainingLoad: null, avgHeartRate: null })
    expect(runLoad(run)).toBe(0)
  })
})

describe('fitness', () => {
  it('decays a single run by roughly e to the minus one after 42 days', () => {
    const run = makeRun({ startTime: '2026-01-01T08:00:00Z', trainingLoad: 100 })
    const on = new Date('2026-02-12T08:00:00Z')
    expect(fitness([run], on)).toBeCloseTo((100 * Math.exp(-1)) / 42, 2)
  })

  it('ignores runs after the evaluation date', () => {
    const early = makeRun({ id: 'a', startTime: '2026-01-01T08:00:00Z', trainingLoad: 100 })
    const late = makeRun({ id: 'b', startTime: '2026-06-01T08:00:00Z', trainingLoad: 500 })
    const on = new Date('2026-01-01T08:00:00Z')
    expect(fitness([early, late], on)).toBeCloseTo(100 / 42, 6)
  })

  it('converges to a stable number for a steady weekly routine', () => {
    const runs: RunSummary[] = []
    const start = new Date('2026-01-05T08:00:00Z').getTime()
    for (let week = 0; week < 60; week++) {
      runs.push(
        makeRun({
          id: `w${week}`,
          startTime: new Date(start + week * 7 * 86400000).toISOString(),
          trainingLoad: 100,
        }),
      )
    }
    const lastDate = new Date(runs[runs.length - 1].startTime)
    const converged = 100 / (1 - Math.exp(-7 / 42)) / 42
    expect(fitness(runs, lastDate)).toBeCloseTo(converged, 1)
  })
})

describe('fitnessSeries', () => {
  it('matches fitness computed independently at each date', () => {
    const runs: RunSummary[] = []
    const start = new Date('2026-01-05T08:00:00Z').getTime()
    for (let week = 0; week < 10; week++) {
      runs.push(
        makeRun({
          id: `w${week}`,
          startTime: new Date(start + week * 7 * 86400000).toISOString(),
          trainingLoad: 100,
        }),
      )
    }
    const dates = [
      new Date('2026-01-10T08:00:00Z'),
      new Date('2026-01-12T08:00:00Z'),
      new Date('2026-02-01T08:00:00Z'),
      new Date('2026-03-16T08:00:00Z'),
    ]
    const series = fitnessSeries(runs, dates)
    dates.forEach((date, index) => {
      expect(series[index]).toBeCloseTo(fitness(runs, date), 6)
    })
  })

  it('returns zero before the first run', () => {
    const run = makeRun({ startTime: '2026-03-01T08:00:00Z', trainingLoad: 100 })
    const dates = [new Date('2026-01-01T08:00:00Z'), new Date('2026-02-01T08:00:00Z')]
    expect(fitnessSeries([run], dates)).toEqual([0, 0])
  })

  it('returns all zeros with no runs', () => {
    const dates = [new Date('2026-01-01T08:00:00Z'), new Date('2026-02-01T08:00:00Z')]
    expect(fitnessSeries([], dates)).toEqual([0, 0])
  })
})

describe('weekBand', () => {
  function weekRun(id: string, weeksAgo: number, meters: number): RunSummary {
    const weekStart = new Date('2026-03-02T00:00:00Z')
    const date = new Date(weekStart.getTime() - weeksAgo * 7 * 86400000 + 86400000)
    return makeRun({ id, startTime: date.toISOString(), distance: meters })
  }

  it('returns 0.8 and 1.3 times the four week average', () => {
    const weekStart = new Date('2026-03-02T00:00:00Z')
    const runs = [
      weekRun('a', 4, 10000),
      weekRun('b', 3, 20000),
      weekRun('c', 2, 20000),
      weekRun('d', 1, 30000),
    ]
    const band = weekBand(runs, weekStart)
    expect(band).not.toBeNull()
    expect(band?.minimal).toBeCloseTo(0.8 * 20000, 6)
    expect(band?.maximal).toBeCloseTo(1.3 * 20000, 6)
  })

  it('returns null for a one week history', () => {
    const weekStart = new Date('2026-03-02T00:00:00Z')
    const runs = [weekRun('a', 1, 10000)]
    expect(weekBand(runs, weekStart)).toBeNull()
  })

  it('averages the complete weeks it actually found, not a quarter of the sum', () => {
    const weekStart = new Date('2026-03-02T00:00:00Z')
    const week2Start = new Date(weekStart.getTime() - 2 * 7 * 86400000)
    const week1Start = new Date(weekStart.getTime() - 1 * 7 * 86400000)
    const runs = [
      makeRun({ id: 'a', startTime: week2Start.toISOString(), distance: 10000 }),
      makeRun({ id: 'b', startTime: week1Start.toISOString(), distance: 20000 }),
    ]
    const band = weekBand(runs, weekStart)
    expect(band).not.toBeNull()
    expect(band?.minimal).toBeCloseTo(0.8 * 15000, 6)
    expect(band?.maximal).toBeCloseTo(1.3 * 15000, 6)
  })

  it('returns null with no history at all', () => {
    expect(weekBand([], new Date('2026-03-02T00:00:00Z'))).toBeNull()
  })
})
