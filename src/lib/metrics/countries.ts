export type Country = { name: string; code: string; shapes: number[][][][] }

export type CountryRuns = {
  code: string
  name: string
  runs: number
  distance: number
}

export function isInsideRing(longitude: number, latitude: number, ring: number[][]): boolean {
  let inside = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [x1, y1] = ring[index]
    const [x2, y2] = ring[previous]
    const crosses = y1 > latitude !== y2 > latitude
    if (crosses && longitude < ((x2 - x1) * (latitude - y1)) / (y2 - y1) + x1) inside = !inside
  }
  return inside
}

export function countryAt(
  countries: Country[],
  latitude: number,
  longitude: number,
): Country | null {
  for (const country of countries) {
    for (const shape of country.shapes) {
      if (isInsideRing(longitude, latitude, shape[0])) return country
    }
  }
  return nearestCountry(countries, latitude, longitude)
}

function squaredDistanceToSegment(
  x: number,
  y: number,
  [x1, y1]: number[],
  [x2, y2]: number[],
): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const lengthSquared = dx * dx + dy * dy
  const along =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared))
  const offsetX = x - (x1 + along * dx)
  const offsetY = y - (y1 + along * dy)
  return offsetX * offsetX + offsetY * offsetY
}

const snapDegrees = 1

function nearestCountry(countries: Country[], latitude: number, longitude: number): Country | null {
  let best: Country | null = null
  let bestDistance = snapDegrees * snapDegrees
  for (const country of countries) {
    for (const shape of country.shapes) {
      const ring = shape[0]
      for (let index = 1; index < ring.length; index++) {
        const distance = squaredDistanceToSegment(longitude, latitude, ring[index - 1], ring[index])
        if (distance < bestDistance) {
          bestDistance = distance
          best = country
        }
      }
    }
  }
  return best
}
