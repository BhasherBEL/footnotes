import type { RunSummary } from '../types'
import type { Settings } from './settings.svelte'

export type ProfileSource = 'user' | 'files' | 'estimated' | 'none'

export type HeartValue = { value: number | null; source: ProfileSource }

export type HeartProfile = {
  maxHeartRate: HeartValue
  restingHeartRate: HeartValue
  thresholdHeartRate: HeartValue
  zoneFloors: [number, number, number, number, number] | null
  referenceHeartRate: number | null
}

const thresholdShareOfMax = 0.89
const estimatedRestingHeartRate = 60
export const zoneHrrPercentages = [50, 61, 77, 83, 89] as const

function fromFiles(runs: RunSummary[], field: keyof RunSummary['deviceProfile']): number | null {
  for (let index = runs.length - 1; index >= 0; index--) {
    const value = runs[index].deviceProfile[field]
    if (typeof value === 'number' && value > 0) return value
  }
  return null
}

function highestMaxHeartRate(runs: RunSummary[]): number | null {
  let highest = 0
  for (const run of runs) {
    if (run.maxHeartRate && run.maxHeartRate > highest) highest = run.maxHeartRate
  }
  return highest > 0 ? highest : null
}

function detect(
  chosen: number | null,
  detected: number | null,
  estimated: number | null,
): HeartValue {
  if (chosen !== null) return { value: chosen, source: 'user' }
  if (detected !== null) return { value: detected, source: 'files' }
  if (estimated !== null) return { value: estimated, source: 'estimated' }
  return { value: null, source: 'none' }
}

export function zoneFloorsOf(
  maxHeartRate: number,
  restingHeartRate: number,
): [number, number, number, number, number] {
  const reserve = maxHeartRate - restingHeartRate
  const [one, two, three, four, five] = zoneHrrPercentages.map((percent) =>
    Math.round(restingHeartRate + (percent / 100) * reserve),
  )
  return [one, two, three, four, five]
}

export function referenceHeartRateOf(floors: [number, number, number, number, number]): number {
  const middleOfZoneTwo = floors[1] + (floors[2] - floors[1]) / 2
  const rounded = Math.round(middleOfZoneTwo / 5) * 5
  return Math.min(180, Math.max(120, rounded))
}

export function heartProfile(runs: RunSummary[], settings: Settings): HeartProfile {
  const maxHeartRate = detect(
    settings.maxHeartRate,
    fromFiles(runs, 'maxHeartRate'),
    highestMaxHeartRate(runs),
  )
  const restingHeartRate = detect(
    settings.restingHeartRate,
    fromFiles(runs, 'restingHeartRate'),
    estimatedRestingHeartRate,
  )
  const thresholdHeartRate = detect(
    settings.thresholdHeartRate,
    fromFiles(runs, 'thresholdHeartRate'),
    maxHeartRate.value === null ? null : Math.round(maxHeartRate.value * thresholdShareOfMax),
  )

  const zoneFloors =
    settings.zoneFloors ??
    (maxHeartRate.value === null || restingHeartRate.value === null
      ? null
      : zoneFloorsOf(maxHeartRate.value, restingHeartRate.value))

  return {
    maxHeartRate,
    restingHeartRate,
    thresholdHeartRate,
    zoneFloors,
    referenceHeartRate:
      settings.referenceHeartRate ??
      (zoneFloors === null ? null : referenceHeartRateOf(zoneFloors)),
  }
}
