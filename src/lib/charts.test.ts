import { describe, expect, it } from 'vitest'
import { colorSegments, crossing, decimalsFor, niceTicks } from './charts'

describe('niceTicks', () => {
  it('covers the data with round steps', () => {
    expect(niceTicks(0, 44.8, 5)).toEqual([0, 10, 20, 30, 40, 50])
  })

  it('keeps four to six ticks for small ranges', () => {
    const ticks = niceTicks(0, 3.2, 5)
    expect(ticks.length).toBeGreaterThanOrEqual(4)
    expect(ticks.length).toBeLessThanOrEqual(6)
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(3.2)
  })

  it('starts below the minimum when the data does not reach zero', () => {
    const ticks = niceTicks(312, 352, 5)
    expect(ticks[0]).toBeLessThanOrEqual(312)
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(352)
  })

  it('falls back when the range is empty', () => {
    expect(niceTicks(0, 0)).toEqual([0, 1])
    expect(niceTicks(5, 5)).toEqual([0, 1])
  })
})

describe('decimalsFor', () => {
  it('needs no decimals for a step of 5', () => {
    expect(decimalsFor(5)).toBe(0)
  })

  it('needs no decimals for a step of 1', () => {
    expect(decimalsFor(1)).toBe(0)
  })

  it('needs one decimal for a step of 0.5', () => {
    expect(decimalsFor(0.5)).toBe(1)
  })

  it('needs two decimals for a step of 0.05', () => {
    expect(decimalsFor(0.05)).toBe(2)
  })

  it('falls back to zero for a step of 0', () => {
    expect(decimalsFor(0)).toBe(0)
  })
})

describe('crossing', () => {
  const colorOf = (value: number): string => (value < 150 ? 'a' : 'b')

  it('finds the point where a rising value meets the threshold', () => {
    const point = crossing({ x: 0, value: 140 }, { x: 100, value: 160 }, colorOf)
    expect(point.value).toBeCloseTo(150, 3)
    expect(point.x).toBeCloseTo(50, 1)
  })

  it('finds the point where a falling value meets the threshold', () => {
    const point = crossing({ x: 0, value: 160 }, { x: 100, value: 140 }, colorOf)
    expect(point.value).toBeCloseTo(150, 3)
    expect(point.x).toBeCloseTo(50, 1)
  })

  it('interpolates proportionally when the crossing is not halfway', () => {
    const point = crossing({ x: 0, value: 120 }, { x: 100, value: 220 }, colorOf)
    expect(point.value).toBeCloseTo(150, 3)
    expect(point.x).toBeCloseTo(30, 1)
  })

  it('keeps the destination point when the two values are equal', () => {
    const point = crossing({ x: 0, value: 160 }, { x: 100, value: 160 }, colorOf)
    expect(point).toEqual({ x: 100, value: 160 })
  })
})

describe('colorSegments', () => {
  const zoneFloors = [100, 150]
  const colorOf = (value: number): string =>
    value < zoneFloors[0] ? 'grey' : value < zoneFloors[1] ? 'z1' : 'z2'

  it('keeps a single piece when every point shares one colour', () => {
    const segment = [
      { x: 0, value: 160 },
      { x: 100, value: 170 },
      { x: 200, value: 180 },
    ]
    const pieces = colorSegments(segment, colorOf)
    expect(pieces).toHaveLength(1)
    expect(pieces[0].color).toBe('z2')
    expect(pieces[0].points).toEqual(segment)
  })

  it('splits a single step crossing two boundaries into three ordered pieces', () => {
    const segment = [
      { x: 0, value: 160 },
      { x: 100, value: 90 },
    ]
    const pieces = colorSegments(segment, colorOf)
    expect(pieces.map((piece) => piece.color)).toEqual(['z2', 'z1', 'grey'])
    expect(pieces[1].color).toBe('z1')
  })

  it('shares the boundary point between consecutive pieces so the line has no gap', () => {
    const segment = [
      { x: 0, value: 160 },
      { x: 100, value: 90 },
    ]
    const pieces = colorSegments(segment, colorOf)
    expect(pieces[0].points.at(-1)).toEqual(pieces[1].points[0])
    expect(pieces[1].points.at(-1)).toEqual(pieces[2].points[0])
  })
})
