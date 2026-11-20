import { describe, expect, it } from 'vitest'
import { countryAt, isInsideRing } from './countries'
import type { Country } from './countries'

const square: number[][] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
]

const far: number[][] = [
  [40, 40],
  [50, 40],
  [50, 50],
  [40, 50],
  [40, 40],
]

const countries: Country[] = [
  { name: 'Squareland', code: 'SQ', shapes: [[square]] },
  { name: 'Farland', code: 'FA', shapes: [[far]] },
]

describe('isInsideRing', () => {
  it('finds a point inside', () => {
    expect(isInsideRing(5, 5, square)).toBe(true)
  })

  it('rejects a point outside', () => {
    expect(isInsideRing(15, 5, square)).toBe(false)
    expect(isInsideRing(5, -5, square)).toBe(false)
  })
})

describe('countryAt', () => {
  it('resolves a coordinate to its country', () => {
    expect(countryAt(countries, 5, 5)?.code).toBe('SQ')
    expect(countryAt(countries, 45, 45)?.code).toBe('FA')
  })

  it('snaps a coastal point just outside a simplified border', () => {
    expect(countryAt(countries, 10.3, 5)?.code).toBe('SQ')
  })

  it('returns nothing in the middle of an ocean', () => {
    expect(countryAt(countries, -30, -140)).toBeNull()
  })
})
