import { describe, expect, it } from 'vitest'
import { easyShare, heartRateFloor, zoneOf, zonesOf } from './zones'

const floors: [number, number, number, number, number] = [126, 144, 171, 181, 191]

describe('zoneOf', () => {
  it('returns no zone below the zone one floor', () => {
    expect(zoneOf(125, floors)).toBe(0)
  })

  it('puts a rate at or above each floor in that zone', () => {
    expect(zoneOf(126, floors)).toBe(1)
    expect(zoneOf(144, floors)).toBe(2)
    expect(zoneOf(171, floors)).toBe(3)
    expect(zoneOf(181, floors)).toBe(4)
    expect(zoneOf(191, floors)).toBe(5)
  })

  it('puts a rate between two floors in the lower zone', () => {
    expect(zoneOf(143, floors)).toBe(1)
    expect(zoneOf(170, floors)).toBe(2)
    expect(zoneOf(180, floors)).toBe(3)
    expect(zoneOf(190, floors)).toBe(4)
  })

  it('puts a rate far above the top floor in zone five', () => {
    expect(zoneOf(220, floors)).toBe(5)
  })
})

describe('zonesOf', () => {
  it('splits heart-rate seconds into five zones', () => {
    const zones = zonesOf({ 130: 100, 150: 200, 175: 300, 185: 400, 200: 500 }, floors)
    expect(zones.map((zone) => zone.seconds)).toEqual([100, 200, 300, 400, 500])
  })

  it('puts the floor beat in its own zone', () => {
    const zones = zonesOf({ 126: 60, 144: 60, 171: 60, 181: 60, 191: 60 }, floors)
    expect(zones.map((zone) => zone.seconds)).toEqual([60, 60, 60, 60, 60])
  })

  it('leaves time below the zone one floor out of every zone', () => {
    const zones = zonesOf({ 100: 60, 130: 90 }, floors)
    expect(zones.map((zone) => zone.seconds)).toEqual([90, 0, 0, 0, 0])
    expect(zones.reduce((sum, zone) => sum + zone.seconds, 0)).toBe(90)
  })

  it('reports the bpm range of each zone', () => {
    const zones = zonesOf({}, floors)
    expect(zones.map((zone) => [zone.floor, zone.ceiling])).toEqual([
      [126, 143],
      [144, 170],
      [171, 180],
      [181, 190],
      [191, null],
    ])
  })
})

describe('easyShare', () => {
  it('adds up zones one and two', () => {
    const zones = zonesOf({ 130: 480, 150: 270, 175: 110, 185: 100, 200: 40 }, floors)
    expect(easyShare(zones)).toBeCloseTo(0.75, 6)
  })

  it('leaves below-floor time out of the total', () => {
    const zones = zonesOf({ 100: 500, 130: 480, 150: 270, 175: 110, 185: 100, 200: 40 }, floors)
    expect(easyShare(zones)).toBeCloseTo(0.75, 6)
  })

  it('is zero without heart-rate data', () => {
    expect(easyShare(zonesOf({}, floors))).toBe(0)
  })
})

describe('heartRateFloor', () => {
  const slowFloors: [number, number, number, number, number] = [100, 110, 120, 130, 140]
  const warmUp = Array.from({ length: 10 }, (_, index) => 80 + index)
  const working = Array.from({ length: 490 }, (_, index) => 130 + (index % 21))

  it('cuts the warm-up dip below the zone one floor', () => {
    const floor = heartRateFloor([...warmUp, ...working], slowFloors)
    expect(floor).toBe(95)
    expect(floor).toBeGreaterThan(Math.max(...warmUp))
    expect(floor).toBeLessThanOrEqual(slowFloors[0] - 5)
  })

  it('keeps a genuinely slow run visible', () => {
    const slow = Array.from({ length: 500 }, (_, index) => 90 + (index % 16))
    const floor = heartRateFloor(slow, slowFloors)
    expect(floor).toBe(90)
    expect(floor).toBeLessThanOrEqual(91)
  })

  it('never rises above five beats under the zone one floor', () => {
    const fast = Array.from({ length: 500 }, (_, index) => 150 + (index % 41))
    const floor = heartRateFloor(fast, slowFloors)
    expect(floor).toBeLessThanOrEqual(slowFloors[0] - 5)
  })

  it('uses the second percentile without zone floors', () => {
    const values = Array.from({ length: 100 }, (_, index) => index)
    expect(heartRateFloor(values, null)).toBe(2)
  })

  it('returns null without enough data', () => {
    const short = Array.from({ length: 19 }, (_, index) => 100 + index)
    expect(heartRateFloor(short, slowFloors)).toBeNull()
    expect(heartRateFloor([], null)).toBeNull()
  })
})
