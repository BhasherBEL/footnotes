<script lang="ts">
  import { t } from '../lib/i18n/index.svelte'
  import { dismissSkipped, runsState } from '../lib/data/runs.svelte'

  const reasons = {
    'not-fit': 'skip.notFit',
    'not-running': 'skip.notRunning',
    'too-short': 'skip.tooShort',
    error: 'skip.error',
  } as const
</script>

{#if runsState.skipped.length > 0}
  <details>
    <summary>{t('import.skipped', { count: runsState.skipped.length })}</summary>
    <button type="button" class="dismiss" aria-label={t('skip.dismiss')} onclick={dismissSkipped}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M6 6l12 12M18 6L6 18"></path>
      </svg>
    </button>
    <ul>
      {#each runsState.skipped as file (file.key)}
        <li>
          <span class="name">{file.name}</span>
          <span class="reason">{t(reasons[file.reason])}</span>
        </li>
      {/each}
    </ul>
  </details>
{/if}

<style>
  details {
    position: relative;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-card);
    padding: 12px 20px;
  }

  summary {
    cursor: pointer;
    font-size: 13px;
    color: var(--muted);
    padding-right: 36px;
  }

  .dismiss {
    position: absolute;
    top: 8px;
    right: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    background: none;
    border: none;
    border-radius: var(--radius-control);
    color: var(--muted);
    cursor: pointer;
  }

  .dismiss:hover {
    color: var(--text-2);
  }

  ul {
    margin: 12px 0 4px;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 220px;
    overflow-y: auto;
  }

  li {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    font-size: 13px;
  }

  .name {
    color: var(--text-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .reason {
    color: var(--muted);
    white-space: nowrap;
  }
</style>
