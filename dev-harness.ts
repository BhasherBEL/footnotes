import { mount } from 'svelte'
import './src/app.css'
import Run from './src/pages/Run.svelte'
import Trends from './src/pages/Trends.svelte'
import Dashboard from './src/pages/Dashboard.svelte'
import { runsState } from './src/lib/data/runs.svelte'
import { settings } from './src/lib/settings/settings.svelte'
import type { Period } from './src/lib/settings/settings.svelte'
import type { RunSummary, TrackPoint } from './src/lib/types'

const view = new URLSearchParams(location.search).get('view') ?? 'run'

const step = 25
const points = 320

function bpmAt(index: number): number {
  if (index < 5) return 85 + index
  if (index < 22) return Math.round(100 + ((index - 5) * 28) / 17)
  if (index >= points - 6) return 150 + (index - (points - 6))
  return 132 + ((index * 7) % 15)
}

const splitTrack: TrackPoint[] = Array.from({ length: points }, (_, index) => ({
  meters: (index + 1) * step,
  seconds: Math.round(index * 7.5),
  heartRateSeconds: { [bpmAt(index)]: 8 },
  altitude: 120 + Math.round(30 * Math.sin(index / 24)),
  cadence: index % 40 < 5 ? null : 172 + (index % 5),
}))

const heartRateSeconds: Record<number, number> = {}
for (const point of splitTrack) {
  for (const [bpm, seconds] of Object.entries(point.heartRateSeconds)) {
    const key = Number(bpm)
    heartRateSeconds[key] = (heartRateSeconds[key] ?? 0) + seconds
  }
}

const route = Array.from({ length: 32 }, (_, index) => {
  const angle = (index / 32) * Math.PI * 2
  return {
    latitude: 48.853 + 0.004 * Math.sin(angle),
    longitude: 2.354 + 0.006 * Math.cos(angle),
  }
})

const run: RunSummary = {
  id: 'demo',
  startTime: '2026-11-18T07:30:00Z',
  sport: 'running',
  subSport: 'road',
  name: 'Cardio loop',
  distance: 8000,
  movingTime: 2400,
  elapsedTime: 2410,
  ascent: 62,
  avgHeartRate: 138,
  maxHeartRate: 158,
  heartRateSeconds,
  bestEfforts: { '1k': 292, '5k': 1530 },
  steadyHeartRateFit: null,
  splitTrack,
  route,
  lapBoundaries: [],
  startLatitude: 48.853,
  startLongitude: 2.354,
  deviceProfile: { maxHeartRate: 190 },
  steps: null,
  trainingLoad: null,
  gradeFactor: 1,
}

settings.zoneFloors = [110, 125, 140, 155, 170]

function fillerRun(startTime: string, distance: number, movingTime: number, avgHeartRate: number): RunSummary {
  return {
    id: `filler-${startTime}`,
    startTime,
    sport: 'running',
    subSport: 'road',
    name: 'loop',
    distance,
    movingTime,
    elapsedTime: movingTime + 30,
    ascent: 40,
    avgHeartRate,
    maxHeartRate: avgHeartRate + 18,
    heartRateSeconds: { [avgHeartRate]: movingTime },
    bestEfforts: {},
    steadyHeartRateFit: null,
    splitTrack: [],
    route: [],
    lapBoundaries: [],
    startLatitude: 48.853,
    startLongitude: 2.354,
    deviceProfile: {},
    steps: null,
    trainingLoad: null,
    gradeFactor: 1,
  }
}

const fillers: RunSummary[] = [
  fillerRun('2025-12-09T07:00:00Z', 6000, 1800, 148),
  fillerRun('2026-01-13T07:00:00Z', 7000, 2100, 150),
  fillerRun('2026-02-10T07:00:00Z', 6500, 1950, 149),
  fillerRun('2026-03-10T07:00:00Z', 7500, 2250, 151),
  fillerRun('2026-04-14T07:00:00Z', 8000, 2400, 153),
  fillerRun('2026-05-12T07:00:00Z', 6000, 1800, 148),
  fillerRun('2026-06-09T07:00:00Z', 7000, 2100, 152),
  fillerRun('2026-07-14T07:00:00Z', 9000, 2700, 158),
  fillerRun('2026-08-11T07:00:00Z', 10000, 3000, 160),
  fillerRun('2026-09-15T07:00:00Z', 8000, 2400, 155),
  fillerRun('2026-10-13T07:00:00Z', 12000, 3600, 162),
  fillerRun('2026-11-17T07:00:00Z', 6000, 1800, 149),
]

if (view === 'trends' || view === 'dashboard') {
  settings.period = (new URLSearchParams(location.search).get('period') ?? '1y') as Period
  const lang = new URLSearchParams(location.search).get('lang')
  if (lang === 'fr' || lang === 'en') settings.language = lang
  const base = view === 'dashboard' ? [...fillers, run] : fillers
  runsState.runs = base.sort((a, b) => a.startTime.localeCompare(b.startTime))
  runsState.loaded = true
  const page = view === 'dashboard' ? Dashboard : Trends
  mount(page, { target: document.querySelector('#app') as HTMLElement })
} else {
  runsState.runs = [run]
  runsState.loaded = true
  mount(Run, { target: document.querySelector('#app') as HTMLElement, props: { id: 'demo' } })
}
