<script lang="ts">
  import PageHeader from '../components/PageHeader.svelte'
  import Card from '../components/Card.svelte'
  import { t, tRunName } from '../lib/i18n/index.svelte'
  import { settings } from '../lib/settings/settings.svelte'
  import { runsState } from '../lib/data/runs.svelte'
  import { effortsFor } from '../lib/metrics/records'
  import { EFFORT_METERS } from '../lib/types'
  import type { EffortDistance } from '../lib/types'
  import { formatDayDate, formatDuration, formatPace, paceSeconds } from '../lib/format'

  const effortNames = {
    '400': 'effort.400',
    '1k': 'effort.1k',
    '5k': 'effort.5k',
    '10k': 'effort.10k',
    half: 'effort.half',
    marathon: 'effort.marathon',
  } as const

  const distances = Object.keys(EFFORT_METERS) as EffortDistance[]

  const top = $derived(
    distances.map((distance) => ({
      distance,
      efforts: effortsFor(runsState.runs, distance).slice(0, 3),
    })),
  )
</script>

<PageHeader title={t('page.records')} />

{#each top as group (group.distance)}
  <Card>
    <h2>{t(effortNames[group.distance])}</h2>
    {#if group.efforts.length === 0}
      <p class="empty">{t('records.none')}</p>
    {:else}
      <ol>
        {#each group.efforts as effort, index (effort.run.id)}
          <li>
            <a class="row" href="#/run/{encodeURIComponent(effort.run.id)}">
              <span class="rank">{index + 1}</span>
              <span class="time">{formatDuration(effort.seconds)}</span>
              <span class="pace">
                {formatPace(
                  paceSeconds(EFFORT_METERS[group.distance], effort.seconds, settings.units),
                  settings.units,
                )}
              </span>
              <span class="date">{formatDayDate(effort.run.startTime, settings.language)}</span>
              <span class="run">{tRunName(effort.run.name)}</span>
            </a>
          </li>
        {/each}
      </ol>
    {/if}
  </Card>
{/each}

<style>
  h2 {
    font-size: 16px;
    font-weight: 600;
  }

  ol {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
  }

  li {
    border-top: 1px solid var(--divider);
  }

  li:first-child {
    border-top: 0;
  }

  li:hover,
  li:has(.row:focus-visible) {
    background: var(--surface-muted);
  }

  .row {
    display: flex;
    align-items: baseline;
    gap: 16px;
    padding: 12px 0;
    font-variant-numeric: tabular-nums;
    color: inherit;
    text-decoration: none;
  }

  .rank {
    width: 20px;
    color: var(--muted);
    font-size: 13px;
  }

  .time {
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 600;
    min-width: 92px;
  }

  .pace {
    color: var(--muted);
    min-width: 90px;
  }

  .date {
    color: var(--muted);
    min-width: 110px;
  }

  .run {
    flex: 1;
    font-weight: 600;
  }

  .empty {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
  }

  @media (max-width: 600px) {
    .row {
      flex-wrap: wrap;
      gap: 8px 12px;
    }

    .date {
      flex: none;
    }
  }
</style>
