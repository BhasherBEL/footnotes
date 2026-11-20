import { describe, expect, it } from 'vitest'
import {
  cappedMovingSeconds,
  intervalSeconds,
  movingSeconds,
  pausedIntervals,
  stationaryIntervals,
} from './movingSeconds'
import type { EventLike, SpeedLike } from './movingSeconds'

const base = new Date('2026-11-15T09:00:00Z').getTime()

function at(offsetMs: number): Date {
  return new Date(base + offsetMs)
}

function sampled(samples: [number, number | null][]): SpeedLike[] {
  return samples.map(([offset, speed]) => ({ timestamp: at(offset), speed }))
}

describe('pausedIntervals', () => {
  it('turns a start / stop / start / stop sequence into two intervals and clamps them', () => {
    const startMs = base
    const endMs = base + 1000
    const events: EventLike[] = [
      { timestamp: at(300), event: 'timer', eventType: 'stopAll' },
      { timestamp: at(900), event: 'timer', eventType: 'start' },
      { timestamp: at(950), event: 'timer', eventType: 'stopAll' },
      { timestamp: at(-200), event: 'timer', eventType: 'start' },
      { timestamp: at(-100), event: 'timer', eventType: 'stopAll' },
      { timestamp: at(50), event: 'timer', eventType: 'start' },
      { timestamp: at(500), event: 'lap', eventType: 'stopAll' },
    ]

    const intervals = pausedIntervals(events, startMs, endMs)

    expect(intervals).toEqual([
      { start: startMs, end: at(50).getTime() },
      { start: at(300).getTime(), end: at(900).getTime() },
    ])
  })
})

describe('movingSeconds', () => {
  it('skips a hole covered by a paused interval', () => {
    const startMs = base
    const records = [{ timestamp: at(0) }, { timestamp: at(100_000) }, { timestamp: at(700_000) }]
    const pauses = [{ start: base + 100_000, end: base + 700_000 }]

    const seconds = movingSeconds(records, startMs, pauses)

    expect(seconds[0]).toBe(0)
    expect(seconds[1]).toBeCloseTo(100, 6)
    expect(seconds[2]).toBeCloseTo(100, 6)
  })

  it('is non-decreasing and starts at zero even with a record before the start', () => {
    const startMs = base
    const records = [
      { timestamp: at(-5_000) },
      { timestamp: at(0) },
      { timestamp: at(60_000) },
      { timestamp: at(120_000) },
      { timestamp: at(900_000) },
    ]
    const pauses = [{ start: base + 60_000, end: base + 800_000 }]

    const seconds = movingSeconds(records, startMs, pauses)

    expect(seconds[0]).toBe(0)
    for (let index = 1; index < seconds.length; index++) {
      expect(seconds[index]).toBeGreaterThanOrEqual(seconds[index - 1])
    }
  })
})

describe('cappedMovingSeconds', () => {
  it('counts a hole with no timer events as ten seconds, not the real gap', () => {
    const records = [{ timestamp: at(0) }, { timestamp: at(100_000) }, { timestamp: at(700_000) }]

    const seconds = cappedMovingSeconds(records)

    expect(seconds).toEqual([0, 10, 20])
  })
})

describe('stationaryIntervals', () => {
  it('drops every span that ends on a record slower than half a metre per second', () => {
    const samples = sampled([
      [0, 2],
      [1000, 0.2],
      [2000, 2],
      [3000, 0.2],
      [4000, 2],
    ])

    expect(stationaryIntervals(samples, [])).toEqual([
      { start: base, end: at(1000).getTime() },
      { start: at(2000).getTime(), end: at(3000).getTime() },
    ])
    expect(intervalSeconds(stationaryIntervals(samples, []))).toBe(2)
  })

  it('merges consecutive slow spans into one interval', () => {
    const samples = sampled([
      [0, 2],
      [1000, 0.2],
      [2000, 0.4],
      [3000, 0.1],
      [4000, 2],
    ])

    expect(stationaryIntervals(samples, [])).toEqual([{ start: base, end: at(3000).getTime() }])
  })

  it('keeps a slow run at 0.8 m per second', () => {
    const samples = sampled([
      [0, 0.8],
      [1000, 0.8],
      [2000, 0.9],
    ])

    expect(stationaryIntervals(samples, [])).toEqual([])
  })

  it('ignores a slow record reached through a gap longer than two and a half seconds', () => {
    const samples = sampled([
      [0, 2],
      [5000, 0.1],
      [6000, 2],
    ])

    expect(stationaryIntervals(samples, [])).toEqual([])
  })

  it('does not build intervals inside a pause', () => {
    const samples = sampled([
      [0, 2],
      [1000, 0.1],
      [2000, 0.1],
    ])
    const pauses = [{ start: base, end: base + 1000 }]

    expect(stationaryIntervals(samples, pauses)).toEqual([
      { start: at(1000).getTime(), end: at(2000).getTime() },
    ])
    expect(intervalSeconds(stationaryIntervals(samples, pauses))).toBe(1)
  })

  it('counts records with an unknown speed as moving', () => {
    const samples = sampled([
      [0, null],
      [1000, null],
      [2000, null],
    ])

    expect(stationaryIntervals(samples, [])).toEqual([])
  })
})

describe('movingSeconds with stationary holes', () => {
  it('removes a ten second standing block from the seconds axis', () => {
    const samples: SpeedLike[] = []
    for (let index = 0; index <= 40; index++) {
      samples.push({ timestamp: at(index * 1000), speed: index >= 20 && index < 30 ? 0.2 : 2 })
    }

    const seconds = movingSeconds(samples, base, stationaryIntervals(samples, []))

    expect(seconds[19]).toBeCloseTo(19, 6)
    expect(seconds[25]).toBeCloseTo(19, 6)
    expect(seconds[40]).toBeCloseTo(30, 6)
  })

  it('does not double-remove standing time already covered by a timer pause', () => {
    const samples: SpeedLike[] = []
    for (let index = 0; index <= 80; index++) {
      let speed = 2
      if (index >= 20 && index < 30) speed = 0.2
      if (index >= 61 && index <= 70) speed = 0.1
      samples.push({ timestamp: at(index * 1000), speed })
    }
    const pauses = [{ start: at(60_000).getTime(), end: at(70_000).getTime() }]

    const stationary = stationaryIntervals(samples, pauses)
    const seconds = movingSeconds(samples, base, [...pauses, ...stationary])

    expect(stationary).toEqual([{ start: at(19_000).getTime(), end: at(29_000).getTime() }])
    expect(intervalSeconds(stationary)).toBe(10)
    expect(seconds[80]).toBeCloseTo(60, 6)
  })
})
