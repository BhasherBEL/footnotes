export type EffortDistance = '400' | '1k' | '5k' | '10k' | 'half' | 'marathon'

export type SteadyFit = {
  intercept: number
  slope: number
  minHeartRate: number
  maxHeartRate: number
}

export type Split = {
  meters: number
  seconds: number
  heartRate: number | null
  heartRateSeconds: Record<number, number>
}
export type RoutePoint = { latitude: number; longitude: number }

export type TrackPoint = {
  meters: number
  seconds: number
  heartRateSeconds: Record<number, number>
  altitude: number | null
  cadence: number | null
}

export type RunSummary = {
  id: string
  startTime: string
  sport: 'running'
  subSport: string
  name: string
  distance: number
  movingTime: number
  elapsedTime: number
  ascent: number
  avgHeartRate: number | null
  maxHeartRate: number | null
  heartRateSeconds: Record<number, number>
  bestEfforts: Partial<Record<EffortDistance, number>>
  steadyHeartRateFit: SteadyFit | null
  splitTrack: TrackPoint[]
  route: RoutePoint[]
  lapBoundaries: number[]
  startLatitude: number | null
  startLongitude: number | null
  deviceProfile: { maxHeartRate?: number; thresholdHeartRate?: number; restingHeartRate?: number }
  steps: number | null
  trainingLoad: number | null
  gradeFactor: number
}

export type Units = 'km' | 'mi'

export type Language = 'en' | 'fr'

export const EFFORT_METERS: Record<EffortDistance, number> = {
  '400': 400,
  '1k': 1000,
  '5k': 5000,
  '10k': 10000,
  half: 21097.5,
  marathon: 42195,
}
