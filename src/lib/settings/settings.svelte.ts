import type { Language, Units } from '../types'

export type Period = '4w' | '12w' | '1y' | 'all'
export type TrendMeasure = 'pace' | 'efficiency'

export type Settings = {
  language: Language
  units: Units
  period: Period
  maxHeartRate: number | null
  restingHeartRate: number | null
  thresholdHeartRate: number | null
  zoneFloors: [number, number, number, number, number] | null
  referenceHeartRate: number | null
  trendMeasure: TrendMeasure
}

const storageKey = 'footnotes.settings'

const defaults: Settings = {
  language: 'en',
  units: 'km',
  period: '12w',
  maxHeartRate: null,
  restingHeartRate: null,
  thresholdHeartRate: null,
  zoneFloors: null,
  referenceHeartRate: null,
  trendMeasure: 'pace',
}

function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'fr'
}

function isUnits(value: unknown): value is Units {
  return value === 'km' || value === 'mi'
}

function isPeriod(value: unknown): value is Period {
  return value === '4w' || value === '12w' || value === '1y' || value === 'all'
}

function isTrendMeasure(value: unknown): value is TrendMeasure {
  return value === 'pace' || value === 'efficiency'
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number'
}

function isZoneFloors(value: unknown): value is [number, number, number, number, number] | null {
  if (value === null) return true
  return Array.isArray(value) && value.length === 5 && value.every((v) => typeof v === 'number')
}

function loadSettings(): Settings {
  const result = { ...defaults }
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return result
    const parsed = JSON.parse(raw) as Record<string, unknown>
    if (isLanguage(parsed.language)) result.language = parsed.language
    if (isUnits(parsed.units)) result.units = parsed.units
    if (isPeriod(parsed.period)) result.period = parsed.period
    if (isNullableNumber(parsed.maxHeartRate)) result.maxHeartRate = parsed.maxHeartRate
    if (isNullableNumber(parsed.restingHeartRate)) result.restingHeartRate = parsed.restingHeartRate
    if (isNullableNumber(parsed.thresholdHeartRate))
      result.thresholdHeartRate = parsed.thresholdHeartRate
    if (isZoneFloors(parsed.zoneFloors)) result.zoneFloors = parsed.zoneFloors
    if (isNullableNumber(parsed.referenceHeartRate))
      result.referenceHeartRate = parsed.referenceHeartRate
    if (isTrendMeasure(parsed.trendMeasure)) result.trendMeasure = parsed.trendMeasure
  } catch {
    return result
  }
  return result
}

export const settings = $state<Settings>(loadSettings())

export function saveSettings() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(settings))
  } catch {
    return
  }
}
