<script lang="ts">
  import { t } from '../lib/i18n/index.svelte'
  import { runsState } from '../lib/data/runs.svelte'

  const share = $derived(runsState.total === 0 ? 0 : runsState.done / runsState.total)
</script>

<div class="progress">
  <p>{t('import.reading', { done: runsState.done, total: runsState.total })}</p>
  <div
    class="track"
    role="progressbar"
    aria-valuenow={runsState.done}
    aria-valuemin="0"
    aria-valuemax={runsState.total}
  >
    <div class="fill" style:width="{share * 100}%"></div>
  </div>
</div>

<style>
  .progress {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
  }

  .track {
    height: 8px;
    border-radius: var(--radius-pill);
    background: var(--grid);
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: var(--accent);
    border-radius: var(--radius-pill);
    transition: width 120ms linear;
  }
</style>
