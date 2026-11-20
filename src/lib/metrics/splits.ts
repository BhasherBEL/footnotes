import type { EffortRecord } from './bestEfforts'
import { maxGapSeconds } from '../fit/movingSeconds'
import type { Split, TrackPoint } from '../types'

export const TRACK_STEP = 25

function interpolateSeconds(
  previousDistance: number,
  currentDistance: number,
  mark: number,
  previousSeconds: number,
  currentSeconds: number,
): number {
  const segment = currentDistance - previousDistance
  const fraction = segment > 0 ? (mark - previousDistance) / segment : 0
  return previousSeconds + fraction * (currentSeconds - previousSeconds)
}

function interpolateAltitude(
  previousDistance: number,
  currentDistance: number,
  mark: number,
  previousAltitude: number | null,
  currentAltitude: number | null,
): number | null {
  if (previousAltitude === null || currentAltitude === null) return null
  const segment = currentDistance - previousDistance
  const fraction = segment > 0 ? (mark - previousDistance) / segment : 0
  return previousAltitude + fraction * (currentAltitude - previousAltitude)
}

function addSeconds(
  histogram: Record<number, number>,
  bpm: number,
  seconds: number,
): Record<number, number> {
  histogram[bpm] = (histogram[bpm] ?? 0) + seconds
  return histogram
}

export function trackOf(records: EffortRecord[], step: number): TrackPoint[] {
  if (records.length < 2 || step <= 0) return []

  const track: TrackPoint[] = [
    {
      meters: records[0].distance,
      seconds: records[0].seconds,
      heartRateSeconds: {},
      altitude: records[0].altitude,
      cadence: records[0].cadence,
    },
  ]
  let mark = step
  let histogram: Record<number, number> = {}
  let cadenceSum = 0
  let cadenceSeconds = 0

  for (let index = 1; index < records.length; index++) {
    const previous = records[index - 1]
    const current = records[index]
    const gapSeconds = Math.min(maxGapSeconds, current.seconds - previous.seconds)
    if (gapSeconds > 0 && previous.heartRate !== null) {
      addSeconds(histogram, Math.round(previous.heartRate), gapSeconds)
    }
    if (gapSeconds > 0 && previous.cadence !== null) {
      cadenceSum += previous.cadence * gapSeconds
      cadenceSeconds += gapSeconds
    }
    while (current.distance >= mark) {
      track.push({
        meters: mark,
        seconds: interpolateSeconds(
          previous.distance,
          current.distance,
          mark,
          previous.seconds,
          current.seconds,
        ),
        heartRateSeconds: histogram,
        altitude: interpolateAltitude(
          previous.distance,
          current.distance,
          mark,
          previous.altitude,
          current.altitude,
        ),
        cadence: cadenceSeconds > 0 ? cadenceSum / cadenceSeconds : null,
      })
      histogram = {}
      cadenceSum = 0
      cadenceSeconds = 0
      mark += step
    }
  }

  const last = records[records.length - 1]
  if (last.distance - track[track.length - 1].meters > 1) {
    track.push({
      meters: last.distance,
      seconds: last.seconds,
      heartRateSeconds: histogram,
      altitude: last.altitude,
      cadence: cadenceSeconds > 0 ? cadenceSum / cadenceSeconds : null,
    })
  }
  return track
}

function secondsAt(track: TrackPoint[], mark: number): number {
  let index = 1
  while (index < track.length && track[index].meters < mark) index++
  const previous = track[Math.max(0, index - 1)]
  const current = track[Math.min(track.length - 1, index)]
  return interpolateSeconds(
    previous.meters,
    current.meters,
    mark,
    previous.seconds,
    current.seconds,
  )
}

function histogramInRange(track: TrackPoint[], start: number, end: number): Record<number, number> {
  const histogram: Record<number, number> = {}
  for (const point of track) {
    if (point.meters <= start || point.meters > end) continue
    for (const [bpm, seconds] of Object.entries(point.heartRateSeconds)) {
      addSeconds(histogram, Number(bpm), seconds)
    }
  }
  return histogram
}

export function heartRateOf(histogram: Record<number, number>): number | null {
  let totalSeconds = 0
  let weightedBeats = 0
  for (const [bpm, seconds] of Object.entries(histogram)) {
    totalSeconds += seconds
    weightedBeats += Number(bpm) * seconds
  }
  return totalSeconds > 0 ? Math.round(weightedBeats / totalSeconds) : null
}

export function splitsAt(track: TrackPoint[], boundaries: number[]): Split[] {
  if (track.length === 0) return []

  const lastPoint = track[track.length - 1]
  const splits: Split[] = []
  let previousBoundary = 0
  let previousSeconds = track[0].seconds

  for (const boundary of boundaries) {
    if (boundary > lastPoint.meters) break
    const seconds = secondsAt(track, boundary)
    const histogram = histogramInRange(track, previousBoundary, boundary)
    splits.push({
      meters: boundary - previousBoundary,
      seconds: seconds - previousSeconds,
      heartRate: heartRateOf(histogram),
      heartRateSeconds: histogram,
    })
    previousBoundary = boundary
    previousSeconds = seconds
  }

  const remainder = lastPoint.meters - previousBoundary
  if (remainder > 1) {
    const histogram = histogramInRange(track, previousBoundary, lastPoint.meters)
    splits.push({
      meters: remainder,
      seconds: lastPoint.seconds - previousSeconds,
      heartRate: heartRateOf(histogram),
      heartRateSeconds: histogram,
    })
  }

  return splits
}

export function splitsEvery(track: TrackPoint[], step: number): Split[] {
  if (track.length === 0 || step <= 0) return []

  const lastPoint = track[track.length - 1]
  const boundaries: number[] = []
  for (let mark = step; mark <= lastPoint.meters; mark += step) boundaries.push(mark)
  return splitsAt(track, boundaries)
}
