import type { RunSummary } from '../types'

export type Zone = { index: number; floor: number; ceiling: number | null; seconds: number }

export function totalHeartRateSeconds(runs: RunSummary[]): Record<number, number> {
  const total: Record<number, number> = {}
  for (const run of runs) {
    for (const [bpm, seconds] of Object.entries(run.heartRateSeconds)) {
      const key = Number(bpm)
      total[key] = (total[key] ?? 0) + seconds
    }
  }
  return total
}

export function zoneOf(
  heartRate: number,
  floors: [number, number, number, number, number],
): number {
  for (let index = floors.length - 1; index >= 0; index--) {
    if (heartRate >= floors[index]) return index + 1
  }
  return 0
}

export function zonesOf(
  heartRateSeconds: Record<number, number>,
  floors: [number, number, number, number, number],
): Zone[] {
  const zones: Zone[] = [
    { index: 1, floor: floors[0], ceiling: floors[1] - 1, seconds: 0 },
    { index: 2, floor: floors[1], ceiling: floors[2] - 1, seconds: 0 },
    { index: 3, floor: floors[2], ceiling: floors[3] - 1, seconds: 0 },
    { index: 4, floor: floors[3], ceiling: floors[4] - 1, seconds: 0 },
    { index: 5, floor: floors[4], ceiling: null, seconds: 0 },
  ]
  for (const [bpm, seconds] of Object.entries(heartRateSeconds)) {
    const zoneIndex = zoneOf(Number(bpm), floors)
    if (zoneIndex === 0) continue
    zones[zoneIndex - 1].seconds += seconds
  }
  return zones
}

export function easyShare(zones: Zone[]): number {
  const total = zones.reduce((sum, zone) => sum + zone.seconds, 0)
  if (total === 0) return 0
  return (zones[0].seconds + zones[1].seconds) / total
}

export function heartRateFloor(
  values: number[],
  floors: [number, number, number, number, number] | null,
): number | null {
  if (values.length < 20) return null
  const sorted = [...values].sort((a, b) => a - b)
  const p2 = sorted[Math.floor(sorted.length * 0.02)]
  if (floors === null) return p2
  return Math.min(p2, floors[0] - 5)
}
