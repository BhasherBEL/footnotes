<script lang="ts">
  import Card from './Card.svelte'
  import WorldMap from './charts/WorldMap.svelte'
  import { t } from '../lib/i18n/index.svelte'
  import { settings } from '../lib/settings/settings.svelte'
  import { countryAt } from '../lib/metrics/countries'
  import { loadWorld, world } from '../lib/geo/world.svelte'
  import { formatDistance } from '../lib/format'
  import type { RunSummary } from '../lib/types'

  let { runs }: { runs: RunSummary[] } = $props()

  loadWorld()

  const located = $derived.by(() => {
    const byCode = new Map<string, { code: string; name: string; runs: number; distance: number }>()
    let withoutLocation = 0
    for (const run of runs) {
      if (run.startLatitude === null || run.startLongitude === null) {
        withoutLocation++
        continue
      }
      const country = countryAt(world.countries, run.startLatitude, run.startLongitude)
      if (!country) {
        withoutLocation++
        continue
      }
      const entry = byCode.get(country.code) ?? {
        code: country.code,
        name: country.name,
        runs: 0,
        distance: 0,
      }
      entry.runs++
      entry.distance += run.distance
      byCode.set(country.code, entry)
    }
    return {
      countries: [...byCode.values()].sort((a, b) => b.runs - a.runs),
      withoutLocation,
    }
  })

  const runsByCode = $derived(
    Object.fromEntries(located.countries.map((entry) => [entry.code, entry.runs])),
  )

  const points = $derived(
    runs
      .filter((run) => run.startLatitude !== null && run.startLongitude !== null)
      .map((run) => ({
        latitude: run.startLatitude as number,
        longitude: run.startLongitude as number,
      })),
  )
</script>

<Card title={t('card.countries')}>
  {#if world.countries.length === 0}
    <p class="empty">{t('card.countriesLoading')}</p>
  {:else if located.countries.length === 0}
    <p class="empty">{t('card.countriesNone')}</p>
  {:else}
    <WorldMap
      countries={world.countries}
      {runsByCode}
      {points}
      titleOf={(country, count) => `${country.name} · ${t('chart.runCount', { count })}`}
      ariaLabel={t('chart.mapAria', { count: located.countries.length })}
    />
    <div class="countries">
      {#each located.countries as country (country.code)}
        <div class="country">
          <span class="country-name">{country.name}</span>
          <span class="country-runs">{t('chart.runCount', { count: country.runs })}</span>
          <span class="country-runs">
            {formatDistance(country.distance, settings.units, settings.language)}
          </span>
        </div>
      {/each}
      {#if located.withoutLocation > 0}
        <div class="country">
          <span class="country-name">{t('card.noLocation')}</span>
          <span class="country-runs">
            {t('chart.runCount', { count: located.withoutLocation })}
          </span>
        </div>
      {/if}
    </div>
  {/if}
</Card>

<style>
  .countries {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
  }

  .country {
    display: flex;
    align-items: baseline;
    gap: 12px;
    padding: 6px 0;
    border-top: 1px solid var(--divider);
  }

  .country:first-child {
    border-top: 0;
  }

  .country-name {
    flex: 1;
    font-weight: 600;
  }

  .country-runs {
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  .empty {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
  }
</style>
