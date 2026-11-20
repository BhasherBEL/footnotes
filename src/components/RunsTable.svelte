<script lang="ts">
  import { t } from '../lib/i18n/index.svelte'
  import { settings } from '../lib/settings/settings.svelte'
  import type { RunSummary } from '../lib/types'
  import RouteMap from './charts/RouteMap.svelte'
  import {
    formatDayDate,
    formatDistance,
    formatDuration,
    formatElevation,
    formatPace,
    paceSeconds,
  } from '../lib/format'

  export type Column = 'date' | 'distance' | 'time' | 'pace' | 'ascent' | 'heartRate'

  let {
    runs,
    sort,
    onsort,
  }: {
    runs: RunSummary[]
    sort?: { column: Column; descending: boolean }
    onsort?: (column: Column) => void
  } = $props()

  const columns: { key: Column | 'name' | 'route'; label: string; numeric: boolean }[] = $derived([
    { key: 'route', label: t('table.route'), numeric: false },
    { key: 'date', label: t('table.date'), numeric: false },
    { key: 'name', label: t('table.run'), numeric: false },
    { key: 'distance', label: t('table.distance'), numeric: true },
    { key: 'time', label: t('table.time'), numeric: true },
    { key: 'pace', label: t('table.pace'), numeric: true },
    { key: 'ascent', label: t('table.ascent'), numeric: true },
    { key: 'heartRate', label: t('table.heartRate'), numeric: true },
  ])

  function runLabel(name: string): string {
    const key = `runName.${name}` as 'runName.run'
    const label = t(key)
    return label === key ? name : label
  }

  function ariaSort(column: Column | 'name' | 'route'): 'ascending' | 'descending' | 'none' {
    if (!sort || sort.column !== column) return 'none'
    return sort.descending ? 'descending' : 'ascending'
  }
</script>

<div class="wrapper">
  <table>
    <thead>
      <tr>
        {#each columns as column (column.key)}
          <th scope="col" class:numeric={column.numeric} aria-sort={ariaSort(column.key)}>
            {#if onsort && column.key !== 'name' && column.key !== 'route'}
              {@const key = column.key}
              <button type="button" onclick={() => onsort(key)}>
                {column.label}
                {#if sort && sort.column === column.key}
                  <span aria-hidden="true">{sort.descending ? '↓' : '↑'}</span>
                {/if}
              </button>
            {:else}
              {column.label}
            {/if}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each runs as run (run.id)}
        <tr>
          <td class="route">
            {#if run.route.length >= 2}
              <span class="thumb">
                <RouteMap route={run.route} width={96} height={64} strokeWidth={2} />
              </span>
            {:else}
              <span class="no-route">—</span>
            {/if}
          </td>
          <td class="date">{formatDayDate(run.startTime, settings.language)}</td>
          <td class="name">
            <a href="#/run/{encodeURIComponent(run.id)}">{runLabel(run.name)}</a>
          </td>
          <td class="numeric">{formatDistance(run.distance, settings.units, settings.language)}</td>
          <td class="numeric">{formatDuration(run.movingTime)}</td>
          <td class="numeric">
            {formatPace(paceSeconds(run.distance, run.movingTime, settings.units), settings.units)}
          </td>
          <td class="numeric">{formatElevation(run.ascent, settings.units, settings.language)}</td>
          <td class="numeric">{run.avgHeartRate ?? '—'}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .wrapper {
    min-width: 0;
    max-width: 100%;
    overflow-x: auto;
  }

  table {
    width: 100%;
    min-width: 720px;
    border-collapse: collapse;
    font-size: 14px;
    font-variant-numeric: tabular-nums;
  }

  th {
    padding: 8px;
    text-align: left;
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }

  th.numeric {
    text-align: right;
  }

  th:first-child {
    padding-left: 0;
  }

  th:last-child {
    padding-right: 0;
  }

  th button {
    border: 0;
    background: none;
    padding: 0;
    font: inherit;
    color: inherit;
    text-transform: inherit;
    letter-spacing: inherit;
    cursor: pointer;
  }

  tbody tr {
    position: relative;
    border-top: 1px solid var(--divider);
    transition: background-color 120ms ease;
  }

  tbody tr:hover,
  tbody tr:has(a:focus-visible) {
    background: var(--surface-muted);
  }

  td {
    padding: 12px 8px;
  }

  td:first-child {
    padding-left: 0;
  }

  td:last-child {
    padding-right: 0;
  }

  .date {
    color: var(--muted);
    white-space: nowrap;
  }

  td.route {
    width: 110px;
  }

  .thumb {
    display: inline-block;
    width: 96px;
    height: 64px;
  }

  .no-route {
    color: var(--muted);
  }

  .name {
    font-weight: 600;
  }

  .name a {
    color: var(--text);
    text-decoration: none;
  }

  .name a::after {
    content: '';
    position: absolute;
    inset: 0;
  }

  tbody tr:hover .name a {
    color: var(--accent-strong);
  }

  td.numeric {
    text-align: right;
    white-space: nowrap;
  }
</style>
