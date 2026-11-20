<script lang="ts">
  import PageHeader from '../components/PageHeader.svelte'
  import Card from '../components/Card.svelte'
  import Segmented from '../components/Segmented.svelte'
  import DataFolder from '../components/DataFolder.svelte'
  import { t, languages } from '../lib/i18n/index.svelte'
  import { settings } from '../lib/settings/settings.svelte'
  import { runsState, forgetEverything } from '../lib/data/runs.svelte'
  import { heartProfile, zoneHrrPercentages } from '../lib/settings/heartProfile'
  import type { ProfileSource } from '../lib/settings/heartProfile'
  import type { Language, Units } from '../lib/types'

  const sourceNames = {
    user: 'settings.sourceUser',
    files: 'settings.sourceFiles',
    estimated: 'settings.sourceEstimated',
    none: 'settings.sourceNone',
  } as const

  const zoneNames = ['zone.1', 'zone.2', 'zone.3', 'zone.4', 'zone.5'] as const
  const sourceCodeUrl = 'https://github.com/search?q=footnotes'

  const profile = $derived(heartProfile(runsState.runs, settings))
  const floors = $derived(profile.zoneFloors ?? [0, 0, 0, 0, 0])

  let confirming = $state(false)

  const floorsValid = $derived(
    floors[0] < floors[1] &&
      floors[1] < floors[2] &&
      floors[2] < floors[3] &&
      floors[3] < floors[4],
  )

  function setHeartRate(
    field: 'maxHeartRate' | 'restingHeartRate' | 'thresholdHeartRate',
    raw: string,
  ) {
    const value = Number(raw)
    settings[field] = raw === '' || !Number.isFinite(value) || value <= 0 ? null : Math.round(value)
  }

  function setFloor(index: number, raw: string) {
    const value = Number(raw)
    if (!Number.isFinite(value)) return
    const next: [number, number, number, number, number] = [...floors] as [
      number,
      number,
      number,
      number,
      number,
    ]
    next[index] = Math.round(value)
    settings.zoneFloors = next
  }

  function resetDetected() {
    settings.maxHeartRate = null
    settings.restingHeartRate = null
    settings.thresholdHeartRate = null
    settings.zoneFloors = null
    settings.referenceHeartRate = null
  }

  function sourceLabel(source: ProfileSource): string {
    return t(sourceNames[source])
  }

  async function clearData() {
    await forgetEverything()
    confirming = false
  }
</script>

<PageHeader title={t('page.settings')} />

<Card title={t('settings.display')}>
  <div class="field">
    <label for="language">{t('header.language')}</label>
    <select
      id="language"
      value={settings.language}
      onchange={(event) => (settings.language = event.currentTarget.value as Language)}
    >
      {#each languages as language (language.code)}
        <option value={language.code}>{language.label}</option>
      {/each}
    </select>
  </div>
  <div class="field">
    <span class="label">{t('units.label')}</span>
    <Segmented
      label={t('units.label')}
      options={[
        { value: 'km', label: t('units.km') },
        { value: 'mi', label: t('units.mi') },
      ]}
      value={settings.units}
      onchange={(value) => (settings.units = value as Units)}
    />
  </div>
</Card>

<Card title={t('settings.heartRate')}>
  <div class="field">
    <label for="max-hr">{t('settings.maxHeartRate')}</label>
    <div class="value">
      <input
        id="max-hr"
        type="number"
        min="100"
        max="240"
        value={profile.maxHeartRate.value ?? ''}
        onchange={(event) => setHeartRate('maxHeartRate', event.currentTarget.value)}
      />
      <span class="source">{sourceLabel(profile.maxHeartRate.source)}</span>
    </div>
  </div>
  <div class="field">
    <label for="resting-hr">{t('settings.restingHeartRate')}</label>
    <div class="value">
      <input
        id="resting-hr"
        type="number"
        min="25"
        max="120"
        value={profile.restingHeartRate.value ?? ''}
        onchange={(event) => setHeartRate('restingHeartRate', event.currentTarget.value)}
      />
      <span class="source">{sourceLabel(profile.restingHeartRate.source)}</span>
    </div>
  </div>
  <div class="field">
    <label for="threshold-hr">{t('settings.thresholdHeartRate')}</label>
    <div class="value">
      <input
        id="threshold-hr"
        type="number"
        min="100"
        max="220"
        value={profile.thresholdHeartRate.value ?? ''}
        onchange={(event) => setHeartRate('thresholdHeartRate', event.currentTarget.value)}
      />
      <span class="source">{sourceLabel(profile.thresholdHeartRate.source)}</span>
    </div>
  </div>

  {#if profile.zoneFloors !== null}
    <h3>{t('settings.zoneFloors')}</h3>
    <div class="zones">
      {#each zoneHrrPercentages as percent, index (index)}
        <div class="zone-field">
          <label for="floor-{index}">
            Z{index + 1}
            {t(zoneNames[index])} ·
            {t('settings.zoneFloorHrr', { percent })}
          </label>
          <input
            id="floor-{index}"
            type="number"
            min="60"
            max="230"
            value={floors[index]}
            onchange={(event) => setFloor(index, event.currentTarget.value)}
          />
        </div>
      {/each}
    </div>
    {#if !floorsValid}
      <p class="error" role="alert">{t('settings.zoneFloorsError')}</p>
    {/if}
    <div class="actions">
      <button type="button" class="secondary" onclick={resetDetected}>
        {t('settings.resetDetected')}
      </button>
    </div>
  {/if}

  <div class="field">
    <label for="reference-hr">{t('settings.referenceHeartRate')}</label>
    <select
      id="reference-hr"
      value={String(profile.referenceHeartRate ?? '')}
      onchange={(event) => (settings.referenceHeartRate = Number(event.currentTarget.value))}
    >
      {#each Array.from({ length: 13 }, (_, index) => 120 + index * 5) as beats (beats)}
        <option value={String(beats)}>{beats} bpm</option>
      {/each}
    </select>
  </div>
</Card>

<Card title={t('settings.data')}>
  <p class="count">{t('settings.cachedRuns', { count: runsState.runs.length })}</p>
  <div class="mobile-folder"><DataFolder /></div>
  {#if confirming}
    <p class="confirm">{t('settings.clearConfirm')}</p>
    <div class="actions">
      <button type="button" class="danger" onclick={clearData}>{t('settings.clearYes')}</button>
      <button type="button" class="secondary" onclick={() => (confirming = false)}>
        {t('settings.clearNo')}
      </button>
    </div>
  {:else}
    <div class="actions">
      <button type="button" class="secondary" onclick={() => (confirming = true)}>
        {t('settings.clear')}
      </button>
    </div>
  {/if}
</Card>

<Card title={t('settings.about')}>
  <a href={sourceCodeUrl} rel="noreferrer">{t('settings.sourceCode')}</a>
</Card>

<style>
  .field {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 0;
    border-top: 1px solid var(--divider);
  }

  .field:first-of-type {
    border-top: 0;
  }

  .label,
  label {
    font-weight: 500;
  }

  .value {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .source {
    font-size: 12px;
    color: var(--muted);
  }

  select,
  input {
    min-height: 46px;
    padding: 0 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-control);
    background: var(--surface);
    font: inherit;
    color: var(--text);
  }

  input[type='number'] {
    width: 96px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  h3 {
    margin: 12px 0 0;
    font-size: 14px;
    font-weight: 600;
  }

  .zones {
    margin-top: 4px;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .zone-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
  }

  .error {
    margin: 0;
    font-size: 13px;
    color: #b42318;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .secondary,
  .danger {
    min-height: 44px;
    padding: 0 16px;
    border-radius: var(--radius-control);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  .secondary {
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
  }

  .danger {
    border: 0;
    background: #b42318;
    color: var(--surface);
  }

  .count,
  .confirm {
    margin: 0;
    font-size: 13px;
  }

  a {
    color: var(--accent-strong);
    font-weight: 600;
    text-decoration: none;
  }

  .mobile-folder {
    display: none;
  }

  @media (max-width: 900px) {
    .mobile-folder {
      display: block;
    }
  }
</style>
