import { t } from './i18n/index.svelte'
import { formatDateRange } from './format'
import { settings } from './settings/settings.svelte'
import type { PeriodRange } from './period'
import type { RunSummary } from './types'

export function rangeLabel(runs: RunSummary[], range: PeriodRange): string {
  if (runs.length === 0) return t('header.noRuns')
  const last = runs[runs.length - 1].startTime
  return t('header.range', {
    count: runs.length,
    range: formatDateRange(range.start.toISOString(), last, settings.language),
  })
}
