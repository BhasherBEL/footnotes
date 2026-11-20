import type { RoutePoint, RunSummary } from '../types'
import { bestEfforts } from '../metrics/bestEfforts'
import type { EffortRecord } from '../metrics/bestEfforts'
import { trackOf, TRACK_STEP } from '../metrics/splits'
import { steadyFit } from '../metrics/steadyFit'
import { thinRoute } from '../metrics/route'
import {
  cappedMovingSeconds,
  intervalSeconds,
  maxGapSeconds,
  movingSeconds,
  pausedIntervals,
  stationaryIntervals,
} from './movingSeconds'
import type { EventLike, SpeedLike } from './movingSeconds'

export type { EventLike }

export type SessionLike = {
  startTime: Date
  sport?: string
  subSport?: string
  totalDistance?: number
  totalTimerTime?: number
  totalElapsedTime?: number
  totalAscent?: number
  avgHeartRate?: number
  maxHeartRate?: number
  startPositionLat?: number
  startPositionLong?: number
  totalStrides?: number
  trainingLoadPeak?: number
  avgGradeAdjustedSpeed?: number
}

export type RecordLike = {
  timestamp: Date
  distance?: number
  enhancedSpeed?: number
  speed?: number
  heartRate?: number
  enhancedAltitude?: number
  altitude?: number
  positionLat?: number
  positionLong?: number
  cadence?: number
  fractionalCadence?: number
}

export type LapLike = {
  startTime?: Date
  totalDistance?: number
}

export type FitData = {
  sessions: SessionLike[]
  records: RecordLike[]
  events: EventLike[]
  laps: LapLike[]
}

export type DeviceProfile = {
  maxHeartRate?: number
  thresholdHeartRate?: number
  restingHeartRate?: number
}

export type SkipReason = 'not-fit' | 'not-running' | 'too-short'

export type SummaryResult =
  { kind: 'run'; summary: RunSummary } | { kind: 'skipped'; reason: SkipReason }

const semicirclesPerDegree = 2 ** 31 / 180

function degreesOf(value: number | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const degrees = Math.abs(value) > 180 ? value / semicirclesPerDegree : value
  return Math.abs(degrees) <= 180 ? degrees : null
}

function startPosition(
  session: SessionLike,
  records: RecordLike[],
): { latitude: number | null; longitude: number | null } {
  const fromSession = {
    latitude: degreesOf(session.startPositionLat),
    longitude: degreesOf(session.startPositionLong),
  }
  if (fromSession.latitude !== null && fromSession.longitude !== null) return fromSession

  const located = records.find(
    (record) => degreesOf(record.positionLat) !== null && degreesOf(record.positionLong) !== null,
  )
  return {
    latitude: located ? degreesOf(located.positionLat) : null,
    longitude: located ? degreesOf(located.positionLong) : null,
  }
}

const minimumSeconds = 60
const minimumMeters = 200
const smoothingWindow = 5
const riseThreshold = 2

function positiveOrNull(value: number | undefined): number | null {
  return typeof value === 'number' && value > 0 ? value : null
}

function cadenceOf(record: RecordLike): number | null {
  if (typeof record.cadence !== 'number' || record.cadence <= 0) return null
  return (record.cadence + (record.fractionalCadence ?? 0)) * 2
}

const minGradeFactor = 0.8
const maxGradeFactor = 1.5
const flatMetersPerAscentMeter = 8

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function stepsOf(totalStrides: number | undefined): number | null {
  return typeof totalStrides === 'number' && totalStrides > 0 ? Math.round(totalStrides * 2) : null
}

function gradeFactorOf(
  session: SessionLike,
  distance: number,
  movingTime: number,
  ascent: number,
): number {
  if (distance <= 0) return 1
  const avgSpeed = movingTime > 0 ? distance / movingTime : 0
  if (
    typeof session.avgGradeAdjustedSpeed === 'number' &&
    session.avgGradeAdjustedSpeed > 0 &&
    avgSpeed > 0
  ) {
    return clamp(session.avgGradeAdjustedSpeed / avgSpeed, minGradeFactor, maxGradeFactor)
  }
  return clamp(
    (distance + flatMetersPerAscentMeter * ascent) / distance,
    minGradeFactor,
    maxGradeFactor,
  )
}

function runName(subSport: string | undefined): string {
  if (!subSport || subSport === 'generic') return 'run'
  return subSport.toLowerCase()
}

function heartRateSecondsOf(records: RecordLike[]): Record<number, number> {
  const seconds: Record<number, number> = {}
  for (let index = 0; index + 1 < records.length; index++) {
    const heartRate = records[index].heartRate
    if (typeof heartRate !== 'number' || heartRate <= 0) continue
    const gap = (records[index + 1].timestamp.getTime() - records[index].timestamp.getTime()) / 1000
    if (gap <= 0) continue
    const bpm = Math.round(heartRate)
    seconds[bpm] = (seconds[bpm] ?? 0) + Math.min(maxGapSeconds, gap)
  }
  return seconds
}

function positionsOf(records: RecordLike[]): RoutePoint[] {
  const positions: RoutePoint[] = []
  for (const record of records) {
    const latitude = degreesOf(record.positionLat)
    const longitude = degreesOf(record.positionLong)
    if (latitude === null || longitude === null) continue
    positions.push({ latitude, longitude })
  }
  return positions
}

function smooth(values: number[], window: number): number[] {
  const half = Math.floor(window / 2)
  return values.map((_, index) => {
    const start = Math.max(0, index - half)
    const end = Math.min(values.length, index + half + 1)
    let sum = 0
    for (let i = start; i < end; i++) sum += values[i]
    return sum / (end - start)
  })
}

function ascentFromAltitudes(values: number[]): number {
  if (values.length < 2) return 0
  const smoothed = smooth(values, smoothingWindow)
  let reference = smoothed[0]
  let total = 0
  for (const value of smoothed) {
    if (value >= reference + riseThreshold) {
      total += value - reference
      reference = value
    } else if (value < reference) {
      reference = value
    }
  }
  return Math.round(total)
}

function cleanProfile(profile: DeviceProfile): DeviceProfile {
  const cleaned: DeviceProfile = {}
  if (positiveOrNull(profile.maxHeartRate)) cleaned.maxHeartRate = profile.maxHeartRate
  if (positiveOrNull(profile.thresholdHeartRate))
    cleaned.thresholdHeartRate = profile.thresholdHeartRate
  if (positiveOrNull(profile.restingHeartRate)) cleaned.restingHeartRate = profile.restingHeartRate
  return cleaned
}

function lapBoundariesOf(laps: LapLike[]): number[] {
  const boundaries: number[] = []
  let total = 0
  for (const lap of laps) {
    if ((lap.totalDistance ?? 0) <= 0) continue
    total += lap.totalDistance as number
    boundaries.push(total)
  }
  return boundaries
}

const earthRadiusMeters = 6_371_000

function metersBetween(
  firstLatitude: number,
  firstLongitude: number,
  secondLatitude: number,
  secondLongitude: number,
): number {
  const latitudeSpan = ((secondLatitude - firstLatitude) * Math.PI) / 180
  const midLatitude = (((firstLatitude + secondLatitude) / 2) * Math.PI) / 180
  const longitudeSpan = ((secondLongitude - firstLongitude) * Math.PI * Math.cos(midLatitude)) / 180
  return earthRadiusMeters * Math.hypot(latitudeSpan, longitudeSpan)
}

function speedSamples(records: RecordLike[]): SpeedLike[] {
  const samples: SpeedLike[] = []
  let prevLatitude: number | null = null
  let prevLongitude: number | null = null
  let prevTime = 0

  for (const record of records) {
    const time = record.timestamp.getTime()
    const reported = record.enhancedSpeed ?? record.speed
    const latitude = degreesOf(record.positionLat)
    const longitude = degreesOf(record.positionLong)

    if (typeof reported === 'number') {
      samples.push({ timestamp: record.timestamp, speed: reported })
    } else if (
      latitude !== null &&
      longitude !== null &&
      prevLatitude !== null &&
      prevLongitude !== null &&
      time > prevTime
    ) {
      const seconds = (time - prevTime) / 1000
      samples.push({
        timestamp: record.timestamp,
        speed: metersBetween(prevLatitude, prevLongitude, latitude, longitude) / seconds,
      })
    } else {
      samples.push({ timestamp: record.timestamp, speed: null })
    }

    if (latitude !== null && longitude !== null) {
      prevLatitude = latitude
      prevLongitude = longitude
      prevTime = time
    }
  }

  return samples
}

export function summarize(fit: FitData, deviceProfile: DeviceProfile, id: string): SummaryResult {
  const session = fit.sessions.find((candidate) => candidate.sport === 'running')
  if (!session) return { kind: 'skipped', reason: 'not-running' }

  const distance = session.totalDistance ?? 0
  const timerTime = session.totalTimerTime ?? 0
  const elapsedTime = session.totalElapsedTime ?? timerTime
  if (timerTime < minimumSeconds || distance < minimumMeters) {
    return { kind: 'skipped', reason: 'too-short' }
  }

  const startMs = session.startTime.getTime()
  const endMs =
    typeof session.totalElapsedTime === 'number'
      ? startMs + session.totalElapsedTime * 1000
      : Number.POSITIVE_INFINITY
  const inSession = fit.records.filter((record) => {
    const time = record.timestamp.getTime()
    return time >= startMs && time <= endMs
  })

  const timerEvents = fit.events.filter((event) => event.event === 'timer')
  const pauses = timerEvents.length > 0 ? pausedIntervals(timerEvents, startMs, endMs) : []
  const stationary =
    timerEvents.length > 0 ? stationaryIntervals(speedSamples(inSession), pauses) : []
  const seconds =
    timerEvents.length > 0
      ? movingSeconds(inSession, startMs, [...pauses, ...stationary])
      : cappedMovingSeconds(inSession)
  const movingTime = Math.max(0, timerTime - intervalSeconds(stationary))

  const heartRateSeconds = heartRateSecondsOf(inSession)
  const effortRecords: EffortRecord[] = []
  inSession.forEach((record, index) => {
    if (typeof record.distance === 'number') {
      effortRecords.push({
        seconds: seconds[index],
        distance: record.distance,
        heartRate: positiveOrNull(record.heartRate),
        altitude: record.enhancedAltitude ?? record.altitude ?? null,
        cadence: cadenceOf(record),
      })
    }
  })
  const position = startPosition(session, inSession)
  const positions = positionsOf(inSession)
  const altitudes = inSession
    .map((record) => record.enhancedAltitude ?? record.altitude)
    .filter((value): value is number => typeof value === 'number')
  const ascent =
    typeof session.totalAscent === 'number' ? session.totalAscent : ascentFromAltitudes(altitudes)

  return {
    kind: 'run',
    summary: {
      id,
      startTime: session.startTime.toISOString(),
      sport: 'running',
      subSport: session.subSport ?? 'generic',
      name: runName(session.subSport),
      distance,
      movingTime,
      elapsedTime,
      ascent,
      avgHeartRate: positiveOrNull(session.avgHeartRate),
      maxHeartRate: positiveOrNull(session.maxHeartRate),
      heartRateSeconds,
      bestEfforts: bestEfforts(effortRecords),
      splitTrack: trackOf(effortRecords, TRACK_STEP),
      route: thinRoute(positions),
      lapBoundaries: lapBoundariesOf(fit.laps),
      startLatitude: position.latitude,
      startLongitude: position.longitude,
      steadyHeartRateFit: steadyFit(
        inSession.map((record, index) => ({
          seconds: seconds[index],
          speed: record.enhancedSpeed ?? record.speed ?? null,
          heartRate: record.heartRate ?? null,
        })),
        movingTime,
      ),
      deviceProfile: cleanProfile(deviceProfile),
      steps: stepsOf(session.totalStrides),
      trainingLoad: positiveOrNull(session.trainingLoadPeak),
      gradeFactor: gradeFactorOf(session, distance, movingTime, ascent),
    },
  }
}
