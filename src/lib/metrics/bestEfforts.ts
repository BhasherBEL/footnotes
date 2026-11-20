import { EFFORT_METERS, type EffortDistance } from '../types'

export type EffortRecord = {
  seconds: number
  distance: number
  heartRate: number | null
  altitude: number | null
  cadence: number | null
}

export function bestEffort(records: EffortRecord[], meters: number): number | null {
  if (records.length < 2) return null
  if (records[records.length - 1].distance - records[0].distance < meters) return null

  let best: number | null = null
  let start = 0
  for (let end = 1; end < records.length; end++) {
    while (start + 1 < end && records[end].distance - records[start + 1].distance >= meters) {
      start++
    }
    if (records[end].distance - records[start].distance < meters) continue

    const segment = records[start + 1].distance - records[start].distance
    const entry = records[end].distance - meters
    const fraction = segment > 0 ? (entry - records[start].distance) / segment : 0
    const startSeconds =
      records[start].seconds + fraction * (records[start + 1].seconds - records[start].seconds)
    const candidate = records[end].seconds - startSeconds
    if (best === null || candidate < best) best = candidate
  }
  return best
}

export function bestEfforts(records: EffortRecord[]): Partial<Record<EffortDistance, number>> {
  const efforts: Partial<Record<EffortDistance, number>> = {}
  for (const key of Object.keys(EFFORT_METERS) as EffortDistance[]) {
    const seconds = bestEffort(records, EFFORT_METERS[key])
    if (seconds !== null) efforts[key] = seconds
  }
  return efforts
}
