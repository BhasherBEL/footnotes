<script lang="ts">
  import type { Zone } from '../../lib/metrics/zones'

  let {
    zones,
    ariaLabel,
    height = 14,
    titleOf,
  }: {
    zones: Zone[]
    ariaLabel: string
    height?: number
    titleOf?: (zone: Zone) => string
  } = $props()

  const total = $derived(zones.reduce((sum, zone) => sum + zone.seconds, 0))
</script>

<div class="bar" role="img" aria-label={ariaLabel} style:height="{height}px">
  {#each zones as zone (zone.index)}
    <div
      class="segment"
      style:width="{total === 0 ? 0 : (zone.seconds / total) * 100}%"
      style:background="var(--zone-{zone.index})"
      title={titleOf !== undefined && zone.seconds > 0 ? titleOf(zone) : undefined}
    ></div>
  {/each}
</div>

<style>
  .bar {
    display: flex;
    overflow: hidden;
    gap: 2px;
    background: var(--grid);
    border-radius: var(--radius-pill);
  }

  .segment {
    min-width: 0;
  }
</style>
