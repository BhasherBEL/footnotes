<script lang="ts">
  type Option = { value: string; label: string }

  let {
    label,
    options,
    value,
    onchange,
    variant = 'default',
  }: {
    label: string
    options: Option[]
    value: string
    onchange: (value: string) => void
    variant?: 'default' | 'soft'
  } = $props()
</script>

<div class="group" class:soft={variant === 'soft'} role="group" aria-label={label}>
  {#each options as option (option.value)}
    <button
      type="button"
      aria-pressed={option.value === value}
      class:selected={option.value === value}
      onclick={() => onchange(option.value)}
    >
      {option.label}
    </button>
  {/each}
</div>

<style>
  .group {
    display: flex;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-control);
    padding: 3px;
  }

  .group.soft {
    background: var(--bg);
    border-color: transparent;
  }

  button {
    min-height: 40px;
    padding: 0 12px;
    border: 0;
    border-radius: var(--radius-inner);
    background: transparent;
    font: inherit;
    font-weight: 500;
    color: var(--text-2);
    cursor: pointer;
  }

  button.selected {
    background: var(--selected);
    font-weight: 600;
    color: var(--surface);
  }

  .soft button.selected {
    background: var(--surface);
    color: var(--text);
    box-shadow: 0 1px 2px rgb(0 0 0 / 0.1);
  }
</style>
