<script lang="ts">
  import PageHeader from '../components/PageHeader.svelte'
  import Card from '../components/Card.svelte'
  import RunsTable from '../components/RunsTable.svelte'
  import type { Column } from '../components/RunsTable.svelte'
  import { t } from '../lib/i18n/index.svelte'
  import { rangeLabel } from '../lib/rangeLabel.svelte'
  import { settings } from '../lib/settings/settings.svelte'
  import { runsState } from '../lib/data/runs.svelte'
  import { periodRange, runsInRange } from '../lib/period'
  import { paceSeconds } from '../lib/format'
  import type { RunSummary } from '../lib/types'

  const pageSize = 50

  let column = $state<Column>('date')
  let descending = $state(true)
  let shown = $state(pageSize)

  const range = $derived(periodRange(runsState.runs, settings.period))
  const runs = $derived(runsInRange(runsState.runs, range))

  function valueOf(run: RunSummary, key: Column): number {
    if (key === 'date') return new Date(run.startTime).getTime()
    if (key === 'distance') return run.distance
    if (key === 'time') return run.movingTime
    if (key === 'pace') return paceSeconds(run.distance, run.movingTime, settings.units)
    if (key === 'ascent') return run.ascent
    return run.avgHeartRate ?? -1
  }

  const sorted = $derived(
    [...runs].sort((a, b) => {
      const difference = valueOf(a, column) - valueOf(b, column)
      return descending ? -difference : difference
    }),
  )

  function sortBy(next: Column) {
    if (next === column) {
      descending = !descending
    } else {
      column = next
      descending = true
    }
    shown = pageSize
  }
</script>

<PageHeader title={t('page.runs')} range={rangeLabel(runs, range)} />

<Card>
  {#if runs.length === 0}
    <p class="empty">{t('empty.noRuns')}</p>
  {:else}
    <RunsTable runs={sorted.slice(0, shown)} sort={{ column, descending }} onsort={sortBy} />
    {#if shown < sorted.length}
      <button type="button" class="more" onclick={() => (shown += pageSize)}>
        {t('runs.showMore')}
      </button>
    {/if}
  {/if}
</Card>

<style>
  .empty {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
  }

  .more {
    align-self: center;
    min-height: 44px;
    padding: 0 20px;
    border: 1px solid var(--border);
    border-radius: var(--radius-control);
    background: var(--surface);
    color: var(--text);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }
</style>
