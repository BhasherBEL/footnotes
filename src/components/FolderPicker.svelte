<script lang="ts">
  import Icon from './Icon.svelte'
  import { importFiles } from '../lib/data/importFolder'
  import { runsState } from '../lib/data/runs.svelte'

  let { label, variant = 'primary' }: { label: string; variant?: 'primary' | 'secondary' } =
    $props()

  let input: HTMLInputElement

  async function onpick(event: Event) {
    const target = event.target as HTMLInputElement
    await importFiles([...(target.files ?? [])])
    target.value = ''
  }
</script>

<button type="button" class={variant} disabled={runsState.importing} onclick={() => input.click()}>
  {#if variant === 'primary'}
    <Icon name="folder" />
  {/if}
  {label}
</button>
<input
  bind:this={input}
  type="file"
  multiple
  webkitdirectory
  accept=".fit"
  onchange={onpick}
  aria-hidden="true"
  tabindex="-1"
/>

<style>
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 46px;
    padding: 0 16px;
    border-radius: var(--radius-control);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.6;
    cursor: progress;
  }

  .primary {
    border: 0;
    background: var(--accent);
    color: var(--surface);
  }

  .secondary {
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    min-height: 44px;
  }

  input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
</style>
