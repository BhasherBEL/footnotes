import { describe, expect, it } from 'vitest'
import { splitsAt, splitsEvery, trackOf, TRACK_STEP } from './splits'
import type { EffortRecord } from './bestEfforts'

const METERS_PER_MILE = 1609.344

function steadyRun(
  meters: number,
  speed: number,
  step = 10,
  heartRate: number | null = null,
  altitude: number | null = null,
  cadence: number | null = null,
): EffortRecord[] {
  const records: EffortRecord[] = []
  for (let distance = 0; distance <= meters; distance += speed * step) {
    records.push({ seconds: distance / speed, distance, heartRate, altitude, cadence })
  }
  return records
}

describe('trackOf', () => {
  it('builds a cumulative track at a constant pace', () => {
    const track = trackOf(steadyRun(2500, 5, 20), TRACK_STEP)

    expect(track[0]).toEqual({
      meters: 0,
      seconds: 0,
      heartRateSeconds: {},
      altitude: null,
      cadence: null,
    })
    expect(track.length).toBe(101)
    expect(track.find((point) => point.meters === 1000)?.seconds).toBeCloseTo(200, 3)

    for (let index = 1; index < track.length; index++) {
      expect(track[index].meters).toBeGreaterThan(track[index - 1].meters)
      expect(track[index].seconds).toBeGreaterThan(track[index - 1].seconds)
    }
    for (const point of track) {
      expect(point.seconds).toBeCloseTo(point.meters / 5, 3)
    }
  })

  it('returns nothing with fewer than two records', () => {
    expect(
      trackOf(
        [{ seconds: 0, distance: 0, heartRate: null, altitude: null, cadence: null }],
        TRACK_STEP,
      ),
    ).toEqual([])
    expect(trackOf([], TRACK_STEP)).toEqual([])
  })

  it('builds a time-in-bpm histogram per segment, resetting at every mark', () => {
    const records: EffortRecord[] = [
      { seconds: 0, distance: 0, heartRate: 150, altitude: null, cadence: null },
      { seconds: 10, distance: 100, heartRate: 160, altitude: null, cadence: null },
      { seconds: 20, distance: 200, heartRate: 170, altitude: null, cadence: null },
    ]
    const track = trackOf(records, TRACK_STEP)

    expect(track[1].meters).toBe(25)
    expect(track[1].heartRateSeconds).toEqual({ 150: 10 })
    expect(track[2].meters).toBe(50)
    expect(track[2].heartRateSeconds).toEqual({})
    expect(track[4].meters).toBe(100)
    expect(track[4].heartRateSeconds).toEqual({})
    expect(track[5].meters).toBe(125)
    expect(track[5].heartRateSeconds).toEqual({ 160: 10 })
  })

  it('interpolates altitude at each mark', () => {
    const records: EffortRecord[] = [
      { seconds: 0, distance: 0, heartRate: null, altitude: 100, cadence: null },
      { seconds: 20, distance: 200, heartRate: null, altitude: 120, cadence: null },
    ]
    const track = trackOf(records, TRACK_STEP)

    expect(track[0].altitude).toBe(100)
    expect(track[1].altitude).toBe(102.5)
    expect(track[4].altitude).toBe(110)
    expect(track[8].altitude).toBe(120)
  })

  it('gives a null altitude at every mark when the run carries none', () => {
    const track = trackOf(steadyRun(200, 5, 20), TRACK_STEP)

    for (const point of track) {
      expect(point.altitude).toBeNull()
    }
  })

  it('time-weights the cadence of a track point instead of taking the simple mean', () => {
    const records: EffortRecord[] = [
      { seconds: 0, distance: 0, heartRate: null, altitude: null, cadence: 200 },
      { seconds: 1, distance: 5, heartRate: null, altitude: null, cadence: 200 },
      { seconds: 2, distance: 10, heartRate: null, altitude: null, cadence: 100 },
      { seconds: 9, distance: 30, heartRate: null, altitude: null, cadence: 100 },
    ]
    const track = trackOf(records, TRACK_STEP)

    expect(track[1].meters).toBe(25)
    expect(track[1].cadence).toBeCloseTo(1100 / 9, 6)
    expect(track[1].cadence).not.toBeCloseTo(150, 6)
  })

  it('gives a null cadence at a mark when the run carries none', () => {
    const track = trackOf(steadyRun(200, 5, 20), TRACK_STEP)

    for (const point of track) {
      expect(point.cadence).toBeNull()
    }
  })
})

describe('splitsEvery', () => {
  it('cuts a 2500 m track at 1000 m into two splits and a remainder', () => {
    const track = trackOf(steadyRun(2500, 5, 20), TRACK_STEP)
    const splits = splitsEvery(track, 1000)

    expect(splits).toHaveLength(3)
    expect(splits[0].meters).toBe(1000)
    expect(splits[1].meters).toBe(1000)
    expect(splits[0].seconds).toBeCloseTo(200, 3)
    expect(splits[1].seconds).toBeCloseTo(200, 3)
    expect(splits[2].meters).toBeCloseTo(500, 6)
    expect(splits[2].seconds).toBeCloseTo(100, 3)
  })

  it('sums mile splits to the total time within half a second', () => {
    const track = trackOf(steadyRun(5000, 4), TRACK_STEP)
    const splits = splitsEvery(track, METERS_PER_MILE)
    const total = splits.reduce((sum, split) => sum + split.seconds, 0)

    expect(total).toBeCloseTo(track[track.length - 1].seconds, 1)
  })

  it('returns nothing for an empty track', () => {
    expect(splitsEvery([], 1000)).toEqual([])
  })

  it('gives a constant heart rate on every split', () => {
    const track = trackOf(steadyRun(3000, 5, 20, 150), TRACK_STEP)
    const splits = splitsEvery(track, 1000)

    expect(splits).toHaveLength(3)
    for (const split of splits) {
      expect(split.heartRate).toBe(150)
    }
  })

  it('gives a null heart rate and an empty histogram when the run carries no heart rate', () => {
    const track = trackOf(steadyRun(2000, 5, 20), TRACK_STEP)
    const splits = splitsEvery(track, 1000)

    for (const split of splits) {
      expect(split.heartRate).toBeNull()
      expect(split.heartRateSeconds).toEqual({})
    }
  })

  it('time-weights a split spanning a heart-rate change instead of taking the midpoint', () => {
    const records: EffortRecord[] = []
    for (let second = 0; second <= 80; second += 10) {
      records.push({
        seconds: second,
        distance: second * 10,
        heartRate: 150,
        altitude: null,
        cadence: null,
      })
    }
    records.push({ seconds: 90, distance: 900, heartRate: 100, altitude: null, cadence: null })
    records.push({ seconds: 100, distance: 1000, heartRate: 100, altitude: null, cadence: null })

    const track = trackOf(records, TRACK_STEP)
    const splits = splitsEvery(track, 1000)

    expect(splits).toHaveLength(1)
    expect(splits[0].heartRate).toBe(145)
    expect(splits[0].heartRate).not.toBe(125)
  })
})

describe('splitsAt', () => {
  it('returns one split per boundary plus the remainder', () => {
    const track = trackOf(steadyRun(2500, 5, 20), TRACK_STEP)
    const splits = splitsAt(track, [400, 1000])

    expect(splits).toHaveLength(3)
    expect(splits[0].meters).toBe(400)
    expect(splits[1].meters).toBe(600)
    expect(splits[2].meters).toBeCloseTo(1500, 6)
    expect(splits[0].seconds).toBeCloseTo(80, 3)
    expect(splits[1].seconds).toBeCloseTo(120, 3)
    expect(splits[2].seconds).toBeCloseTo(300, 3)
  })

  it('drops a boundary past the end of the track and folds it into the remainder', () => {
    const track = trackOf(steadyRun(1000, 5, 20), TRACK_STEP)
    const splits = splitsAt(track, [500, 2000])

    expect(splits).toHaveLength(2)
    expect(splits[1].meters).toBeCloseTo(500, 6)
  })
})
