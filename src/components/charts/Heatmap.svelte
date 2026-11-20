<script lang="ts">
  type Cell = { level: number; title: string }
  type Week = { label: string; days: Cell[] }

  let { weeks, dayLabels, ariaLabel }: { weeks: Week[]; dayLabels: string[]; ariaLabel: string } =
    $props()
</script>

<div
  class="grid"
  style:grid-template-columns="auto repeat({weeks.length}, minmax(0, 1fr))"
  style:gap="{weeks.length > 30 ? 2 : 4}px"
>
  <span></span>
  {#each weeks as week, index (index)}
    <span class="week-label">{week.label}</span>
  {/each}

  {#each dayLabels as day, row (day)}
    <span class="day-label">{row % 2 === 0 ? day : ''}</span>
    {#each weeks as week, index (index)}
      <span
        class="cell"
        style:background="var(--heat-{week.days[row].level})"
        title={week.days[row].title}
        role={week.days[row].title === '' ? undefined : 'img'}
        aria-label={week.days[row].title === '' ? undefined : week.days[row].title}
      ></span>
    {/each}
  {/each}
</div>
<span class="sr-only">{ariaLabel}</span>

<style>
  .grid {
    display: grid;
    align-items: center;
    min-width: 0;
  }

  .week-label,
  .day-label {
    font-size: 11px;
    color: var(--muted);
    white-space: nowrap;
  }

  .day-label {
    padding-right: 8px;
  }

  .cell {
    width: 100%;
    height: 12px;
    min-width: 0;
    border-radius: 3px;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
</style>
