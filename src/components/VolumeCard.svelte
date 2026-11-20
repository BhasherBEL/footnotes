<script lang="ts">
  import Card from './Card.svelte'
  import BarChart from './charts/BarChart.svelte'
  import { t } from '../lib/i18n/index.svelte'
  import { settings } from '../lib/settings/settings.svelte'
  import { viewport } from '../lib/viewport.svelte'
  import {
    averageBucketedDistance,
    bucketSize,
    dailyDistances,
    distanceBuckets,
  } from '../lib/metrics/buckets'
  import { projectedMonth, projectedWeek } from '../lib/metrics/projection'
  import { startOfMonth, startOfWeek } from '../lib/period'
  import type { PeriodRange } from '../lib/period'
  import type { RunSummary } from '../lib/types'
  import {
    distanceValue,
    formatDistance,
    formatDistanceNumber,
    formatMonth,
    formatMonthName,
    formatShortDate,
    unitLabel,
  } from '../lib/format'

  let { runs, range }: { runs: RunSummary[]; range: PeriodRange } = $props()

  const size = $derived(bucketSize(settings.period))
  const buckets = $derived(distanceBuckets(runs, range, size))
  const totalDistance = $derived(runs.reduce((sum, run) => sum + run.distance, 0))
  const averageDistance = $derived(averageBucketedDistance(buckets))

  const projectedMeters = $derived.by(() => {
    if (buckets.length === 0) return null
    const lastBucket = buckets[buckets.length - 1]
    const now = new Date()
    const days = dailyDistances(runs, range)
    if (size === 'week') {
      if (lastBucket.start.getTime() !== startOfWeek(now).getTime()) return null
      return projectedWeek(days, lastBucket.start, now)
    }
    if (lastBucket.start.getTime() !== startOfMonth(now).getTime()) return null
    return projectedMonth(days, lastBucket.start, now)
  })

  const projectedLabel = $derived(
    projectedMeters === null
      ? undefined
      : formatDistanceNumber(projectedMeters, settings.units, settings.language),
  )

  const projectedTitle = $derived(
    projectedMeters === null
      ? undefined
      : t('card.projected', {
          value: formatDistance(projectedMeters, settings.units, settings.language),
        }),
  )

  function bucketLabel(start: Date): string {
    const iso = start.toISOString()
    if (size === 'week') return formatShortDate(iso, settings.language)
    return buckets.length <= 12
      ? formatMonthName(iso, settings.language)
      : formatMonth(iso, settings.language)
  }

  const bars = $derived(
    buckets.map((bucket, index) => {
      const isLastWithProjection = index === buckets.length - 1 && projectedMeters !== null
      return {
        label: bucketLabel(bucket.start),
        value: distanceValue(bucket.distance, settings.units),
        valueLabel: formatDistanceNumber(bucket.distance, settings.units, settings.language),
        title: `${bucketLabel(bucket.start)} · ${formatDistance(bucket.distance, settings.units, settings.language)} · ${t('chart.runCount', { count: bucket.runs })}`,
        projectedLabel: isLastWithProjection ? projectedLabel : undefined,
        projectedTitle: isLastWithProjection ? projectedTitle : undefined,
      }
    }),
  )
</script>

<Card>
  <div class="card-head">
    <h2>{size === 'week' ? t('card.weeklyDistance') : t('card.monthlyDistance')}</h2>
    <span class="muted">
      {t('card.distanceSummary', {
        total: formatDistance(totalDistance, settings.units, settings.language),
        average: formatDistance(averageDistance, settings.units, settings.language),
        unit: size === 'week' ? t('card.perWeek') : t('card.perMonth'),
      })}
      {#if projectedTitle}
        · {projectedTitle}
      {/if}
    </span>
  </div>
  <BarChart
    {bars}
    compact={viewport.narrow}
    average={distanceValue(averageDistance, settings.units)}
    averageLabel={t('chart.average', {
      value: formatDistanceNumber(averageDistance, settings.units, settings.language),
    })}
    caption={`${size === 'week' ? t('chart.weekStarting') : t('chart.month')} · ${unitLabel(settings.units)}`}
    ariaLabel={t('chart.distanceAria', {
      count: buckets.length,
      total: formatDistance(totalDistance, settings.units, settings.language),
    })}
    projected={projectedMeters === null
      ? undefined
      : distanceValue(projectedMeters, settings.units)}
  />
</Card>

<style>
  .card-head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
  }

  h2 {
    font-size: 16px;
    font-weight: 600;
  }

  .muted {
    color: var(--muted);
    font-size: 13px;
  }
</style>
