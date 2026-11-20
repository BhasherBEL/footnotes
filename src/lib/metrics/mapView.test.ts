import { describe, expect, it } from 'vitest'
import { WORLD_BOUNDS, boundsOf, clusterPoints, heatLevelOf } from './mapView'

describe('boundsOf', () => {
  it('returns the whole world with no points', () => {
    expect(boundsOf([])).toEqual(WORLD_BOUNDS)
  })

  it('grows a single point to the minimum span, centred on it', () => {
    const bounds = boundsOf([{ latitude: 45, longitude: 2 }])
    expect(bounds.east - bounds.west).toBe(4)
    expect(bounds.north - bounds.south).toBe(3)
    expect((bounds.east + bounds.west) / 2).toBeCloseTo(2)
    expect((bounds.north + bounds.south) / 2).toBeCloseTo(45)
  })

  it('wraps a margin around two far-apart points', () => {
    const bounds = boundsOf([
      { latitude: 10, longitude: -70 },
      { latitude: 50, longitude: 20 },
    ])
    const longitudeSpan = 20 - -70
    const latitudeSpan = 50 - 10
    expect(bounds.west).toBeCloseTo(-70 - longitudeSpan * 0.25)
    expect(bounds.east).toBeCloseTo(20 + longitudeSpan * 0.25)
    expect(bounds.south).toBeCloseTo(10 - latitudeSpan * 0.25)
    expect(bounds.north).toBeCloseTo(50 + latitudeSpan * 0.25)
  })

  it('shifts a box near the date line back inside the world instead of shrinking it', () => {
    const bounds = boundsOf([{ latitude: 0, longitude: 179 }])
    expect(bounds.east - bounds.west).toBe(4)
    expect(bounds.east).toBeLessThanOrEqual(WORLD_BOUNDS.east)
    expect(bounds.west).toBeGreaterThanOrEqual(WORLD_BOUNDS.west)
  })

  it('shifts a box near a pole back inside the world instead of shrinking it', () => {
    const bounds = boundsOf([{ latitude: 83, longitude: 0 }])
    expect(bounds.north - bounds.south).toBe(3)
    expect(bounds.north).toBeLessThanOrEqual(WORLD_BOUNDS.north)
    expect(bounds.south).toBeGreaterThanOrEqual(WORLD_BOUNDS.south)
  })
})

describe('clusterPoints', () => {
  it('returns no clusters for no points', () => {
    expect(clusterPoints([], 0.1)).toEqual([])
  })

  it('keeps a lone point as its own cluster', () => {
    expect(clusterPoints([{ latitude: 50.84, longitude: 4.35 }], 0.01)).toEqual([
      { latitude: 50.84, longitude: 4.35, count: 1 },
    ])
  })

  it('merges points in the same cell into one cluster at their centroid', () => {
    const clusters = clusterPoints(
      [
        { latitude: 50.81, longitude: 4.31 },
        { latitude: 50.84, longitude: 4.34 },
        { latitude: 50.87, longitude: 4.37 },
      ],
      0.1,
    )
    expect(clusters).toHaveLength(1)
    expect(clusters[0].count).toBe(3)
    expect(clusters[0].latitude).toBeCloseTo(50.84)
    expect(clusters[0].longitude).toBeCloseTo(4.34)
  })

  it('keeps far apart points in separate clusters', () => {
    const clusters = clusterPoints(
      [
        { latitude: 50.84, longitude: 4.35 },
        { latitude: 48.85, longitude: 2.35 },
      ],
      0.1,
    )
    expect(clusters).toHaveLength(2)
    expect(clusters.every((cluster) => cluster.count === 1)).toBe(true)
    expect(clusters.map((cluster) => cluster.latitude).sort()).toEqual([48.85, 50.84])
  })

  it('splits points that drift beyond one cell', () => {
    const clusters = clusterPoints(
      [
        { latitude: 50.84, longitude: 4.35 },
        { latitude: 50.85, longitude: 4.35 },
        { latitude: 51.05, longitude: 4.35 },
      ],
      0.1,
    )
    expect(clusters).toHaveLength(2)
    expect(clusters.some((cluster) => cluster.count === 2)).toBe(true)
    expect(clusters.some((cluster) => cluster.count === 1)).toBe(true)
  })
})

describe('heatLevelOf', () => {
  it('is 0 with no runs', () => {
    expect(heatLevelOf(0, 40)).toBe(0)
  })

  it('is 1 for a single run out of 40', () => {
    expect(heatLevelOf(1, 40)).toBe(1)
  })

  it('is 2 for about 6 runs out of 40', () => {
    expect(heatLevelOf(6, 40)).toBe(2)
  })

  it('is 3 for about 20 runs out of 40', () => {
    expect(heatLevelOf(20, 40)).toBe(3)
  })

  it('is 4 for the busiest country', () => {
    expect(heatLevelOf(40, 40)).toBe(4)
  })
})
