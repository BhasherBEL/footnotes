export type MapPoint = { latitude: number; longitude: number }
export type Bounds = { west: number; east: number; south: number; north: number }
export type Cluster = { latitude: number; longitude: number; count: number }

export const WORLD_BOUNDS: Bounds = { west: -180, east: 180, south: -56, north: 84 }

const MARGIN_RATIO = 0.25
const MINIMUM_LONGITUDE_SPAN = 4
const MINIMUM_LATITUDE_SPAN = 3

function widen(min: number, max: number, minimumSpan: number): [number, number] {
  const span = max - min
  const margin = span * MARGIN_RATIO
  let low = min - margin
  let high = max + margin
  const widenedSpan = high - low
  if (widenedSpan < minimumSpan) {
    const center = (low + high) / 2
    low = center - minimumSpan / 2
    high = center + minimumSpan / 2
  }
  return [low, high]
}

function clampAxis(low: number, high: number, floor: number, ceiling: number): [number, number] {
  const span = high - low
  const worldSpan = ceiling - floor
  if (span >= worldSpan) return [floor, ceiling]
  let clampedLow = low
  let clampedHigh = high
  if (clampedLow < floor) {
    clampedLow = floor
    clampedHigh = floor + span
  }
  if (clampedHigh > ceiling) {
    clampedHigh = ceiling
    clampedLow = ceiling - span
  }
  return [clampedLow, clampedHigh]
}

export function boundsOf(points: MapPoint[]): Bounds {
  if (points.length === 0) return WORLD_BOUNDS

  let west = points[0].longitude
  let east = points[0].longitude
  let south = points[0].latitude
  let north = points[0].latitude
  for (const point of points) {
    west = Math.min(west, point.longitude)
    east = Math.max(east, point.longitude)
    south = Math.min(south, point.latitude)
    north = Math.max(north, point.latitude)
  }

  const [widenedWest, widenedEast] = widen(west, east, MINIMUM_LONGITUDE_SPAN)
  const [widenedSouth, widenedNorth] = widen(south, north, MINIMUM_LATITUDE_SPAN)

  const [clampedWest, clampedEast] = clampAxis(
    widenedWest,
    widenedEast,
    WORLD_BOUNDS.west,
    WORLD_BOUNDS.east,
  )
  const [clampedSouth, clampedNorth] = clampAxis(
    widenedSouth,
    widenedNorth,
    WORLD_BOUNDS.south,
    WORLD_BOUNDS.north,
  )

  return { west: clampedWest, east: clampedEast, south: clampedSouth, north: clampedNorth }
}

export function heatLevelOf(runs: number, highest: number): number {
  if (runs <= 0) return 0
  const ratio = Math.log1p(runs) / Math.log1p(Math.max(runs, highest))
  return Math.min(4, 1 + Math.floor(ratio * 3))
}

export function clusterPoints(points: MapPoint[], cell: number): Cluster[] {
  const groups = new Map<string, { latitude: number; longitude: number; count: number }>()
  for (const point of points) {
    const key = `${Math.floor(point.longitude / cell)}:${Math.floor(point.latitude / cell)}`
    const group = groups.get(key)
    if (group) {
      group.latitude += point.latitude
      group.longitude += point.longitude
      group.count += 1
    } else {
      groups.set(key, { ...point, count: 1 })
    }
  }

  const clusters: Cluster[] = []
  for (const group of groups.values()) {
    clusters.push({
      latitude: group.latitude / group.count,
      longitude: group.longitude / group.count,
      count: group.count,
    })
  }
  return clusters
}
