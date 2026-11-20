<script lang="ts">
  import PageHeader from '../components/PageHeader.svelte'
  import Card from '../components/Card.svelte'
  import Segmented from '../components/Segmented.svelte'
  import ScatterTrendChart from '../components/charts/ScatterTrendChart.svelte'
  import Heatmap from '../components/charts/Heatmap.svelte'
  import LineChart from '../components/charts/LineChart.svelte'
  import VolumeCard from '../components/VolumeCard.svelte'
  import IntensityCard from '../components/IntensityCard.svelte'
  import { t } from '../lib/i18n/index.svelte'
  import { rangeLabel } from '../lib/rangeLabel.svelte'
  import { settings } from '../lib/settings/settings.svelte'
  import { runsState } from '../lib/data/runs.svelte'
  import { viewport } from '../lib/viewport.svelte'
  import { heartProfile } from '../lib/settings/heartProfile'
  import { addDays, endOfDay, periodRange, runsInRange, weekCount } from '../lib/period'
  import { dailyDistances } from '../lib/metrics/buckets'
  import { fitnessSeries } from '../lib/metrics/fitness'
  import { heatLevel, heatTop, weeksOfDays, type HeatWeek } from '../lib/metrics/consistency'
  import { spread } from '../lib/charts'
  import {
    nearestHeartRate,
    referenceHeartRates,
    runPoints,
    trendWindowDays,
    weeklyTrend,
  } from '../lib/metrics/paceTrend'
  import {
    distanceValue,
    formatDistance,
    formatMonthName,
    formatNumber,
    formatPaceValue,
    formatShortDate,
    paceSecondsFromSpeed,
    unitLabel,
  } from '../lib/format'
  import type { TrendMeasure } from '../lib/settings/settings.svelte'

  const range = $derived(periodRange(runsState.runs, settings.period))
  const runs = $derived(runsInRange(runsState.runs, range))
  const profile = $derived(heartProfile(runsState.runs, settings))
  const options = $derived(referenceHeartRates(runsState.runs))
  const reference = $derived(nearestHeartRate(options, profile.referenceHeartRate ?? 145))

  const points = $derived(runPoints(runs, settings.trendMeasure, reference))
  const windowDays = $derived(trendWindowDays(settings.period))
  const trend = $derived(weeklyTrend(points, range, windowDays))

  const isPace = $derived(settings.trendMeasure === 'pace')

  function toDisplay(value: number): number {
    return isPace ? paceSecondsFromSpeed(value, settings.units) : value
  }

  const chartPoints = $derived(
    points.map((point) => ({
      x: point.date.getTime(),
      y: toDisplay(point.value),
      title: `${formatShortDate(point.date.toISOString(), settings.language)} · ${formatValue(toDisplay(point.value))}`,
    })),
  )
  const chartTrend = $derived(
    trend.map((point) => ({ x: point.date.getTime(), y: toDisplay(point.value) })),
  )

  function formatValue(value: number): string {
    return isPace
      ? `${formatPaceValue(value)} /${unitLabel(settings.units)}`
      : formatNumber(value, settings.language, 2)
  }

  const headline = $derived(chartTrend.length === 0 ? null : chartTrend[chartTrend.length - 1].y)
  const firstTrend = $derived(chartTrend.length === 0 ? null : chartTrend[0].y)
  const change = $derived(headline === null || firstTrend === null ? 0 : firstTrend - headline)
  const improved = $derived(isPace ? change > 0 : change < 0)

  const xLabels = $derived(
    chartPoints.length === 0
      ? []
      : dailyDistances(runs, range)
          .filter((_, index) => index % 7 === 0)
          .map((day) => ({
            x: day.date.getTime(),
            label: formatShortDate(day.date.toISOString(), settings.language),
          })),
  )

  const days = $derived(dailyDistances(runs, range))
  const heatmapDays = $derived(dailyDistances(runs, { ...range, start: range.windowStart }))
  const heatmapTop = $derived(heatTop(heatmapDays, settings.units))
  const weeks = $derived(weeksOfDays(heatmapDays))
  const dayLabels = $derived([
    t('day.mon'),
    t('day.tue'),
    t('day.wed'),
    t('day.thu'),
    t('day.fri'),
    t('day.sat'),
    t('day.sun'),
  ])

  function shortRangeLabels(weeksOfRange: HeatWeek[]): string[] {
    return weeksOfRange.map((week, index) =>
      index % 2 === 0 ? formatShortDate(week.start.toISOString(), settings.language) : '',
    )
  }

  function monthBoundaryIndexes(weeksOfRange: HeatWeek[]): number[] {
    const boundaries: number[] = []
    for (let index = 1; index < weeksOfRange.length; index++) {
      const month = weeksOfRange[index].start.getMonth()
      const previousMonth = weeksOfRange[index - 1].start.getMonth()
      if (month !== previousMonth) boundaries.push(index)
    }
    return boundaries
  }

  function longRangeLabels(weeksOfRange: HeatWeek[]): string[] {
    const labels = weeksOfRange.map(() => '')
    const boundaries = monthBoundaryIndexes(weeksOfRange)
    for (const index of boundaries) {
      labels[index] = formatMonthName(weeksOfRange[index].start.toISOString(), settings.language)
    }
    const firstBoundary = boundaries.length === 0 ? weeksOfRange.length : boundaries[0]
    const minimumGap = weeksOfRange.length > 30 ? 4 : 2
    if (firstBoundary >= minimumGap) {
      labels[0] = formatMonthName(weeksOfRange[0].start.toISOString(), settings.language)
    }
    return labels
  }

  const heatWeekLabels = $derived(
    weeks.length <= 13 ? shortRangeLabels(weeks) : longRangeLabels(weeks),
  )

  const heatWeeks = $derived(
    weeks.map((week, index) => ({
      label: heatWeekLabels[index],
      days: Array.from({ length: 7 }, (_, row) => {
        const day = week.days[row]
        if (!day) return { level: 0, title: '' }
        return {
          level: heatLevel(distanceValue(day.distance, settings.units), heatmapTop),
          title: `${formatShortDate(day.date.toISOString(), settings.language)} · ${formatDistance(day.distance, settings.units, settings.language)}`,
        }
      }),
    })),
  )

  const runsPerWeek = $derived(runs.length / Math.max(1, weekCount(range)))

  function fitnessDates(start: Date, end: Date): Date[] {
    const dates: Date[] = []
    let day = start
    while (day.getTime() <= end.getTime()) {
      dates.push(endOfDay(day))
      day = addDays(day, 1)
    }
    return dates
  }

  const fitnessPeriodDates = $derived(fitnessDates(range.start, range.latest ?? new Date()))
  const fitnessValues = $derived(fitnessSeries(runsState.runs, fitnessPeriodDates))
  const fitnessPoints = $derived(
    fitnessPeriodDates.map((date, index) => ({ x: date.getTime(), value: fitnessValues[index] })),
  )
  const fitnessXTicks = $derived(
    fitnessPeriodDates
      .map((date, index) => ({
        x: date.getTime(),
        label: formatShortDate(date.toISOString(), settings.language),
        index,
      }))
      .filter(({ index }) => spread(index, fitnessPeriodDates.length, viewport.narrow ? 4 : 7))
      .map(({ x, label }) => ({ x, label })),
  )
</script>

<PageHeader title={t('page.trends')} range={rangeLabel(runs, range)} />

<section class="group">
  <h2 class="group-title">{t('group.training')}</h2>
  <Card>
    <div class="card-head">
      <h2>{t('card.consistency')}</h2>
      <span class="muted">
        {t('card.consistencySummary', {
          weeks: weekCount(range),
          runs: runs.length,
          perWeek: formatNumber(runsPerWeek, settings.language, 1),
        })}
      </span>
    </div>
    <Heatmap
      weeks={heatWeeks}
      {dayLabels}
      ariaLabel={t('chart.heatmapAria', { weeks: weekCount(range), runs: runs.length })}
    />
    <div class="legend">
      {t('chart.rest')}
      {#each [0, 1, 2, 3, 4] as level (level)}
        <span class="swatch" style:background="var(--heat-{level})"></span>
      {/each}
      {t('chart.heatTop', { value: `${heatmapTop} ${unitLabel(settings.units)}` })}
    </div>
  </Card>

  <VolumeCard {runs} {range} />
  <IntensityCard {runs} />
</section>

<section class="group">
  <h2 class="group-title">{t('group.progress')}</h2>
  <Card>
    <div class="card-head">
      <h2>{t('card.paceAtHeartRate')}</h2>
      <div class="controls">
        <Segmented
          label={t('card.measure')}
          variant="soft"
          options={[
            { value: 'pace', label: t('card.measurePace') },
            { value: 'efficiency', label: t('card.measureEfficiency') },
          ]}
          value={settings.trendMeasure}
          onchange={(value) => (settings.trendMeasure = value as TrendMeasure)}
        />
        <label class="reference">
          {t('card.at')}
          <select
            value={String(reference)}
            onchange={(event) => (settings.referenceHeartRate = Number(event.currentTarget.value))}
          >
            {#each options as beats (beats)}
              <option value={String(beats)}>{beats} bpm</option>
            {/each}
          </select>
        </label>
      </div>
    </div>

    {#if chartPoints.length < 3}
      <p class="empty">{t('empty.noSteadyRuns')}</p>
    {:else}
      <div class="headline">
        <span class="big">{formatValue(headline ?? 0)}</span>
        {#if isPace}
          <span class="muted">{t('card.atHeartRate', { beats: reference })}</span>
        {/if}
        {#if chartTrend.length > 1}
          <span class="change" class:improved>
            {improved ? '▲' : '▼'}
            {t(isPace ? 'card.changePace' : 'card.changeEfficiency', {
              value: isPace
                ? Math.round(Math.abs(change))
                : formatNumber(Math.abs(change), settings.language, 2),
              unit: unitLabel(settings.units),
              since: formatShortDate(trend[0].date.toISOString(), settings.language),
              from: formatValue(firstTrend ?? 0),
            })}
          </span>
        {/if}
      </div>

      <ScatterTrendChart
        points={chartPoints}
        trend={chartTrend}
        {xLabels}
        invertY={isPace}
        formatY={(value, decimals) =>
          isPace ? formatPaceValue(value) : formatNumber(value, settings.language, decimals)}
        yCaption={isPace
          ? t('chart.paceCaption', { unit: unitLabel(settings.units), beats: reference })
          : t('chart.efficiencyCaption')}
        xCaption={t('chart.date')}
        maxXLabels={viewport.narrow ? 4 : 7}
        ariaLabel={t('chart.trendAria', { count: chartPoints.length, weeks: windowDays / 7 })}
      />

      <div class="legend">
        <span class="dot"></span>
        {t('chart.oneEasyRun')}
        <span class="line"></span>
        {t('chart.trendWindow', { weeks: windowDays / 7 })}
      </div>
    {/if}
  </Card>

  {#if fitnessPoints.length >= 2}
    <Card title={t('card.fitness')}>
      <LineChart
        points={fitnessPoints}
        area
        xTicks={fitnessXTicks}
        xCaption={t('chart.date')}
        yCaption={t('chart.load')}
        formatValue={(value, decimals) => formatNumber(value, settings.language, decimals)}
        formatX={(x) => formatShortDate(new Date(x).toISOString(), settings.language)}
        ariaLabel={t('chart.fitnessAria', { days: fitnessPeriodDates.length })}
        compact={viewport.narrow}
      />
    </Card>
  {/if}
</section>

<style>
  .group {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .group-title {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .card-head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }

  h2 {
    font-size: 16px;
    font-weight: 600;
  }

  .muted {
    color: var(--muted);
    font-size: 13px;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  .reference {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--muted);
  }

  select {
    min-height: 46px;
    padding: 0 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-control);
    background: var(--surface);
    font: inherit;
    color: var(--text);
  }

  .headline {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 10px;
  }

  .big {
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .change {
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
  }

  .change.improved {
    color: var(--positive);
  }

  .legend {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--muted);
  }

  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--point);
  }

  .line {
    width: 22px;
    height: 3px;
    border-radius: 2px;
    background: var(--accent);
    margin-left: 8px;
  }

  .swatch {
    width: 12px;
    height: 12px;
    border-radius: 3px;
  }

  .empty {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
  }
</style>
