import { describe, expect, it } from 'vitest'
import { mercatorY, tileLayout } from './tiles'

describe('mercatorY', () => {
  it('is zero at the equator', () => {
    expect(mercatorY(0)).toBe(0)
  })

  it('grows with latitude', () => {
    expect(mercatorY(48.85)).toBeGreaterThan(mercatorY(45))
    expect(mercatorY(45)).toBeGreaterThan(mercatorY(0))
    expect(mercatorY(-45)).toBeLessThan(mercatorY(0))
  })

  it('stays inside [-180, 180]', () => {
    expect(mercatorY(85.0511)).toBeLessThanOrEqual(180)
    expect(mercatorY(-85.0511)).toBeGreaterThanOrEqual(-180)
  })

  it('clamps latitudes beyond the mercator limit', () => {
    expect(mercatorY(90)).toBe(mercatorY(85.0511))
    expect(mercatorY(-90)).toBe(mercatorY(-85.0511))
  })
})

describe('tileLayout', () => {
  const paris = { originU: 2.3, originV: -48.9, scale: 6400, width: 640, height: 300 }

  it('picks a street zoom for a city-scale view', () => {
    const { zoom } = tileLayout(paris)
    expect(zoom).toBeGreaterThanOrEqual(11)
    expect(zoom).toBeLessThanOrEqual(13)
  })

  it('covers the view with one contiguous tile grid', () => {
    const { tiles } = tileLayout(paris)
    expect(tiles.length).toBeGreaterThan(0)
    expect(tiles.every((tile) => tile.size > 0)).toBe(true)

    const size = tiles[0].size
    const columns = [...new Set(tiles.map((tile) => tile.x))].sort((a, b) => a - b)
    const rows = [...new Set(tiles.map((tile) => tile.y))].sort((a, b) => a - b)
    expect(tiles.length).toBe(columns.length * rows.length)

    expect(columns[0]).toBeLessThanOrEqual(0)
    expect(columns[columns.length - 1] + size).toBeGreaterThanOrEqual(640)
    expect(rows[0]).toBeLessThanOrEqual(0)
    expect(rows[rows.length - 1] + size).toBeGreaterThanOrEqual(300)

    for (const [index, x] of columns.entries()) {
      expect(x).toBeCloseTo(columns[0] + index * size, 6)
    }
    for (const [index, y] of rows.entries()) {
      expect(y).toBeCloseTo(rows[0] + index * size, 6)
    }
  })

  it('builds osm urls with in-range tile indices', () => {
    const { zoom, tiles } = tileLayout(paris)
    expect(tiles.length).toBeGreaterThan(0)
    for (const tile of tiles) {
      const match = /^https:\/\/tile\.openstreetmap\.org\/(\d+)\/(\d+)\/(\d+)\.png$/.exec(tile.url)
      if (match === null) throw new Error(`unexpected tile url: ${tile.url}`)
      expect(Number(match[1])).toBe(zoom)
      expect(Number(match[2])).toBeGreaterThanOrEqual(0)
      expect(Number(match[2])).toBeLessThan(2 ** zoom)
      expect(Number(match[3])).toBeGreaterThanOrEqual(0)
      expect(Number(match[3])).toBeLessThan(2 ** zoom)
    }
  })

  it('lowers zoom rather than drawing more than 80 tiles', () => {
    const world = { originU: -180, originV: -180, scale: 10, width: 10000, height: 6000 }
    const initialZoom = Math.round(Math.log2((world.scale * 360) / 256))
    const { zoom, tiles } = tileLayout(world)
    expect(tiles.length).toBeLessThanOrEqual(80)
    expect(zoom).toBeLessThan(initialZoom)
  })
})
