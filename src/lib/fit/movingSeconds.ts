export type EventLike = { timestamp: Date; event?: string; eventType?: string }
export type PausedInterval = { start: number; end: number }
export type SpeedLike = { timestamp: Date; speed: number | null }

export const maxGapSeconds = 10

const stationarySpeed = 0.5
const maxStationaryGapMs = 2500

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function pausedIntervals(
  events: EventLike[],
  startMs: number,
  endMs: number,
): PausedInterval[] {
  const timerEvents = events
    .filter((event) => event.event === 'timer')
    .slice()
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  const intervals: PausedInterval[] = []
  let openStart: number | null = null

  for (const event of timerEvents) {
    const time = event.timestamp.getTime()
    if (event.eventType?.startsWith('stop')) {
      if (openStart === null) openStart = time
    } else if (event.eventType === 'start') {
      if (openStart !== null) {
        intervals.push({ start: openStart, end: time })
        openStart = null
      }
    }
  }

  return intervals
    .map((interval) => ({
      start: clamp(interval.start, startMs, endMs),
      end: clamp(interval.end, startMs, endMs),
    }))
    .filter((interval) => interval.end > interval.start)
}

export function movingSeconds(
  records: { timestamp: Date }[],
  startMs: number,
  pauses: PausedInterval[],
): number[] {
  const sortedPauses = pauses.slice().sort((a, b) => a.start - b.start)
  let pauseIndex = 0
  let pausedMsBefore = 0

  return records.map((record) => {
    const time = record.timestamp.getTime()
    if (time <= startMs) return 0

    while (pauseIndex < sortedPauses.length && sortedPauses[pauseIndex].end <= time) {
      pausedMsBefore += sortedPauses[pauseIndex].end - sortedPauses[pauseIndex].start
      pauseIndex++
    }

    const current = sortedPauses[pauseIndex]
    const withinCurrentPause = current && current.start < time ? time - current.start : 0

    return (time - startMs - pausedMsBefore - withinCurrentPause) / 1000
  })
}

export function cappedMovingSeconds(records: { timestamp: Date }[]): number[] {
  const seconds: number[] = []
  let total = 0
  for (let index = 0; index < records.length; index++) {
    if (index === 0) {
      seconds.push(0)
      continue
    }
    const gap = (records[index].timestamp.getTime() - records[index - 1].timestamp.getTime()) / 1000
    total += Math.min(maxGapSeconds, gap)
    seconds.push(total)
  }
  return seconds
}

export function stationaryIntervals(
  samples: SpeedLike[],
  pauses: PausedInterval[],
): PausedInterval[] {
  const sortedPauses = pauses.slice().sort((a, b) => a.start - b.start)
  const intervals: PausedInterval[] = []

  for (let index = 1; index < samples.length; index++) {
    const start = samples[index - 1].timestamp.getTime()
    const end = samples[index].timestamp.getTime()
    const gapMs = end - start
    if (gapMs <= 0 || gapMs > maxStationaryGapMs) continue

    const speed = samples[index].speed
    if (speed === null || speed >= stationarySpeed) continue

    const paused = sortedPauses.some((pause) => pause.start < end && start < pause.end)
    if (paused) continue

    const last = intervals[intervals.length - 1]
    if (last !== undefined && last.end === start) last.end = end
    else intervals.push({ start, end })
  }

  return intervals
}

export function intervalSeconds(intervals: PausedInterval[]): number {
  return intervals.reduce((total, interval) => total + (interval.end - interval.start), 0) / 1000
}
