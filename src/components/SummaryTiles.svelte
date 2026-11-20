<script lang="ts">
  import { t } from '../lib/i18n/index.svelte'
  import { settings } from '../lib/settings/settings.svelte'
  import { fitnessSeries, weekBand } from '../lib/metrics/fitness'
  import { addDays, endOfDay, startOfWeek, weekCount } from '../lib/period'
  import type { PeriodRange } from '../lib/period'
  import type { RunSummary } from '../lib/types'
  import { formatDistance, formatNumber, formatPercent } from '../lib/format'
  import Sparkline from './charts/Sparkline.svelte'

  let { runs, allRuns, range }: { runs: RunSummary[]; allRuns: RunSummary[]; range: PeriodRange } =
    $props()

  function inWindow(list: RunSummary[], start: Date, end: Date): RunSummary[] {
    return list.filter((run) => {
      const time = new Date(run.startTime).getTime()
      return time >= start.getTime() && time <= end.getTime()
    })
  }

  function sumDistance(list: RunSummary[]): number {
    return list.reduce((sum, run) => sum + run.distance, 0)
  }

  function sumSteps(list: RunSummary[]): number | null {
    const withSteps = list.filter((run) => run.steps !== null)
    if (withSteps.length === 0) return null
    return withSteps.reduce((sum, run) => sum + (run.steps as number), 0)
  }

  function sparkDates(start: Date, end: Date): Date[] {
    if (end.getTime() <= start.getTime()) return [endOfDay(end)]
    const days = Math.floor((end.getTime() - start.getTime()) / 86400000)
    const count = Math.min(40, Math.max(2, days + 1))
    return Array.from({ length: count }, (_, index) =>
      endOfDay(
        new Date(start.getTime() + (index / (count - 1)) * (end.getTime() - start.getTime())),
      ),
    )
  }

  const now = $derived(range.latest ?? new Date())
  const thisWeekStart = $derived(startOfWeek(now))
  const thisWeekRuns = $derived(inWindow(allRuns, thisWeekStart, now))

  const totalDistance = $derived(sumDistance(runs))
  const totalSteps = $derived(sumSteps(runs))
  const weeksInRange = $derived(weekCount(range))

  const peakDates = $derived(
    Array.from({ length: 365 }, (_, index) => endOfDay(addDays(now, -364 + index))),
  )
  const formValues = $derived(fitnessSeries(allRuns, peakDates))
  const fitnessNow = $derived(formValues[formValues.length - 1])
  const peak = $derived(Math.max(...formValues))
  const sparkValues = $derived(fitnessSeries(allRuns, sparkDates(range.start, now)))

  const thisWeekDistance = $derived(sumDistance(thisWeekRuns))
  const band = $derived(weekBand(allRuns, thisWeekStart))
</script>

<div class="tiles">
  <div class="tile">
    <span class="tile-head">{t('card.totalDistance')}</span>
    <span class="value">{formatDistance(totalDistance, settings.units, settings.language)}</span>
    <span class="tile-foot">
      {t('card.perWeekRate', {
        value: formatDistance(totalDistance / weeksInRange, settings.units, settings.language),
      })}
    </span>
  </div>

  <div class="tile">
    <span class="tile-head">{t('card.totalSteps')}</span>
    {#if totalSteps === null}
      <span class="value">—</span>
    {:else}
      <span class="value">{formatNumber(totalSteps, settings.language, 0)}</span>
      <span class="tile-foot">
        {t('card.perWeekRate', {
          value: formatNumber(totalSteps / weeksInRange, settings.language, 0),
        })}
      </span>
    {/if}
  </div>

  <div class="tile">
    <span class="tile-head">{t('card.fitness')}</span>
    {#if peak === 0}
      <span class="value">—</span>
    {:else}
      <div class="form-row">
        <span class="value">{formatPercent(fitnessNow / peak, settings.language)}</span>
        <Sparkline values={sparkValues} />
      </div>
      <span class="tile-foot">{t('card.formOfPeak')}</span>
    {/if}
  </div>

  <div class="tile">
    <span class="tile-head">{t('card.thisWeek')}</span>
    <span class="value">
      {formatDistance(thisWeekDistance, settings.units, settings.language)}
    </span>
    {#if band}
      <span class="tile-foot">
        {t('card.weekBand', {
          min: formatDistance(band.minimal, settings.units, settings.language),
          max: formatDistance(band.maximal, settings.units, settings.language),
        })}
      </span>
    {/if}
  </div>
</div>

<style>
  .tiles {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }

  .tile {
    flex: 1 1 200px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .tile-head {
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
  }

  .value {
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .form-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .tile-foot {
    font-size: 12px;
    color: var(--muted);
  }

  @media (max-width: 900px) {
    .tiles {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
