import { describe, expect, it } from 'vitest'
import { bestEffort, bestEfforts } from './bestEfforts'
import type { EffortRecord } from './bestEfforts'

function steadyRun(meters: number, speed: number, step = 10): EffortRecord[] {
  const records: EffortRecord[] = []
  for (let distance = 0; distance <= meters; distance += speed * step) {
    records.push({
      seconds: distance / speed,
      distance,
      heartRate: null,
      altitude: null,
      cadence: null,
    })
  }
  return records
}

describe('bestEffort', () => {
  it('times one kilometre of a steady run', () => {
    expect(bestEffort(steadyRun(2000, 4), 1000)).toBeCloseTo(250, 6)
  })

  it('returns null when the run never covers the distance', () => {
    expect(bestEffort(steadyRun(2000, 4), 5000)).toBeNull()
  })

  it('finds the fast window, not the first or the last one', () => {
    const records: EffortRecord[] = [
      { seconds: 0, distance: 0, heartRate: null, altitude: null, cadence: null },
    ]
    let seconds = 0
    let distance = 0
    const speeds = [3, 3, 5, 3]
    for (const speed of speeds) {
      for (let step = 0; step < 100; step++) {
        seconds += 10
        distance += speed * 10
        records.push({ seconds, distance, heartRate: null, altitude: null, cadence: null })
      }
    }
    expect(bestEffort(records, 1000)).toBeCloseTo(200, 6)
  })

  it('interpolates between samples', () => {
    const records = steadyRun(3000, 4, 60)
    expect(bestEffort(records, 1000)).toBeCloseTo(250, 6)
  })

  it('survives repeated distances and short arrays', () => {
    const stalled: EffortRecord[] = [
      { seconds: 0, distance: 0, heartRate: null, altitude: null, cadence: null },
      { seconds: 10, distance: 0, heartRate: null, altitude: null, cadence: null },
      { seconds: 20, distance: 500, heartRate: null, altitude: null, cadence: null },
      { seconds: 30, distance: 1000, heartRate: null, altitude: null, cadence: null },
    ]
    expect(bestEffort(stalled, 1000)).toBeCloseTo(20, 6)
    expect(bestEffort([], 1000)).toBeNull()
    expect(
      bestEffort(
        [{ seconds: 0, distance: 0, heartRate: null, altitude: null, cadence: null }],
        1000,
      ),
    ).toBeNull()
  })
})

describe('bestEfforts', () => {
  it('only reports distances the run covered', () => {
    const efforts = bestEfforts(steadyRun(6000, 4))
    expect(Object.keys(efforts)).toEqual(['400', '1k', '5k'])
    expect(efforts['400']).toBeCloseTo(100, 6)
    expect(efforts['1k']).toBeCloseTo(250, 6)
    expect(efforts['5k']).toBeCloseTo(1250, 6)
    expect(efforts['10k']).toBeUndefined()
    expect(efforts.half).toBeUndefined()
    expect(efforts.marathon).toBeUndefined()
  })
})
