import { describe, expect, it } from 'vitest'
import { summarize } from './summarize'
import type { EventLike, FitData, LapLike, RecordLike, SessionLike } from './summarize'
import { splitsEvery } from '../metrics/splits'

const start = new Date('2026-11-15T09:00:00Z')

function session(overrides: Partial<SessionLike> = {}): SessionLike {
  return {
    startTime: start,
    sport: 'running',
    subSport: 'generic',
    totalDistance: 6000,
    totalTimerTime: 1800,
    totalElapsedTime: 1800,
    totalAscent: 42,
    avgHeartRate: 145,
    maxHeartRate: 162,
    ...overrides,
  }
}

function records(count: number, step: number, heartRate = 140): RecordLike[] {
  const built: RecordLike[] = []
  for (let index = 0; index < count; index++) {
    built.push({
      timestamp: new Date(start.getTime() + index * step * 1000),
      distance: index * step * 3.33,
      enhancedSpeed: 3.33,
      heartRate,
    })
  }
  return built
}

function fitData(overrides: Partial<FitData> = {}): FitData {
  return {
    sessions: [],
    records: [],
    events: [],
    laps: [],
    ...overrides,
  }
}

function timerStart(): EventLike[] {
  return [{ timestamp: start, event: 'timer', eventType: 'start' }]
}

describe('summarize', () => {
  it('builds a summary from a running session', () => {
    const result = summarize(
      fitData({ sessions: [session()], records: records(600, 3) }),
      {},
      'key',
    )
    expect(result.kind).toBe('run')
    if (result.kind !== 'run') return
    expect(result.summary.id).toBe('key')
    expect(result.summary.distance).toBe(6000)
    expect(result.summary.movingTime).toBe(1800)
    expect(result.summary.name).toBe('run')
    expect(result.summary.ascent).toBe(42)
    expect(result.summary.avgHeartRate).toBe(145)
    expect(result.summary.heartRateSeconds[140]).toBeCloseTo(599 * 3, 6)
  })

  it('caps the time between two records at ten seconds', () => {
    const sparse: RecordLike[] = [
      { timestamp: start, distance: 0, heartRate: 150 },
      { timestamp: new Date(start.getTime() + 60_000), distance: 300, heartRate: 150 },
      { timestamp: new Date(start.getTime() + 65_000), distance: 325, heartRate: 150 },
    ]
    const result = summarize(fitData({ sessions: [session()], records: sparse }), {}, 'key')
    if (result.kind !== 'run') throw new Error('expected a run')
    expect(result.summary.heartRateSeconds[150]).toBe(15)
  })

  it('skips a session that is not running', () => {
    const result = summarize(
      fitData({ sessions: [session({ sport: 'cycling' })], records: records(600, 3) }),
      {},
      'key',
    )
    expect(result).toEqual({ kind: 'skipped', reason: 'not-running' })
  })

  it('skips runs that are too short', () => {
    const brief = session({ totalTimerTime: 30, totalElapsedTime: 30 })
    expect(summarize(fitData({ sessions: [brief], records: records(10, 3) }), {}, 'key')).toEqual({
      kind: 'skipped',
      reason: 'too-short',
    })
    const tiny = session({ totalDistance: 150 })
    expect(summarize(fitData({ sessions: [tiny], records: records(10, 3) }), {}, 'key')).toEqual({
      kind: 'skipped',
      reason: 'too-short',
    })
  })

  it('names a run after its sub-sport', () => {
    const result = summarize(
      fitData({ sessions: [session({ subSport: 'trail' })], records: records(600, 3) }),
      {},
      'key',
    )
    if (result.kind !== 'run') throw new Error('expected a run')
    expect(result.summary.name).toBe('trail')
    expect(result.summary.subSport).toBe('trail')
  })

  it('picks the first running session and ignores records outside it', () => {
    const ride = session({ sport: 'cycling', startTime: new Date(start.getTime() - 3600_000) })
    const outside: RecordLike[] = [
      { timestamp: new Date(start.getTime() - 60_000), distance: 0, heartRate: 190 },
      ...records(600, 3),
    ]
    const result = summarize(fitData({ sessions: [ride, session()], records: outside }), {}, 'key')
    if (result.kind !== 'run') throw new Error('expected a run')
    expect(result.summary.heartRateSeconds[190]).toBeUndefined()
  })

  it('computes the ascent from altitude when the session has none', () => {
    const climb: RecordLike[] = []
    for (let index = 0; index < 120; index++) {
      const wobble = index % 2 === 0 ? 0.5 : -0.5
      climb.push({
        timestamp: new Date(start.getTime() + index * 15_000),
        distance: index * 50,
        enhancedAltitude: 100 + index + wobble,
      })
    }
    const result = summarize(
      fitData({ sessions: [session({ totalAscent: undefined })], records: climb }),
      {},
      'key',
    )
    if (result.kind !== 'run') throw new Error('expected a run')
    expect(result.summary.ascent).toBeGreaterThan(100)
    expect(result.summary.ascent).toBeLessThanOrEqual(119)
  })

  it('ignores wobble below the two metre threshold', () => {
    const flat: RecordLike[] = []
    for (let index = 0; index < 120; index++) {
      flat.push({
        timestamp: new Date(start.getTime() + index * 15_000),
        distance: index * 50,
        enhancedAltitude: 100 + (index % 2 === 0 ? 0.6 : -0.6),
      })
    }
    const result = summarize(
      fitData({ sessions: [session({ totalAscent: undefined })], records: flat }),
      {},
      'key',
    )
    if (result.kind !== 'run') throw new Error('expected a run')
    expect(result.summary.ascent).toBe(0)
  })

  it('handles runs without heart rate', () => {
    const withoutHeartRate = records(600, 3).map(({ heartRate, ...rest }) => rest)
    const result = summarize(
      fitData({ sessions: [session({ avgHeartRate: 0 })], records: withoutHeartRate }),
      {},
      'key',
    )
    if (result.kind !== 'run') throw new Error('expected a run')
    expect(result.summary.heartRateSeconds).toEqual({})
    expect(result.summary.steadyHeartRateFit).toBeNull()
    expect(result.summary.avgHeartRate).toBeNull()
  })

  it('keeps only positive device profile values', () => {
    const result = summarize(
      fitData({ sessions: [session()], records: records(600, 3) }),
      { maxHeartRate: 209, thresholdHeartRate: 0, restingHeartRate: 40 },
      'key',
    )
    if (result.kind !== 'run') throw new Error('expected a run')
    expect(result.summary.deviceProfile).toEqual({ maxHeartRate: 209, restingHeartRate: 40 })
  })

  it('reports the best efforts the run covered', () => {
    const result = summarize(
      fitData({ sessions: [session()], records: records(600, 3) }),
      {},
      'key',
    )
    if (result.kind !== 'run') throw new Error('expected a run')
    expect(result.summary.bestEfforts['1k']).toBeCloseTo(300.3, 1)
    expect(result.summary.bestEfforts['5k']).toBeCloseTo(1501.5, 1)
    expect(result.summary.bestEfforts['10k']).toBeUndefined()
  })

  it('excludes a paused hole from the first kilometre split', () => {
    const pausedSession = session({
      totalDistance: 2000,
      totalTimerTime: 500,
      totalElapsedTime: 1100,
    })
    const withoutHole: RecordLike[] = []
    for (let index = 0; index <= 50; index++) {
      withoutHole.push({
        timestamp: new Date(start.getTime() + index * 10_000),
        distance: index * 20,
      })
    }
    const afterHole: RecordLike[] = []
    for (let index = 0; index <= 50; index++) {
      afterHole.push({
        timestamp: new Date(start.getTime() + 600_000 + index * 10_000),
        distance: 1000 + index * 20,
      })
    }
    const paused: RecordLike[] = [...withoutHole, ...afterHole]
    const events: EventLike[] = [
      { timestamp: new Date(start.getTime() + 500_000), event: 'timer', eventType: 'stopAll' },
      { timestamp: new Date(start.getTime() + 600_000), event: 'timer', eventType: 'start' },
    ]

    const result = summarize(
      fitData({ sessions: [pausedSession], records: paused, events }),
      {},
      'key',
    )
    if (result.kind !== 'run') throw new Error('expected a run')
    const kmSplits = splitsEvery(result.summary.splitTrack, 1000)
    expect(kmSplits).toHaveLength(2)
    expect(kmSplits[0].seconds).toBeCloseTo(500, 1)
    expect(kmSplits[1].seconds).toBeCloseTo(500, 1)
  })

  it('builds lap boundaries from the running sum of positive lap distances', () => {
    const laps: LapLike[] = [{ totalDistance: 1000 }, { totalDistance: 0 }, { totalDistance: 500 }]
    const result = summarize(
      fitData({ sessions: [session()], records: records(600, 3), laps }),
      {},
      'key',
    )
    if (result.kind !== 'run') throw new Error('expected a run')
    expect(result.summary.lapBoundaries).toEqual([1000, 1500])
  })

  it('converts strides into steps', () => {
    const result = summarize(
      fitData({ sessions: [session({ totalStrides: 2602 })], records: records(600, 3) }),
      {},
      'key',
    )
    if (result.kind !== 'run') throw new Error('expected a run')
    expect(result.summary.steps).toBe(5204)
  })

  it('gives a null step count without strides', () => {
    const result = summarize(
      fitData({ sessions: [session()], records: records(600, 3) }),
      {},
      'key',
    )
    if (result.kind !== 'run') throw new Error('expected a run')
    expect(result.summary.steps).toBeNull()
  })

  it('reports training load only when positive', () => {
    const withLoad = summarize(
      fitData({ sessions: [session({ trainingLoadPeak: 108.1 })], records: records(600, 3) }),
      {},
      'key',
    )
    if (withLoad.kind !== 'run') throw new Error('expected a run')
    expect(withLoad.summary.trainingLoad).toBe(108.1)

    const withoutLoad = summarize(
      fitData({ sessions: [session({ trainingLoadPeak: 0 })], records: records(600, 3) }),
      {},
      'key',
    )
    if (withoutLoad.kind !== 'run') throw new Error('expected a run')
    expect(withoutLoad.summary.trainingLoad).toBeNull()
  })

  it('computes the grade factor from the ratio of grade-adjusted speed to average speed', () => {
    const result = summarize(
      fitData({
        sessions: [
          session({ totalDistance: 6000, totalTimerTime: 1800, avgGradeAdjustedSpeed: 4 }),
        ],
        records: records(600, 3),
      }),
      {},
      'key',
    )
    if (result.kind !== 'run') throw new Error('expected a run')
    expect(result.summary.gradeFactor).toBeCloseTo(1.2, 6)
  })

  it('falls back to the ascent rule of thumb without grade-adjusted speed', () => {
    const result = summarize(
      fitData({
        sessions: [session({ totalDistance: 6000, totalTimerTime: 1800, totalAscent: 100 })],
        records: records(600, 3),
      }),
      {},
      'key',
    )
    if (result.kind !== 'run') throw new Error('expected a run')
    expect(result.summary.gradeFactor).toBeCloseTo(1.1333, 3)
  })

  it('clamps the grade factor to the 0.8 to 1.5 range', () => {
    const steep = summarize(
      fitData({
        sessions: [
          session({ totalDistance: 6000, totalTimerTime: 1800, avgGradeAdjustedSpeed: 20 }),
        ],
        records: records(600, 3),
      }),
      {},
      'key',
    )
    if (steep.kind !== 'run') throw new Error('expected a run')
    expect(steep.summary.gradeFactor).toBe(1.5)

    const shallow = summarize(
      fitData({
        sessions: [
          session({ totalDistance: 6000, totalTimerTime: 1800, avgGradeAdjustedSpeed: 0.5 }),
        ],
        records: records(600, 3),
      }),
      {},
      'key',
    )
    if (shallow.kind !== 'run') throw new Error('expected a run')
    expect(shallow.summary.gradeFactor).toBe(0.8)
  })

  it('converts cadence into steps per minute and treats non-positive cadence as null', () => {
    const withCadence: RecordLike[] = [
      { timestamp: start, distance: 0, cadence: 80, fractionalCadence: 0.5 },
      { timestamp: new Date(start.getTime() + 5_000), distance: 500, cadence: 0 },
      { timestamp: new Date(start.getTime() + 10_000), distance: 1000, cadence: 90 },
    ]
    const result = summarize(fitData({ sessions: [session()], records: withCadence }), {}, 'key')
    if (result.kind !== 'run') throw new Error('expected a run')
    const track = result.summary.splitTrack
    expect(track[0].cadence).toBe(161)
    expect(track.find((point) => point.meters === 25)?.cadence).toBe(161)
    expect(track.find((point) => point.meters === 50)?.cadence).toBeNull()
    expect(track.find((point) => point.meters === 1000)?.cadence).toBeNull()
  })

  it('excludes a paused hole from the heart rate of a split spanning it', () => {
    const pausedSession = session({
      totalDistance: 2000,
      totalTimerTime: 500,
      totalElapsedTime: 1100,
    })
    const withoutHole: RecordLike[] = []
    for (let index = 0; index <= 50; index++) {
      withoutHole.push({
        timestamp: new Date(start.getTime() + index * 10_000),
        distance: index * 20,
        heartRate: 150,
      })
    }
    const afterHole: RecordLike[] = []
    for (let index = 0; index <= 50; index++) {
      afterHole.push({
        timestamp: new Date(start.getTime() + 600_000 + index * 10_000),
        distance: 1000 + index * 20,
        heartRate: 150,
      })
    }
    const paused: RecordLike[] = [...withoutHole, ...afterHole]
    const events: EventLike[] = [
      { timestamp: new Date(start.getTime() + 500_000), event: 'timer', eventType: 'stopAll' },
      { timestamp: new Date(start.getTime() + 600_000), event: 'timer', eventType: 'start' },
    ]

    const result = summarize(
      fitData({ sessions: [pausedSession], records: paused, events }),
      {},
      'key',
    )
    if (result.kind !== 'run') throw new Error('expected a run')
    const kmSplits = splitsEvery(result.summary.splitTrack, 1000)
    expect(kmSplits).toHaveLength(2)
    expect(kmSplits[0].heartRate).toBe(150)
    expect(kmSplits[1].heartRate).toBe(150)
  })

  it('subtracts standing breaks from the moving time', () => {
    const standing: RecordLike[] = []
    for (let index = 0; index <= 90; index++) {
      standing.push({
        timestamp: new Date(start.getTime() + index * 1000),
        distance: index * 10,
        enhancedSpeed: index >= 20 && index < 50 ? 0.4 : 3,
      })
    }
    const result = summarize(
      fitData({
        sessions: [session({ totalDistance: 900, totalTimerTime: 90, totalElapsedTime: 90 })],
        records: standing,
        events: timerStart(),
      }),
      {},
      'key',
    )
    if (result.kind !== 'run') throw new Error('expected a run')
    expect(result.summary.movingTime).toBe(60)
  })

  it('measures speed between positions when records carry none', () => {
    const latitude = 48.8566
    const located: RecordLike[] = [
      { timestamp: start, positionLat: latitude, positionLong: 2.3522 },
      { timestamp: new Date(start.getTime() + 1000), positionLat: latitude, positionLong: 2.3522 },
      { timestamp: new Date(start.getTime() + 2000), positionLat: latitude, positionLong: 2.3522 },
      {
        timestamp: new Date(start.getTime() + 3000),
        positionLat: latitude + 0.00005,
        positionLong: 2.3522,
      },
      {
        timestamp: new Date(start.getTime() + 4000),
        positionLat: latitude + 0.0001,
        positionLong: 2.3522,
      },
      {
        timestamp: new Date(start.getTime() + 5000),
        positionLat: latitude + 0.00015,
        positionLong: 2.3522,
      },
    ]
    const result = summarize(
      fitData({ sessions: [session()], records: located, events: timerStart() }),
      {},
      'key',
    )
    if (result.kind !== 'run') throw new Error('expected a run')
    expect(result.summary.movingTime).toBe(1798)
  })

  it('treats records without speed or positions as moving', () => {
    const treadmill = records(600, 1).map(({ enhancedSpeed, ...rest }) => rest)
    const result = summarize(
      fitData({ sessions: [session()], records: treadmill, events: timerStart() }),
      {},
      'key',
    )
    if (result.kind !== 'run') throw new Error('expected a run')
    expect(result.summary.movingTime).toBe(1800)
  })
})
