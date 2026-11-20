import { describe, expect, it } from 'vitest'
import {
  distanceValue,
  formatDateRange,
  formatDistance,
  formatDuration,
  formatElevation,
  formatHoursMinutes,
  formatMonthName,
  formatPace,
  formatPercent,
  formatShortDate,
  paceSeconds,
} from './format'

describe('distance', () => {
  it('converts meters to km', () => {
    expect(distanceValue(18400, 'km')).toBeCloseTo(18.4, 5)
  })

  it('converts meters to miles', () => {
    expect(distanceValue(18400, 'mi')).toBeCloseTo(11.4332, 3)
  })

  it('formats distance in km', () => {
    expect(formatDistance(18400, 'km', 'en')).toBe('18.4 km')
  })

  it('formats distance in miles', () => {
    expect(formatDistance(18400, 'mi', 'en')).toBe('11.4 mi')
  })
})

describe('pace', () => {
  it('formats pace per km for 1 km in 300 s', () => {
    const secondsPerKm = paceSeconds(1000, 300, 'km')
    expect(formatPace(secondsPerKm, 'km')).toBe('5:00 /km')
  })

  it('formats the mile equivalent', () => {
    const secondsPerMile = paceSeconds(1000, 300, 'mi')
    expect(formatPace(secondsPerMile, 'mi')).toBe('8:03 /mi')
  })
})

describe('duration', () => {
  it('shows hours when the duration is an hour or more', () => {
    expect(formatDuration(6130)).toBe('1:42:10')
  })

  it('omits hours when the duration is under an hour', () => {
    expect(formatDuration(2885)).toBe('48:05')
  })
})

describe('hours and minutes', () => {
  it('shows hours and minutes above an hour', () => {
    expect(formatHoursMinutes(69960)).toBe('19 h 26')
  })

  it('shows minutes only under an hour', () => {
    expect(formatHoursMinutes(1560)).toBe('26 min')
  })
})

describe('elevation', () => {
  it('formats meters', () => {
    expect(formatElevation(248, 'km', 'en')).toBe('248 m')
  })

  it('formats feet', () => {
    expect(formatElevation(248, 'mi', 'en')).toBe('814 ft')
  })
})

describe('date range', () => {
  it('shows the year once when both dates share it', () => {
    expect(formatDateRange('2026-08-24T12:00:00', '2026-11-15T12:00:00', 'en')).toBe(
      'Aug 24 – Nov 15, 2026',
    )
  })

  it('shows the year on both dates when they differ', () => {
    expect(formatDateRange('2025-12-30T12:00:00', '2026-11-15T12:00:00', 'en')).toBe(
      'Dec 30, 2025 – Nov 15, 2026',
    )
  })
})

describe('month name', () => {
  it('formats the short month name', () => {
    expect(formatMonthName('2026-03-05T12:00:00', 'en')).toBe('Mar')
  })
})

describe('percent', () => {
  it('formats a fraction as a rounded percentage', () => {
    expect(formatPercent(0.75, 'en')).toBe('75%')
  })
})

describe('cached formatters', () => {
  it('returns the same string for repeated calls in the same language', () => {
    const first = formatShortDate('2026-03-05T12:00:00', 'en')
    const second = formatShortDate('2026-03-05T12:00:00', 'en')
    expect(first).toBe(second)
  })

  it('returns different strings for different languages', () => {
    const english = formatShortDate('2026-03-05T12:00:00', 'en')
    const french = formatShortDate('2026-03-05T12:00:00', 'fr')
    expect(english).not.toBe(french)
  })
})
