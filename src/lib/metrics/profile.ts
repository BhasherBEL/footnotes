import type { TrackPoint } from '../types'
import { heartRateOf } from './splits'

export type ProfilePoint = { x: number; value: number | null }

export function heartRateProfile(track: TrackPoint[]): ProfilePoint[] {
  return track.map((point) => ({
    x: point.meters,
    value: heartRateOf(point.heartRateSeconds),
  }))
}

export const SPEED_BASELINE_METERS = 100

function lastAtOrBelow(track: TrackPoint[], meters: number): TrackPoint {
  let result = track[0]
  for (const point of track) {
    if (point.meters > meters) break
    result = point
  }
  return result
}

function firstAtOrAbove(track: TrackPoint[], meters: number): TrackPoint {
  for (const point of track) {
    if (point.meters >= meters) return point
  }
  return track[track.length - 1]
}

export function speedProfile(track: TrackPoint[]): ProfilePoint[] {
  const half = SPEED_BASELINE_METERS / 2
  return track.map((point) => {
    const before = lastAtOrBelow(track, point.meters - half)
    const after = firstAtOrAbove(track, point.meters + half)
    const seconds = after.seconds - before.seconds
    const meters = after.meters - before.meters
    return { x: point.meters, value: seconds > 0 ? meters / seconds : null }
  })
}

export function elevationProfile(track: TrackPoint[]): ProfilePoint[] {
  return track.map((point) => ({ x: point.meters, value: point.altitude }))
}

export function cadenceProfile(track: TrackPoint[]): ProfilePoint[] {
  return track.map((point) => ({ x: point.meters, value: point.cadence }))
}

export function smoothProfile(
  points: ProfilePoint[],
  window: number,
): { x: number; value: number }[] {
  const half = Math.floor(window / 2)
  const smoothed: { x: number; value: number }[] = []
  for (let index = 0; index < points.length; index++) {
    const start = Math.max(0, index - half)
    const end = Math.min(points.length, index + half + 1)
    let weightedSum = 0
    let weightSum = 0
    for (let i = start; i < end; i++) {
      const value = points[i].value
      if (value === null) continue
      const weight = half + 1 - Math.abs(i - index)
      weightedSum += value * weight
      weightSum += weight
    }
    if (weightSum > 0) smoothed.push({ x: points[index].x, value: weightedSum / weightSum })
  }
  return smoothed
}
