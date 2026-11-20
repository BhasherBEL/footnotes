<script lang="ts">
  import Card from '../components/Card.svelte'
  import Segmented from '../components/Segmented.svelte'
  import ZoneBar from '../components/charts/ZoneBar.svelte'
  import LineChart from '../components/charts/LineChart.svelte'
  import RouteMap from '../components/charts/RouteMap.svelte'
  import { t, tRunName } from '../lib/i18n/index.svelte'
  import { settings } from '../lib/settings/settings.svelte'
  import { runsState } from '../lib/data/runs.svelte'
  import { viewport } from '../lib/viewport.svelte'
  import { heartProfile } from '../lib/settings/heartProfile'
  import { easyShare, heartRateFloor, zoneOf, zonesOf } from '../lib/metrics/zones'
  import type { Zone } from '../lib/metrics/zones'
  import { splitsAt, splitsEvery, TRACK_STEP } from '../lib/metrics/splits'
  import {
    cadenceProfile,
    elevationProfile,
    heartRateProfile,
    smoothProfile,
    speedProfile,
  } from '../lib/metrics/profile'
  import { niceTicks } from '../lib/charts'
  import { EFFORT_METERS } from '../lib/types'
  import type { EffortDistance, Split } from '../lib/types'
  import {
    distanceValue,
    elevationValue,
    formatDayDate,
    formatDistance,
    formatDistanceNumber,
    formatDuration,
    formatElevation,
    formatHoursMinutes,
    formatNumber,
    formatPace,
    formatPaceValue,
    formatPercent,
    paceSeconds,
    paceSecondsFromSpeed,
    unitLabel,
    METERS_PER_MILE,
  } from '../lib/format'

  let { id }: { id: string } = $props()

  const splitLengths = [0.5, 1, 2, 5]
  let splitLength = $state<number | 'laps'>('laps')

  function smoothingWindow(meters: number): number {
    return Math.max(3, Math.round(meters / TRACK_STEP))
  }

  const zoneNames = ['zone.1', 'zone.2', 'zone.3', 'zone.4', 'zone.5'] as const
  const effortNames = {
    '400': 'effort.400',
    '1k': 'effort.1k',
    '5k': 'effort.5k',
    '10k': 'effort.10k',
    half: 'effort.half',
    marathon: 'effort.marathon',
  } as const

  const run = $derived(runsState.runs.find((candidate) => candidate.id === id))
  const profile = $derived(heartProfile(runsState.runs, settings))
  const zones = $derived(
    run === undefined || profile.zoneFloors === null
      ? []
      : zonesOf(run.heartRateSeconds, profile.zoneFloors),
  )
  const zoneSeconds = $derived(zones.reduce((sum, zone) => sum + zone.seconds, 0))

  function zoneTitleFor(rowZones: Zone[]): (zone: Zone) => string {
    const total = rowZones.reduce((sum, candidate) => sum + candidate.seconds, 0)
    return (zone: Zone) => {
      const share = total === 0 ? 0 : zone.seconds / total
      return `Z${zone.index} ${t(zoneNames[zone.index - 1])} · ${formatPercent(share, settings.language)}`
    }
  }

  const lapsAvailable = $derived(run !== undefined && run.lapBoundaries.length > 1)
  const effectiveSplitLength = $derived(splitLength === 'laps' && !lapsAvailable ? 1 : splitLength)
  const splitOptions = $derived([
    ...(lapsAvailable ? [{ value: 'laps', label: t('run.laps') }] : []),
    ...splitLengths.map((length) => ({
      value: String(length),
      label: `${length} ${unitLabel(settings.units)}`,
    })),
  ])
  const splitMeters = $derived(settings.units === 'mi' ? METERS_PER_MILE : 1000)
  const splitRows: Split[] = $derived(
    run === undefined
      ? []
      : effectiveSplitLength === 'laps'
        ? splitsAt(run.splitTrack, run.lapBoundaries)
        : splitsEvery(run.splitTrack, effectiveSplitLength * splitMeters),
  )
  const cumulativeSeconds = $derived(
    splitRows.reduce<number[]>((totals, row) => {
      const previous = totals.length > 0 ? totals[totals.length - 1] : 0
      totals.push(previous + row.seconds)
      return totals
    }, []),
  )
  const splitPaces = $derived(
    splitRows.map((row) => paceSeconds(row.meters, row.seconds, settings.units)),
  )
  const slowestSplit = $derived(Math.max(...splitPaces, 1))
  const fastestSplit = $derived(Math.min(...splitPaces, slowestSplit))
  const hasHeartRate = $derived(splitRows.some((row) => row.heartRate !== null))

  function splitShare(pace: number): number {
    if (slowestSplit === fastestSplit) return 100
    return 45 + ((pace - fastestSplit) / (slowestSplit - fastestSplit)) * 55
  }

  function distanceShare(row: Split): number {
    if (effectiveSplitLength === 'laps') return 1
    return Math.min(row.meters / (effectiveSplitLength * splitMeters), 1)
  }

  function wrapHeight(fullHeight: number, row: Split): number {
    return Math.max(fullHeight * distanceShare(row), 4)
  }

  function selectSplitLength(value: string): void {
    splitLength = value === 'laps' ? 'laps' : Number(value)
  }
  const efforts = $derived(
    run === undefined
      ? []
      : (Object.keys(EFFORT_METERS) as EffortDistance[])
          .filter((distance) => run.bestEfforts[distance] !== undefined)
          .map((distance) => ({ distance, seconds: run.bestEfforts[distance] as number })),
  )

  const trackEndMeters = $derived(run?.splitTrack.at(-1)?.meters ?? 0)
  const distanceTicks = $derived(
    run === undefined
      ? []
      : niceTicks(0, distanceValue(run.distance, settings.units), viewport.narrow ? 4 : 6)
          .map((value) => {
            const meters = settings.units === 'mi' ? value * METERS_PER_MILE : value * 1000
            return {
              x: meters,
              label: formatDistanceNumber(meters, settings.units, settings.language),
            }
          })
          .filter((tick) => tick.x <= trackEndMeters),
  )
  const distanceCaption = $derived(`${t('table.distance')} (${unitLabel(settings.units)})`)
  const paceUnit = $derived(`min/${unitLabel(settings.units)}`)
  const elevationUnit = $derived(settings.units === 'mi' ? 'ft' : 'm')

  function hitDistance(meters: number): string {
    return formatDistance(meters, settings.units, settings.language)
  }

  const heartRatePoints = $derived(run === undefined ? [] : heartRateProfile(run.splitTrack))
  const hasHeartRateProfile = $derived(heartRatePoints.some((point) => point.value !== null))
  const zoneBands = $derived.by(() => {
    const floors = profile.zoneFloors
    if (floors === null) return []
    return [
      { from: 0, to: floors[0], color: 'var(--muted)' },
      { from: floors[0], to: floors[1], color: 'var(--zone-1)' },
      { from: floors[1], to: floors[2], color: 'var(--zone-2)' },
      { from: floors[2], to: floors[3], color: 'var(--zone-3)' },
      { from: floors[3], to: floors[4], color: 'var(--zone-4)' },
      { from: floors[4], to: Infinity, color: 'var(--zone-5)' },
    ]
  })

  const heartRateColorOf = $derived.by(() => {
    const floors = profile.zoneFloors
    if (floors === null) return undefined
    return (value: number) => {
      const zone = zoneOf(value, floors)
      return zone === 0 ? 'var(--muted)' : `var(--zone-${zone})`
    }
  })

  const heartRateYMin = $derived(
    heartRateFloor(
      heartRatePoints
        .map((point) => point.value)
        .filter((value): value is number => value !== null),
      profile.zoneFloors,
    ) ?? undefined,
  )

  const speedPoints = $derived(run === undefined ? [] : speedProfile(run.splitTrack))
  const pacePoints = $derived(
    speedPoints.map((point) => ({
      x: point.x,
      value: point.value === null ? null : paceSecondsFromSpeed(point.value, settings.units),
    })),
  )
  const smoothedPacePoints = $derived(
    smoothProfile(speedPoints, smoothingWindow(400)).map((point) => ({
      x: point.x,
      value: paceSecondsFromSpeed(point.value, settings.units),
    })),
  )
  const hasSpeedProfile = $derived(pacePoints.some((point) => point.value !== null))

  const elevationPoints = $derived(run === undefined ? [] : elevationProfile(run.splitTrack))
  const smoothedElevationPoints = $derived(smoothProfile(elevationPoints, smoothingWindow(200)))
  const hasElevationProfile = $derived(elevationPoints.some((point) => point.value !== null))

  const cadencePoints = $derived(run === undefined ? [] : cadenceProfile(run.splitTrack))
  const smoothedCadencePoints = $derived(smoothProfile(cadencePoints, smoothingWindow(200)))
  const hasCadenceProfile = $derived(
    run !== undefined && run.splitTrack.some((point) => point.cadence !== null),
  )
</script>

{#if run === undefined}
  <Card>
    <p class="empty">{t('run.notFound')}</p>
    <a href="#/runs">{t('run.backToRuns')}</a>
  </Card>
{:else}
  <header>
    <a class="back" href="#/runs">{t('run.backToRuns')}</a>
    <p class="date">{formatDayDate(run.startTime, settings.language)}</p>
    <h1>{tRunName(run.name)}</h1>
  </header>

  <Card>
    <div class="stats">
      <div class="stat">
        <span class="label">{t('table.distance')}</span>
        <span class="big">{formatDistance(run.distance, settings.units, settings.language)}</span>
      </div>
      <div class="stat">
        <span class="label">{t('table.time')}</span>
        <span class="big">{formatDuration(run.movingTime)}</span>
      </div>
      <div class="stat">
        <span class="label">{t('table.pace')}</span>
        <span class="big">
          {formatPace(paceSeconds(run.distance, run.movingTime, settings.units), settings.units)}
        </span>
      </div>
      <div class="stat">
        <span class="label">{t('table.ascent')}</span>
        <span class="big">{formatElevation(run.ascent, settings.units, settings.language)}</span>
      </div>
      <div class="stat">
        <span class="label">{t('table.heartRate')}</span>
        <span class="big">{run.avgHeartRate ?? '—'}</span>
      </div>
      <div class="stat">
        <span class="label">{t('run.maxHeartRate')}</span>
        <span class="big">{run.maxHeartRate ?? '—'}</span>
      </div>
    </div>
  </Card>

  {#snippet paceCell(row: Split, pace: number)}
    <span class="col-pace">
      <span class="split-bar-wrap" style:height="{wrapHeight(14, row)}px">
        <span class="split-bar">
          <span class="fill" style:width="{splitShare(pace)}%"></span>
        </span>
      </span>
      <span class="split-value">{formatPace(pace, settings.units)}</span>
    </span>
  {/snippet}

  {#snippet intensityCell(row: Split)}
    <span class="col-intensity">
      {#if profile.zoneFloors === null}
        <span class="zone-bar-wrap" style:height="{wrapHeight(10, row)}px">
          <span class="zone-fallback"></span>
        </span>
      {:else}
        {@const rowZones = zonesOf(row.heartRateSeconds, profile.zoneFloors)}
        <span class="zone-bar-wrap" style:height="{wrapHeight(10, row)}px">
          <ZoneBar
            zones={rowZones}
            ariaLabel={t('run.splitIntensity')}
            height={10}
            titleOf={zoneTitleFor(rowZones)}
          />
        </span>
      {/if}
    </span>
    <span class="col-avg">{row.heartRate ?? '—'}</span>
  {/snippet}

  <Card>
    <div class="card-head">
      <h2>{t('run.splits')}</h2>
      <Segmented
        label={t('run.splitLength')}
        variant="soft"
        options={splitOptions}
        value={effectiveSplitLength === 'laps' ? 'laps' : String(effectiveSplitLength)}
        onchange={selectSplitLength}
      />
    </div>
    {#if splitRows.length === 0}
      <p class="empty">{t('run.noSplits')}</p>
    {:else}
      <div class="splits-head">
        <span class="col-index">{t('run.splitNumber')}</span>
        <span class="col-pace">{t('table.pace')}</span>
        {#if hasHeartRate}
          <span class="col-intensity">{t('run.splitIntensity')}</span>
          <span class="col-avg">{t('table.heartRate')}</span>
        {/if}
        <span class="col-time">{t('table.time')}</span>
      </div>
      <ol class="splits">
        {#each splitRows as row, index (index)}
          {@const pace = paceSeconds(row.meters, row.seconds, settings.units)}
          <li>
            <span class="split-index">{index + 1}</span>
            {@render paceCell(row, pace)}
            {#if hasHeartRate}
              {@render intensityCell(row)}
            {/if}
            <span class="split-time">{formatDuration(cumulativeSeconds[index])}</span>
          </li>
        {/each}
      </ol>
    {/if}
  </Card>

  {#if hasHeartRateProfile}
    <Card title={t('run.heartRateChart')}>
      <LineChart
        points={heartRatePoints}
        bands={zoneBands}
        colorOf={heartRateColorOf}
        yMin={heartRateYMin}
        xTicks={distanceTicks}
        xCaption={distanceCaption}
        formatValue={(value, decimals) => formatNumber(value, settings.language, decimals)}
        formatX={hitDistance}
        yCaption="bpm"
        ariaLabel={t('run.heartRateChart')}
        compact={viewport.narrow}
      />
      {#if zoneSeconds > 0}
        <div class="intensity">
          <div class="headline">
            <span class="big">{formatPercent(easyShare(zones), settings.language)}</span>
            <span class="muted">{t('card.easyTarget')}</span>
          </div>
          <ZoneBar
            {zones}
            ariaLabel={t('chart.zonesAria', {
              easy: formatPercent(easyShare(zones), settings.language),
            })}
            titleOf={zoneTitleFor(zones)}
          />
          <div class="zone-rows">
            {#each zones.filter((zone) => zone.seconds > 0) as zone (zone.index)}
              <div class="zone-row">
                <span class="swatch" style:background="var(--zone-{zone.index})"></span>
                <span class="zone-name">Z{zone.index} {t(zoneNames[zone.index - 1])}</span>
                <span class="muted">{formatHoursMinutes(zone.seconds)}</span>
                <span class="share">
                  {formatPercent(zone.seconds / zoneSeconds, settings.language)}
                </span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </Card>
  {/if}

  {#if hasSpeedProfile}
    <Card title={t('run.speedChart')}>
      <LineChart
        points={pacePoints}
        smoothed={smoothedPacePoints}
        invertY
        xTicks={distanceTicks}
        xCaption={distanceCaption}
        formatValue={(value) => formatPaceValue(value)}
        formatX={hitDistance}
        yCaption={paceUnit}
        ariaLabel={t('run.speedChart')}
        compact={viewport.narrow}
      />
      <p class="legend">
        <span class="swatch smoothed"></span>
        {t('chart.smoothed')}
      </p>
    </Card>
  {/if}

  {#if hasElevationProfile}
    <Card
      title={t('run.elevationChart')}
      subtitle={formatElevation(run.ascent, settings.units, settings.language)}
    >
      <LineChart
        points={elevationPoints}
        smoothed={smoothedElevationPoints}
        xTicks={distanceTicks}
        xCaption={distanceCaption}
        formatValue={(value, decimals) =>
          formatNumber(elevationValue(value, settings.units), settings.language, decimals)}
        formatX={hitDistance}
        yCaption={elevationUnit}
        ariaLabel={t('run.elevationChart')}
        compact={viewport.narrow}
      />
      <p class="legend">
        <span class="swatch smoothed"></span>
        {t('chart.smoothed')}
      </p>
    </Card>
  {/if}

  {#if hasCadenceProfile}
    <Card title={t('run.cadenceChart')}>
      <LineChart
        points={cadencePoints}
        smoothed={smoothedCadencePoints}
        xTicks={distanceTicks}
        xCaption={distanceCaption}
        formatValue={(value) => formatNumber(value, settings.language, 0)}
        formatX={hitDistance}
        yCaption={t('unit.spm')}
        ariaLabel={t('run.cadenceChart')}
        compact={viewport.narrow}
      />
      <p class="legend">
        <span class="swatch smoothed"></span>
        {t('chart.smoothed')}
      </p>
    </Card>
  {/if}

  {#if efforts.length > 0}
    <Card title={t('run.bestEfforts')}>
      <div class="efforts">
        {#each efforts as effort (effort.distance)}
          <div class="effort">
            <span class="label">{t(effortNames[effort.distance])}</span>
            <span class="big">{formatDuration(effort.seconds)}</span>
            <span class="effort-pace">
              {formatPace(
                paceSeconds(EFFORT_METERS[effort.distance], effort.seconds, settings.units),
                settings.units,
              )}
            </span>
          </div>
        {/each}
      </div>
    </Card>
  {/if}

  {#if run.route.length >= 2}
    <Card title={t('run.route')}>
      <RouteMap route={run.route} ariaLabel={t('run.routeAria')} />
    </Card>
  {/if}
{/if}

<style>
  header {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .back {
    margin-bottom: 6px;
  }

  .date {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
  }

  h1 {
    font-family: var(--font-display);
    font-size: 30px;
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

  .card-head h2 {
    font-size: 16px;
    font-weight: 600;
  }

  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
  }

  .stat,
  .effort {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 92px;
  }

  .label {
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .big {
    font-family: var(--font-display);
    font-size: 24px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .effort-pace {
    color: var(--muted);
    font-size: 12px;
  }

  .splits-head {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 6px;
    border-bottom: 1px solid var(--divider);
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  .splits {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .splits li {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
  }

  .col-index,
  .split-index {
    width: 18px;
    color: var(--muted);
  }

  .col-pace {
    flex: 1;
    min-width: 48px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .split-bar-wrap {
    flex: 1;
    min-width: 48px;
    overflow: hidden;
  }

  .split-bar {
    display: block;
    width: 100%;
    height: 14px;
    background: var(--grid);
    border-radius: var(--radius-pill);
    overflow: hidden;
  }

  .fill {
    display: block;
    height: 100%;
    background: var(--bar);
    border-radius: var(--radius-pill);
  }

  .split-value {
    width: 64px;
    text-align: right;
    font-weight: 600;
  }

  .col-intensity {
    flex: none;
    width: 120px;
  }

  .zone-bar-wrap {
    display: block;
    overflow: hidden;
  }

  .zone-fallback {
    display: block;
    height: 10px;
    border-radius: var(--radius-pill);
    background: var(--bar);
  }

  .col-avg {
    width: 48px;
    text-align: right;
  }

  .split-time,
  .col-time {
    width: 56px;
    text-align: right;
    color: var(--muted);
  }

  .intensity {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-top: 16px;
  }

  .headline {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .muted {
    color: var(--muted);
    font-size: 13px;
  }

  .zone-rows {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 13px;
  }

  .zone-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .swatch {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    flex: none;
  }

  .zone-name {
    flex: 1;
  }

  .share {
    width: 40px;
    text-align: right;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .efforts {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
  }

  .legend {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0;
    font-size: 12px;
    color: var(--muted);
  }

  .swatch.smoothed {
    width: 14px;
    height: 3.5px;
    border-radius: var(--radius-pill);
    background: var(--point);
  }

  .empty {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
  }

  a {
    color: var(--accent-strong);
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
  }
</style>
