import type { RoutePoint } from '../types'

const minimumSpacingMeters = 12
const maximumPoints = 1500

function isFarEnough(point: RoutePoint, last: RoutePoint): boolean {
  const dx = (point.longitude - last.longitude) * 111320 * Math.cos((last.latitude * Math.PI) / 180)
  const dy = (point.latitude - last.latitude) * 110540
  return dx * dx + dy * dy >= minimumSpacingMeters * minimumSpacingMeters
}

function capRoute(route: RoutePoint[]): RoutePoint[] {
  if (route.length <= maximumPoints) return route
  const stride = Math.ceil(route.length / maximumPoints)
  const last = route.length - 1
  const sampled: RoutePoint[] = []
  for (let index = 0; index < last; index += stride) sampled.push(route[index])
  sampled.push(route[last])
  return sampled
}

export function thinRoute(points: RoutePoint[]): RoutePoint[] {
  if (points.length <= 2) return [...points]

  const kept: RoutePoint[] = [points[0]]
  for (let index = 1; index + 1 < points.length; index++) {
    if (isFarEnough(points[index], kept[kept.length - 1])) kept.push(points[index])
  }
  kept.push(points[points.length - 1])
  return capRoute(kept)
}
