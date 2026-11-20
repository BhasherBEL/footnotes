import { describe, expect, it } from 'vitest'
import { thinRoute } from './route'
import type { RoutePoint } from '../types'

const metersPerDegreeAtEquator = 111320

function alongEquator(count: number, spacingDegrees: number): RoutePoint[] {
  return Array.from({ length: count }, (_, index) => ({
    latitude: 0,
    longitude: index * spacingDegrees,
  }))
}

function spacingInMeters(route: RoutePoint[]): number[] {
  return route.slice(1).map((point, index) => {
    const previous = route[index]
    return (point.longitude - previous.longitude) * metersPerDegreeAtEquator
  })
}

describe('thinRoute', () => {
  it('returns an empty route for empty input', () => {
    expect(thinRoute([])).toEqual([])
  })

  it('keeps a single point', () => {
    const single = { latitude: 50.8, longitude: 4.35 }
    expect(thinRoute([single])).toEqual([single])
  })

  it('keeps two nearby points as endpoints', () => {
    const first = { latitude: 0, longitude: 0 }
    const second = { latitude: 0, longitude: 0.00001 }
    expect(thinRoute([first, second])).toEqual([first, second])
  })

  it('thins evenly spaced points to the minimum spacing', () => {
    const points = alongEquator(21, 0.0001)
    const thinned = thinRoute(points)
    expect(thinned[0]).toEqual(points[0])
    expect(thinned.at(-1)).toEqual(points[20])
    expect(thinned).toHaveLength(11)
    expect(spacingInMeters(thinned).every((meters) => meters >= 12)).toBe(true)
  })

  it('caps long routes near the maximum while keeping both endpoints', () => {
    const points = alongEquator(4000, 0.001)
    const thinned = thinRoute(points)
    expect(thinned.length).toBeGreaterThan(1000)
    expect(thinned.length).toBeLessThanOrEqual(1500)
    expect(thinned[0]).toEqual(points[0])
    expect(thinned.at(-1)).toEqual(points[3999])
  })

  it('keeps first and last when every point is a duplicate', () => {
    const duplicate = { latitude: 51.2, longitude: 6.1 }
    const points = Array.from({ length: 100 }, () => ({ ...duplicate }))
    const thinned = thinRoute(points)
    expect(thinned).toHaveLength(2)
    expect(thinned[0]).toEqual(duplicate)
    expect(thinned.at(-1)).toEqual(duplicate)
  })

  it('thins a collinear line without crashing', () => {
    const points = alongEquator(200, 0.00005)
    const thinned = thinRoute(points)
    expect(thinned.length).toBeGreaterThanOrEqual(2)
    expect(thinned.length).toBeLessThan(points.length)
    expect(thinned[0]).toEqual(points[0])
    expect(thinned.at(-1)).toEqual(points[199])
  })
})
