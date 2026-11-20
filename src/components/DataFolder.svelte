<script lang="ts">
  import FolderPicker from './FolderPicker.svelte'
  import { t } from '../lib/i18n/index.svelte'
  import { settings } from '../lib/settings/settings.svelte'
  import { runsState } from '../lib/data/runs.svelte'
  import { formatShortDate, formatTime } from '../lib/format'

  const scanned = $derived.by(() => {
    if (!runsState.folder) return ''
    const when = runsState.folder.scannedAt
    const sameDay = new Date(when).toDateString() === new Date().toDateString()
    const day = sameDay ? t('folder.today') : formatShortDate(when, settings.language)
    return `${day} ${formatTime(when, settings.language)}`
  })
</script>

{#if runsState.folder}
  <div class="folder">
    <span class="caption">{t('folder.title')}</span>
    <span class="name">{runsState.folder.name}</span>
    <span class="meta">
      {t('folder.summary', { count: runsState.runs.length, scanned })}
    </span>
    <FolderPicker label={t('folder.rescan')} variant="secondary" />
  </div>
{/if}

<style>
  .folder {
    margin-top: auto;
    background: var(--surface-muted);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .caption {
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .name {
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .meta {
    font-size: 13px;
    color: var(--muted);
  }
</style>
