<script lang="ts">
  import PageHeader from '../components/PageHeader.svelte'
  import Card from '../components/Card.svelte'
  import SummaryTiles from '../components/SummaryTiles.svelte'
  import VolumeCard from '../components/VolumeCard.svelte'
  import IntensityCard from '../components/IntensityCard.svelte'
  import CountriesCard from '../components/CountriesCard.svelte'
  import RunsTable from '../components/RunsTable.svelte'
  import { t, tRunName } from '../lib/i18n/index.svelte'
  import { rangeLabel } from '../lib/rangeLabel.svelte'
  import { settings } from '../lib/settings/settings.svelte'
  import { runsState } from '../lib/data/runs.svelte'
  import { periodRange, runsInRange } from '../lib/period'
  import { bestEffortPerDistance, effortsFor } from '../lib/metrics/records'
  import {
    formatDistance,
    formatDistanceNumber,
    formatDuration,
    formatHoursMinutes,
    formatMonth,
    formatPercent,
    formatShortDate,
    distanceValue,
    unitLabel,
  } from '../lib/format'

  const effortNames = {
    '400': 'effort.400',
    '1k': 'effort.1k',
    '5k': 'effort.5k',
    '10k': 'effort.10k',
    half: 'effort.half',
    marathon: 'effort.marathon',
  } as const
  const periodNames = {
    '4w': 'period.last4w',
    '12w': 'period.last12w',
    '1y': 'period.last1y',
    all: 'period.lastAll',
  } as const

  const range = $derived(periodRange(runsState.runs, settings.period))
  const runs = $derived(runsInRange(runsState.runs, range))
  const recent = $derived([...runs].reverse())

  const efforts = $derived(bestEffortPerDistance(runs))

  function isPersonalRecord(distance: keyof typeof effortNames, seconds: number): boolean {
    const best = effortsFor(runsState.runs, distance)[0]
    return best !== undefined && seconds <= best.seconds
  }
</script>

<PageHeader title={t('page.dashboard')} range={rangeLabel(runs, range)} />

<SummaryTiles {runs} allRuns={runsState.runs} {range} />

<div class="row">
  <section class="wide"><VolumeCard {runs} {range} /></section>
  <section class="narrow"><IntensityCard {runs} /></section>
</div>

<section class="efforts">
  <div class="card-head">
    <h2>{t('card.bestEfforts', { period: t(periodNames[settings.period]) })}</h2>
    <a href="#/records">{t('card.seeAllRecords')}</a>
  </div>
  {#if efforts.length === 0}
    <Card><p class="empty">{t('empty.noEfforts')}</p></Card>
  {:else}
    <div class="tiles">
      {#each efforts as effort (effort.distance)}
        <a class="tile" href="#/run/{encodeURIComponent(effort.run.id)}">
          <span class="tile-head">
            {t(effortNames[effort.distance])}
            {#if isPersonalRecord(effort.distance, effort.seconds)}
              <span class="badge">{t('card.personalRecord')}</span>
            {/if}
          </span>
          <span class="time">{formatDuration(effort.seconds)}</span>
          <span class="muted tile-foot">
            {formatShortDate(effort.run.startTime, settings.language)} · {tRunName(effort.run.name)}
          </span>
        </a>
      {/each}
    </div>
  {/if}
</section>

<Card>
  <div class="card-head">
    <h2>{t('card.recentRuns')}</h2>
    <a href="#/runs">{t('card.viewAllRuns', { count: runs.length })}</a>
  </div>
  {#if recent.length === 0}
    <p class="empty">{t('empty.noRuns')}</p>
  {:else}
    <RunsTable runs={recent.slice(0, 5)} />
  {/if}
</Card>

<CountriesCard {runs} />

<style>
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }

  .wide {
    flex: 2 1 560px;
    min-width: 0;
  }

  .narrow {
    flex: 1 1 300px;
    min-width: 0;
  }

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

  .empty {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
  }

  .efforts {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .tiles {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
  }

  .tile {
    color: inherit;
    text-decoration: none;
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
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
  }

  .badge {
    font-size: 11px;
    font-weight: 700;
    color: var(--accent-strong);
    background: var(--accent-soft);
    border-radius: var(--radius-pill);
    padding: 1px 8px;
  }

  .time {
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .tile-foot {
    font-size: 12px;
  }

  a {
    color: var(--accent-strong);
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
  }

  @media (max-width: 900px) {
    .tiles {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
