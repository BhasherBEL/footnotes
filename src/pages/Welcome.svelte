<script lang="ts">
  import FolderPicker from '../components/FolderPicker.svelte'
  import ImportProgress from '../components/ImportProgress.svelte'
  import { t } from '../lib/i18n/index.svelte'
  import { runsState } from '../lib/data/runs.svelte'
</script>

<section>
  <div class="card">
    <h1>{t('welcome.title')}</h1>
    <p class="lead">{t('welcome.lead')}</p>
    {#if runsState.importing}
      <ImportProgress />
    {:else}
      <div class="action">
        <FolderPicker label={t('header.openFolder')} />
      </div>
    {/if}
    <p class="hint">{t('welcome.hint')}</p>
  </div>
</section>

<style>
  section {
    display: flex;
    justify-content: center;
    padding-top: 48px;
  }

  .card {
    width: 100%;
    max-width: 520px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    padding: 32px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    text-align: center;
    align-items: center;
  }

  h1 {
    font-family: var(--font-display);
    font-size: 26px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .lead {
    margin: 0;
    color: var(--text-2);
  }

  .action {
    margin: 8px 0;
  }

  .hint {
    margin: 0;
    font-size: 12px;
    color: var(--muted);
  }
</style>
