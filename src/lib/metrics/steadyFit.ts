import type { SteadyFit } from '../types'

export type SteadyRecord = { seconds: number; speed: number | null; heartRate: number | null }

type Bin = { speed: number; heartRate: number }

const minimumMovingTime = 900
const warmupSeconds = 300
const minimumSpeed = 1.5
const binSeconds = 60
const minimumBins = 6
const speedTolerance = 0.35
const minimumHeartRateSpan = 8

function averageBins(records: SteadyRecord[]): Bin[] {
  const groups = new Map<number, { speed: number; heartRate: number; count: number }>()
  for (const record of records) {
    const key = Math.floor(record.seconds / binSeconds)
    const group = groups.get(key) ?? { speed: 0, heartRate: 0, count: 0 }
    group.speed += record.speed as number
    group.heartRate += record.heartRate as number
    group.count++
    groups.set(key, group)
  }
  return [...groups.values()].map((group) => ({
    speed: group.speed / group.count,
    heartRate: group.heartRate / group.count,
  }))
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[middle]
  return (sorted[middle - 1] + sorted[middle]) / 2
}

function fitLine(bins: Bin[]): { intercept: number; slope: number } | null {
  const meanHeartRate = bins.reduce((sum, bin) => sum + bin.heartRate, 0) / bins.length
  const meanSpeed = bins.reduce((sum, bin) => sum + bin.speed, 0) / bins.length
  let covariance = 0
  let variance = 0
  for (const bin of bins) {
    const offset = bin.heartRate - meanHeartRate
    covariance += offset * (bin.speed - meanSpeed)
    variance += offset * offset
  }
  if (variance === 0) return null
  const slope = covariance / variance
  return { slope, intercept: meanSpeed - slope * meanHeartRate }
}

export function steadyFit(records: SteadyRecord[], movingTime: number): SteadyFit | null {
  if (movingTime < minimumMovingTime) return null

  const usable = records.filter(
    (record) =>
      record.seconds >= warmupSeconds &&
      record.heartRate !== null &&
      record.heartRate > 0 &&
      record.speed !== null &&
      record.speed > minimumSpeed,
  )
  const bins = averageBins(usable)
  if (bins.length < minimumBins) return null

  const middleSpeed = median(bins.map((bin) => bin.speed))
  const steady = bins.filter(
    (bin) =>
      bin.speed >= middleSpeed * (1 - speedTolerance) &&
      bin.speed <= middleSpeed * (1 + speedTolerance),
  )
  if (steady.length < minimumBins) return null

  const heartRates = steady.map((bin) => bin.heartRate)
  const minHeartRate = Math.min(...heartRates)
  const maxHeartRate = Math.max(...heartRates)
  if (maxHeartRate - minHeartRate < minimumHeartRateSpan) return null

  const line = fitLine(steady)
  if (line === null || line.slope <= 0) return null

  return {
    intercept: line.intercept,
    slope: line.slope,
    minHeartRate,
    maxHeartRate,
  }
}
