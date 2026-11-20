<script lang="ts">
  import Segmented from './Segmented.svelte'
  import FolderPicker from './FolderPicker.svelte'
  import { t, languages } from '../lib/i18n/index.svelte'
  import { settings } from '../lib/settings/settings.svelte'
  import type { Period } from '../lib/settings/settings.svelte'
  import type { Language, Units } from '../lib/types'

  let { title, range }: { title: string; range?: string } = $props()

  const periodOptions = $derived([
    { value: '4w', label: t('period.4w') },
    { value: '12w', label: t('period.12w') },
    { value: '1y', label: t('period.1y') },
    { value: 'all', label: t('period.all') },
  ])

  const unitOptions = $derived([
    { value: 'km', label: t('units.km') },
    { value: 'mi', label: t('units.mi') },
  ])

  function setPeriod(value: string) {
    settings.period = value as Period
  }

  function setUnits(value: string) {
    settings.units = value as Units
  }

  function setLanguage(event: Event) {
    settings.language = (event.target as HTMLSelectElement).value as Language
  }
</script>

<header>
  <div class="titles">
    {#if range}
      <p class="range">{range}</p>
    {/if}
    <h1>{title}</h1>
  </div>
  <div class="controls">
    <Segmented
      label={t('period.label')}
      options={periodOptions}
      value={settings.period}
      onchange={setPeriod}
    />
    <Segmented
      label={t('units.label')}
      options={unitOptions}
      value={settings.units}
      onchange={setUnits}
    />
    <label class="language">
      {t('header.language')}
      <select value={settings.language} onchange={setLanguage}>
        {#each languages as language (language.code)}
          <option value={language.code}>{language.label}</option>
        {/each}
      </select>
    </label>
    <FolderPicker label={t('header.openFolder')} />
  </div>
</header>

<style>
  header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
  }

  .range {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
  }

  h1 {
    margin: 4px 0 0;
    font-family: var(--font-display);
    font-size: 30px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
  }

  .language {
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

  @media (max-width: 900px) {
    header {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
