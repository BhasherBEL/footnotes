<script lang="ts">
  import Card from './Card.svelte'
  import ZoneBar from './charts/ZoneBar.svelte'
  import { t } from '../lib/i18n/index.svelte'
  import { settings } from '../lib/settings/settings.svelte'
  import { runsState } from '../lib/data/runs.svelte'
  import { heartProfile } from '../lib/settings/heartProfile'
  import { easyShare, totalHeartRateSeconds, zonesOf } from '../lib/metrics/zones'
  import type { Zone } from '../lib/metrics/zones'
  import { formatHoursMinutes, formatPercent } from '../lib/format'
  import type { RunSummary } from '../lib/types'

  let { runs }: { runs: RunSummary[] } = $props()

  const zoneNames = ['zone.1', 'zone.2', 'zone.3', 'zone.4', 'zone.5'] as const
  const periodNames = {
    '4w': 'period.last4w',
    '12w': 'period.last12w',
    '1y': 'period.last1y',
    all: 'period.lastAll',
  } as const

  const profile = $derived(heartProfile(runsState.runs, settings))
  const zones = $derived(
    profile.zoneFloors === null ? [] : zonesOf(totalHeartRateSeconds(runs), profile.zoneFloors),
  )
  const zoneSeconds = $derived(zones.reduce((sum, zone) => sum + zone.seconds, 0))

  function zoneTitle(zone: Zone): string {
    const share = zoneSeconds === 0 ? 0 : zone.seconds / zoneSeconds
    return `Z${zone.index} ${t(zoneNames[zone.index - 1])} · ${formatPercent(share, settings.language)}`
  }
</script>

<Card>
  <div>
    <h2>{t('card.intensity', { period: t(periodNames[settings.period]) })}</h2>
    <p class="muted subtitle">
      {t('card.intensitySubtitle', { total: formatHoursMinutes(zoneSeconds) })}
    </p>
  </div>
  {#if zoneSeconds === 0}
    <p class="empty">{t('empty.noHeartRate')}</p>
  {:else}
    <div class="headline">
      <span class="big">{formatPercent(easyShare(zones), settings.language)}</span>
      <span class="muted">{t('card.easyTarget')}</span>
    </div>
    <ZoneBar
      {zones}
      ariaLabel={t('chart.zonesAria', {
        easy: formatPercent(easyShare(zones), settings.language),
      })}
      titleOf={zoneTitle}
    />
    <div class="zone-rows">
      {#each zones.filter((zone) => zone.seconds > 0) as zone (zone.index)}
        <div class="zone-row">
          <span class="swatch" style:background="var(--zone-{zone.index})"></span>
          <span class="zone-name">
            Z{zone.index}
            {t(zoneNames[zone.index - 1])} ·
            {zone.ceiling === null ? `≥${zone.floor}` : `${zone.floor}–${zone.ceiling}`}
          </span>
          <span class="muted num">{formatHoursMinutes(zone.seconds)}</span>
          <span class="share">
            {formatPercent(zone.seconds / zoneSeconds, settings.language)}
          </span>
        </div>
      {/each}
    </div>
  {/if}
  <span class="muted footnote">
    {#if profile.thresholdHeartRate.value !== null}
      {t('card.zonesFrom', { threshold: profile.thresholdHeartRate.value })}
    {/if}
    <a href="#/settings">{t('card.editInSettings')}</a>
  </span>
</Card>

<style>
  h2 {
    font-size: 16px;
    font-weight: 600;
  }

  .subtitle {
    margin: 2px 0 0;
    font-size: 13px;
  }

  .muted {
    color: var(--muted);
    font-size: 13px;
  }

  .headline {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .big {
    font-family: var(--font-display);
    font-size: 32px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
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

  .num {
    font-variant-numeric: tabular-nums;
  }

  .share {
    width: 40px;
    text-align: right;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .footnote {
    margin-top: auto;
    font-size: 12px;
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
