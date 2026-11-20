import type { Language, Units } from './types'

export const METERS_PER_MILE = 1609.344
export const METERS_PER_FOOT = 0.3048

export function localeOf(language: Language): string {
  return language === 'fr' ? 'fr-FR' : 'en-US'
}

const numberFormats = new Map<string, Intl.NumberFormat>()
const dateFormats = new Map<string, Intl.DateTimeFormat>()

function numberFormat(language: Language, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const locale = localeOf(language)
  const key = `${locale}:${JSON.stringify(options)}`
  const cached = numberFormats.get(key)
  if (cached) return cached
  const format = new Intl.NumberFormat(locale, options)
  numberFormats.set(key, format)
  return format
}

function dateFormat(language: Language, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const locale = localeOf(language)
  const key = `${locale}:${JSON.stringify(options)}`
  const cached = dateFormats.get(key)
  if (cached) return cached
  const format = new Intl.DateTimeFormat(locale, options)
  dateFormats.set(key, format)
  return format
}

export function unitLabel(units: Units): string {
  return units === 'mi' ? 'mi' : 'km'
}

export function distanceValue(meters: number, units: Units): number {
  return units === 'mi' ? meters / METERS_PER_MILE : meters / 1000
}

export function formatDistance(meters: number, units: Units, language: Language): string {
  return `${formatDistanceNumber(meters, units, language)} ${unitLabel(units)}`
}

export function formatDistanceNumber(meters: number, units: Units, language: Language): string {
  return numberFormat(language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(distanceValue(meters, units))
}

export function paceSeconds(distanceMeters: number, seconds: number, units: Units): number {
  if (distanceMeters <= 0) return 0
  return seconds / distanceValue(distanceMeters, units)
}

export function paceSecondsFromSpeed(metersPerSecond: number, units: Units): number {
  if (metersPerSecond <= 0) return 0
  return units === 'mi' ? METERS_PER_MILE / metersPerSecond : 1000 / metersPerSecond
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : `${value}`
}

function splitMinutesSeconds(secondsTotal: number): { minutes: number; seconds: number } {
  const rounded = Math.round(secondsTotal)
  return { minutes: Math.floor(rounded / 60), seconds: rounded % 60 }
}

export function formatPaceValue(secondsPerUnit: number): string {
  const { minutes, seconds } = splitMinutesSeconds(secondsPerUnit)
  return `${minutes}:${pad2(seconds)}`
}

export function formatPace(secondsPerUnit: number, units: Units): string {
  return `${formatPaceValue(secondsPerUnit)} /${unitLabel(units)}`
}

export function formatDuration(seconds: number): string {
  const rounded = Math.round(seconds)
  const hours = Math.floor(rounded / 3600)
  const minutes = Math.floor((rounded % 3600) / 60)
  const secs = rounded % 60
  if (hours > 0) return `${hours}:${pad2(minutes)}:${pad2(secs)}`
  return `${minutes}:${pad2(secs)}`
}

export function formatHoursMinutes(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours} h ${pad2(minutes)}`
  return `${minutes} min`
}

export function elevationValue(meters: number, units: Units): number {
  return units === 'mi' ? meters / METERS_PER_FOOT : meters
}

export function formatElevation(meters: number, units: Units, language: Language): string {
  const rounded = numberFormat(language, { maximumFractionDigits: 0 }).format(
    elevationValue(meters, units),
  )
  return `${rounded} ${units === 'mi' ? 'ft' : 'm'}`
}

export function formatDayDate(iso: string, language: Language): string {
  return dateFormat(language, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(iso))
}

export function formatShortDate(iso: string, language: Language): string {
  return dateFormat(language, { month: 'short', day: 'numeric' }).format(new Date(iso))
}

export function formatMonth(iso: string, language: Language): string {
  return dateFormat(language, { month: 'short', year: 'numeric' }).format(new Date(iso))
}

export function formatMonthName(iso: string, language: Language): string {
  return dateFormat(language, { month: 'short' }).format(new Date(iso))
}

export function formatDateRange(startIso: string, endIso: string, language: Language): string {
  return dateFormat(language, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).formatRange(new Date(startIso), new Date(endIso))
}

export function formatPercent(fraction: number, language: Language): string {
  return numberFormat(language, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(fraction)
}

export function formatNumber(value: number, language: Language, digits = 1): string {
  return numberFormat(language, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}

export function formatTime(iso: string, language: Language): string {
  return dateFormat(language, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))
}
