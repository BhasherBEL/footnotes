import { describe, expect, it } from 'vitest'
import { averageBucketedDistance } from './buckets'
import type { Bucket } from './buckets'

describe('averageBucketedDistance', () => {
  it('ignores empty buckets before the first run', () => {
    const buckets: Bucket[] = [
      { start: new Date(2026, 0, 1), distance: 0, runs: 0 },
      { start: new Date(2026, 1, 1), distance: 0, runs: 0 },
      { start: new Date(2026, 2, 1), distance: 30000, runs: 3 },
      { start: new Date(2026, 3, 1), distance: 50000, runs: 5 },
    ]
    expect(averageBucketedDistance(buckets)).toBe(40000)
  })

  it('counts empty buckets after the last run in the divisor', () => {
    const buckets: Bucket[] = [
      { start: new Date(2026, 0, 1), distance: 60000, runs: 6 },
      { start: new Date(2026, 1, 1), distance: 0, runs: 0 },
      { start: new Date(2026, 2, 1), distance: 0, runs: 0 },
    ]
    expect(averageBucketedDistance(buckets)).toBe(20000)
  })

  it('returns zero when no bucket has a run', () => {
    const buckets: Bucket[] = [
      { start: new Date(2026, 0, 1), distance: 0, runs: 0 },
      { start: new Date(2026, 1, 1), distance: 0, runs: 0 },
    ]
    expect(averageBucketedDistance(buckets)).toBe(0)
  })

  it('returns zero for an empty list of buckets', () => {
    expect(averageBucketedDistance([])).toBe(0)
  })

  it('averages normally when every bucket has a run', () => {
    const buckets: Bucket[] = [
      { start: new Date(2026, 0, 1), distance: 10000, runs: 1 },
      { start: new Date(2026, 1, 1), distance: 20000, runs: 2 },
      { start: new Date(2026, 2, 1), distance: 60000, runs: 6 },
    ]
    expect(averageBucketedDistance(buckets)).toBe(30000)
  })
})
