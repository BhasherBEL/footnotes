import { describe, expect, it } from 'vitest'
import { heartProfile, referenceHeartRateOf, zoneFloorsOf } from './heartProfile'
import type { Settings } from './settings.svelte'
import type { RunSummary } from '../types'

const defaults: Settings = {
  language: 'en',
  units: 'km',
  period: '12w',
  maxHeartRate: null,
  restingHeartRate: null,
  thresholdHeartRate: null,
  zoneFloors: null,
  referenceHeartRate: null,
  trendMeasure: 'pace',
}

function run(startTime: string, overrides: Partial<RunSummary> = {}): RunSummary {
  return {
    id: startTime,
    startTime,
    sport: 'running',
    subSport: 'generic',
    name: 'run',
    distance: 10000,
    movingTime: 3600,
    elapsedTime: 3600,
    ascent: 50,
    avgHeartRate: 150,
    maxHeartRate: 180,
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

describe('heartProfile', () => {
  it('takes values from the most recent run that has them', () => {
    const runs = [
      run('2026-01-01T09:00:00Z', { deviceProfile: { maxHeartRate: 200, restingHeartRate: 50 } }),
      run('2026-02-01T09:00:00Z', { deviceProfile: { maxHeartRate: 205 } }),
    ]
    const profile = heartProfile(runs, defaults)
    expect(profile.maxHeartRate).toEqual({ value: 205, source: 'files' })
    expect(profile.restingHeartRate).toEqual({ value: 50, source: 'files' })
  })

  it('estimates the threshold from the max when no file has one', () => {
    const runs = [run('2026-02-01T09:00:00Z', { deviceProfile: { maxHeartRate: 200 } })]
    const profile = heartProfile(runs, defaults)
    expect(profile.thresholdHeartRate).toEqual({ value: 178, source: 'estimated' })
  })

  it('estimates the max from the highest recorded heart rate', () => {
    const runs = [
      run('2026-01-01T09:00:00Z', { maxHeartRate: 186 }),
      run('2026-02-01T09:00:00Z', { maxHeartRate: 194 }),
    ]
    const profile = heartProfile(runs, defaults)
    expect(profile.maxHeartRate).toEqual({ value: 194, source: 'estimated' })
  })

  it('prefers what the user set', () => {
    const runs = [run('2026-02-01T09:00:00Z', { deviceProfile: { maxHeartRate: 205 } })]
    const profile = heartProfile(runs, { ...defaults, maxHeartRate: 190 })
    expect(profile.maxHeartRate).toEqual({ value: 190, source: 'user' })
  })

  it('reports nothing when there is no data at all', () => {
    const profile = heartProfile([], defaults)
    expect(profile.maxHeartRate).toEqual({ value: null, source: 'none' })
    expect(profile.restingHeartRate).toEqual({ value: 60, source: 'estimated' })
    expect(profile.zoneFloors).toBeNull()
    expect(profile.referenceHeartRate).toBeNull()
  })

  it('derives the zone floors and the reference heart rate from max and resting', () => {
    const runs = [
      run('2026-02-01T09:00:00Z', {
        deviceProfile: { maxHeartRate: 209, restingHeartRate: 43 },
      }),
    ]
    const profile = heartProfile(runs, defaults)
    expect(profile.zoneFloors).toEqual([126, 144, 171, 181, 191])
    expect(profile.referenceHeartRate).toBe(160)
  })

  it('estimates the resting heart rate at 60 when no file has one', () => {
    const runs = [run('2026-02-01T09:00:00Z', { deviceProfile: { maxHeartRate: 200 } })]
    const profile = heartProfile(runs, defaults)
    expect(profile.restingHeartRate).toEqual({ value: 60, source: 'estimated' })
    expect(profile.zoneFloors).toEqual(zoneFloorsOf(200, 60))
  })
})

describe('zoneFloorsOf', () => {
  it('builds the floors for the user profile', () => {
    expect(zoneFloorsOf(209, 43)).toEqual([126, 144, 171, 181, 191])
  })

  it('builds strictly increasing floors', () => {
    const floors = zoneFloorsOf(190, 50)
    expect(floors[0]).toBeLessThan(floors[1])
    expect(floors[1]).toBeLessThan(floors[2])
    expect(floors[2]).toBeLessThan(floors[3])
    expect(floors[3]).toBeLessThan(floors[4])
  })
})

describe('referenceHeartRateOf', () => {
  it('rounds the middle of zone two to five bpm', () => {
    expect(referenceHeartRateOf([126, 144, 171, 181, 191])).toBe(160)
    expect(referenceHeartRateOf([110, 120, 126, 132, 140])).toBe(125)
  })

  it('stays inside the offered range', () => {
    expect(referenceHeartRateOf([80, 90, 96, 100, 110])).toBe(120)
    expect(referenceHeartRateOf([180, 190, 200, 210, 220])).toBe(180)
  })
})
