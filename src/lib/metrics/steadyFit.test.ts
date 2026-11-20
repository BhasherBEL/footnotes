import { describe, expect, it } from 'vitest'
import { steadyFit } from './steadyFit'
import type { SteadyRecord } from './steadyFit'

function steadyRun(
  minutes: number,
  speedAt: (minute: number) => number,
  heartRateAt: (minute: number) => number = (minute) => 130 + minute * 0.5,
): SteadyRecord[] {
  const records: SteadyRecord[] = []
  for (let second = 0; second < minutes * 60; second++) {
    const minute = Math.floor(second / 60)
    records.push({ seconds: second, speed: speedAt(minute), heartRate: heartRateAt(minute) })
  }
  return records
}

describe('steadyFit', () => {
  it('recovers a linear speed to heart-rate relation', () => {
    const records = steadyRun(40, (minute) => 2.5 + (130 + minute * 0.5) * 0.01)
    const fit = steadyFit(records, 2400)
    expect(fit).not.toBeNull()
    expect(fit!.slope).toBeCloseTo(0.01, 6)
    expect(fit!.intercept).toBeCloseTo(2.5, 5)
    expect(fit!.minHeartRate).toBeCloseTo(132.5, 6)
    expect(fit!.maxHeartRate).toBeCloseTo(149.5, 6)
  })

  it('ignores runs shorter than fifteen minutes', () => {
    const records = steadyRun(40, (minute) => 2.5 + (130 + minute * 0.5) * 0.01)
    expect(steadyFit(records, 800)).toBeNull()
  })

  it('accepts a sixteen-minute run between the old and new floor', () => {
    const records = steadyRun(
      16,
      (minute) => 2.5 + (130 + minute) * 0.01,
      (minute) => 130 + minute,
    )
    expect(steadyFit(records, 960)).not.toBeNull()
  })

  it('ignores runs without heart rate', () => {
    const records = steadyRun(40, () => 3).map((record) => ({ ...record, heartRate: null }))
    expect(steadyFit(records, 2400)).toBeNull()
  })

  it('needs at least six bins after the warm-up', () => {
    const records = steadyRun(9, (minute) => 2.5 + (130 + minute * 0.5) * 0.01)
    expect(steadyFit(records, 2400)).toBeNull()
  })

  it('drops a fit whose speed falls as heart rate rises', () => {
    const records = steadyRun(40, (minute) => 4 - (130 + minute * 0.5) * 0.01)
    expect(steadyFit(records, 2400)).toBeNull()
  })

  it('drops bins that are far from the median speed', () => {
    const records = steadyRun(40, (minute) => (minute === 39 ? 9 : 3))
    expect(steadyFit(records, 2400)).toBeNull()
  })

  it('rejects a fit whose steady bins span fewer than eight beats per minute', () => {
    const records = steadyRun(
      40,
      (minute) => 2.5 + (140 + minute * 0.05) * 0.01,
      (minute) => 140 + minute * 0.05,
    )
    expect(steadyFit(records, 2400)).toBeNull()
  })
})
