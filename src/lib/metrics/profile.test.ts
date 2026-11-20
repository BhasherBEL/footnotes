import { describe, expect, it } from 'vitest'
import {
  cadenceProfile,
  elevationProfile,
  heartRateProfile,
  smoothProfile,
  speedProfile,
  type ProfilePoint,
} from './profile'
import type { TrackPoint } from '../types'

function point(
  meters: number,
  seconds: number,
  altitude: number | null,
  heartRateSeconds: Record<number, number> = {},
  cadence: number | null = null,
): TrackPoint {
  return { meters, seconds, altitude, heartRateSeconds, cadence }
}

describe('speedProfile', () => {
  it('gives the same pace at every point, including the ends, on a constant-pace track', () => {
    const track: TrackPoint[] = []
    for (let meters = 0; meters <= 400; meters += 25) {
      track.push(point(meters, meters / 5, null))
    }
    const profile = speedProfile(track)
    for (const segment of profile) {
      expect(segment.value).toBeCloseTo(5)
    }
  })

  it('only nudges the local pace when a single 25 m step is slow, unlike an adjacent-pair reading', () => {
    const track: TrackPoint[] = []
    let seconds = 0
    for (let index = 0; index <= 20; index++) {
      track.push(point(index * 25, seconds, null))
      seconds += index === 10 ? 10 : 5
    }
    const profile = speedProfile(track)
    const atTheSlowStep = profile[11]
    expect(atTheSlowStep.x).toBe(275)
    expect(atTheSlowStep.value).toBeCloseTo(4)
    expect(profile[0].value).toBeCloseTo(5)
    expect(profile[20].value).toBeCloseTo(5)
  })

  it('returns null when every point in reach has no time elapsed', () => {
    const track = [point(0, 10, null), point(100, 10, null)]
    const profile = speedProfile(track)
    expect(profile[1].value).toBeNull()
  })

  it('returns an empty array for an empty track', () => {
    expect(speedProfile([])).toEqual([])
  })
})

describe('cadenceProfile', () => {
  it('passes cadence through and keeps nulls', () => {
    const track = [
      point(0, 0, null, {}, 170),
      point(100, 20, null, {}, null),
      point(200, 40, null, {}, 180),
    ]
    expect(cadenceProfile(track)).toEqual([
      { x: 0, value: 170 },
      { x: 100, value: null },
      { x: 200, value: 180 },
    ])
  })

  it('returns an empty array for an empty track', () => {
    expect(cadenceProfile([])).toEqual([])
  })
})

describe('heartRateProfile', () => {
  it('gives all-null values when the run has no heart rate', () => {
    const track = [point(0, 0, null), point(100, 20, null), point(200, 40, null)]
    const profile = heartRateProfile(track)
    expect(profile.every((segment) => segment.value === null)).toBe(true)
  })

  it('computes the time-weighted average bpm per segment', () => {
    const track = [point(0, 0, null), point(100, 20, null, { 140: 10, 150: 10 })]
    const profile = heartRateProfile(track)
    expect(profile[1].value).toBe(145)
  })

  it('returns an empty array for an empty track', () => {
    expect(heartRateProfile([])).toEqual([])
  })
})

describe('elevationProfile', () => {
  it('passes altitude through and keeps nulls', () => {
    const track = [point(0, 0, 100), point(100, 20, null), point(200, 40, 120)]
    expect(elevationProfile(track)).toEqual([
      { x: 0, value: 100 },
      { x: 100, value: null },
      { x: 200, value: 120 },
    ])
  })

  it('returns an empty array for an empty track', () => {
    expect(elevationProfile([])).toEqual([])
  })
})

describe('smoothProfile', () => {
  it('averages over a 5-point window and handles a null in the middle', () => {
    const points: ProfilePoint[] = [
      { x: 0, value: 1 },
      { x: 100, value: 2 },
      { x: 200, value: null },
      { x: 300, value: 4 },
      { x: 400, value: 5 },
    ]
    const smoothed = smoothProfile(points, 5)
    expect(smoothed).toHaveLength(5)
    expect(smoothed[2]).toEqual({ x: 200, value: 3 })
  })

  it('drops windows with nothing in them', () => {
    const points: ProfilePoint[] = [{ x: 0, value: null }]
    expect(smoothProfile(points, 1)).toEqual([])
  })

  it('returns an empty array for an empty track', () => {
    expect(smoothProfile([], 5)).toEqual([])
  })

  it('weights a ramp triangularly, giving less pull to the far edge', () => {
    const points: ProfilePoint[] = [
      { x: 0, value: 10 },
      { x: 100, value: 20 },
      { x: 200, value: 30 },
      { x: 300, value: 40 },
      { x: 400, value: 50 },
      { x: 500, value: 60 },
    ]
    const smoothed = smoothProfile(points, 5)
    expect(smoothed[1].value).toBe(22.5)
  })

  it('normalises by the weights that remain when a null sits off centre', () => {
    const points: ProfilePoint[] = [
      { x: 0, value: 1 },
      { x: 100, value: 2 },
      { x: 200, value: 3 },
      { x: 300, value: null },
      { x: 400, value: 5 },
    ]
    const smoothed = smoothProfile(points, 5)
    expect(smoothed[2].value).toBeCloseTo(19 / 7)
  })
})
