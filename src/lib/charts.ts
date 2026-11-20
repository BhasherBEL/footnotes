const stepFactors = [1, 2, 2.5, 5, 10, 20, 25, 50, 100]

function clean(value: number): number {
  return Number(value.toPrecision(12))
}

export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [0, 1]

  const magnitude = Math.pow(10, Math.floor(Math.log10((max - min) / Math.max(1, count - 1))))
  for (const factor of stepFactors) {
    const step = factor * magnitude
    const first = Math.floor(min / step) * step
    const last = Math.ceil(max / step) * step
    const steps = Math.round((last - first) / step)
    if (steps + 1 > count + 1) continue

    const ticks: number[] = []
    for (let index = 0; index <= steps; index++) ticks.push(clean(first + index * step))
    return ticks
  }
  return [clean(min), clean(max)]
}

export function spread(index: number, length: number, every: number): boolean {
  if (length <= every) return true
  return index % Math.ceil(length / every) === 0
}

export function decimalsFor(step: number): number {
  if (step <= 0) return 0
  return Math.max(0, Math.ceil(-Math.log10(step) - 1e-9))
}

export function crossing(
  from: { x: number; value: number },
  to: { x: number; value: number },
  colorOf: (value: number) => string,
): { x: number; value: number } {
  if (from.value === to.value) return { x: to.x, value: to.value }

  const fromColor = colorOf(from.value)
  let nearValue = from.value
  let farValue = to.value
  for (let step = 0; step < 20; step++) {
    const midValue = (nearValue + farValue) / 2
    if (colorOf(midValue) === fromColor) {
      nearValue = midValue
    } else {
      farValue = midValue
    }
  }

  const boundaryValue = farValue
  const share = (boundaryValue - from.value) / (to.value - from.value)
  const x = from.x + share * (to.x - from.x)
  return { x, value: boundaryValue }
}

type ValuePoint = { x: number; value: number }

export type ColorSegment = { color: string; points: ValuePoint[] }

const MAX_CROSSINGS_PER_STEP = 10

export function colorSegments(
  segment: ValuePoint[],
  colorOf: (value: number) => string,
): ColorSegment[] {
  const result: ColorSegment[] = []
  let current: ValuePoint[] = [segment[0]]
  let currentColor = colorOf(segment[0].value)
  for (let index = 1; index < segment.length; index++) {
    let previous = segment[index - 1]
    const point = segment[index]
    const color = colorOf(point.value)
    let guard = 0
    while (currentColor !== color && guard < MAX_CROSSINGS_PER_STEP) {
      const boundary = crossing(previous, point, colorOf)
      current.push(boundary)
      result.push({ color: currentColor, points: current })
      current = [boundary]
      currentColor = colorOf(boundary.value)
      previous = boundary
      guard++
    }
    current.push(point)
    currentColor = color
  }
  result.push({ color: currentColor, points: current })
  return result
}
