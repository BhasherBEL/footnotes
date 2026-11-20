<script lang="ts">
  import { niceTicks, spread } from '../../lib/charts'

  type Bar = {
    label: string
    value: number
    valueLabel: string
    title: string
    projectedLabel?: string
    projectedTitle?: string
  }

  let {
    bars,
    caption,
    average,
    averageLabel,
    ariaLabel,
    compact = false,
    projected,
  }: {
    bars: Bar[]
    caption: string
    average: number
    averageLabel: string
    ariaLabel: string
    compact?: boolean
    projected?: number
  } = $props()

  const uid = $props.id()
  const hatchId = `${uid}-hatch`

  const width = $derived(compact ? 400 : 720)
  const height = $derived(compact ? 300 : 300)
  const padding = $derived(
    compact
      ? { top: 16, right: average > 0 ? 40 : 8, bottom: 46, left: 30 }
      : { top: 18, right: average > 0 ? 56 : 16, bottom: 48, left: 40 },
  )
  const plotWidth = $derived(width - padding.left - padding.right)
  const plotHeight = $derived(height - padding.top - padding.bottom)

  const ticks = $derived(
    niceTicks(0, Math.max(...bars.map((bar) => bar.value), projected ?? 0, 1), 5),
  )
  const top = $derived(ticks[ticks.length - 1])
  const slotWidth = $derived(plotWidth / Math.max(1, bars.length))
  const barWidth = $derived(Math.min(compact ? 36 : 96, slotWidth * 0.7))

  const lastBar = $derived(bars.length > 0 ? bars[bars.length - 1] : undefined)
  const showGhost = $derived(
    lastBar !== undefined && projected !== undefined && projected > lastBar.value,
  )

  function y(value: number): number {
    return padding.top + plotHeight - (value / top) * plotHeight
  }

  function x(index: number): number {
    return padding.left + index * slotWidth + slotWidth / 2
  }

  const longestLabel = $derived(Math.max(1, ...bars.map((bar) => bar.label.length)))
  const labelSlots = $derived(Math.max(2, Math.ceil(plotWidth / (longestLabel * 5.5 + 8))))

  function roundedRectPath(
    rectX: number,
    rectY: number,
    rectWidth: number,
    rectHeight: number,
    radius: number,
    corners: 'top' | 'bottom',
  ): string {
    const r = Math.min(radius, rectWidth / 2, rectHeight / 2)
    if (corners === 'top') {
      return [
        `M ${rectX} ${rectY + r}`,
        `A ${r} ${r} 0 0 1 ${rectX + r} ${rectY}`,
        `L ${rectX + rectWidth - r} ${rectY}`,
        `A ${r} ${r} 0 0 1 ${rectX + rectWidth} ${rectY + r}`,
        `L ${rectX + rectWidth} ${rectY + rectHeight}`,
        `L ${rectX} ${rectY + rectHeight}`,
        'Z',
      ].join(' ')
    }
    return [
      `M ${rectX} ${rectY}`,
      `L ${rectX + rectWidth} ${rectY}`,
      `L ${rectX + rectWidth} ${rectY + rectHeight - r}`,
      `A ${r} ${r} 0 0 1 ${rectX + rectWidth - r} ${rectY + rectHeight}`,
      `L ${rectX + r} ${rectY + rectHeight}`,
      `A ${r} ${r} 0 0 1 ${rectX} ${rectY + rectHeight - r}`,
      'Z',
    ].join(' ')
  }
</script>

<svg viewBox="0 0 {width} {height}" role="img" aria-label={ariaLabel}>
  <defs>
    <pattern
      id={hatchId}
      width="6"
      height="6"
      patternUnits="userSpaceOnUse"
      patternTransform="rotate(45)"
    >
      <line
        x1="3"
        y1="0"
        x2="3"
        y2="6"
        stroke="var(--accent)"
        stroke-width="1.5"
        stroke-opacity="0.45"
      />
    </pattern>
  </defs>

  {#each ticks as tick (tick)}
    <line class="grid" x1={padding.left} x2={width - padding.right} y1={y(tick)} y2={y(tick)} />
    <text class="tick" x={padding.left - 8} y={y(tick) + 4} text-anchor="end">{tick}</text>
  {/each}

  {#each bars as bar, index (index)}
    {@const barHeight = Math.max(0, padding.top + plotHeight - y(bar.value))}
    {@const isGhostBar = showGhost && index === bars.length - 1}
    {#if isGhostBar}
      <path
        class="bar latest"
        d={roundedRectPath(x(index) - barWidth / 2, y(bar.value), barWidth, barHeight, 4, 'bottom')}
      >
        <title>{bar.title}</title>
      </path>
      <path
        class="ghost"
        fill="url(#{hatchId})"
        d={roundedRectPath(
          x(index) - barWidth / 2,
          y(projected ?? 0),
          barWidth,
          Math.max(0, y(bar.value) - y(projected ?? 0)),
          4,
          'top',
        )}
      >
        <title>{bar.projectedTitle}</title>
      </path>
    {:else}
      <rect
        class="bar"
        class:latest={index === bars.length - 1}
        x={x(index) - barWidth / 2}
        y={y(bar.value)}
        width={barWidth}
        height={barHeight}
        rx="4"
      >
        <title>{bar.title}</title>
      </rect>
    {/if}
    {#if !compact && bar.value > 0 && !isGhostBar}
      <text class="value" x={x(index)} y={y(bar.value) - 6} text-anchor="middle">
        {bar.valueLabel}
      </text>
    {/if}
    {#if !compact && isGhostBar}
      <text
        class="value projected-value"
        x={x(index)}
        y={y(projected ?? 0) - 6}
        text-anchor="middle"
      >
        {bar.projectedLabel}
      </text>
    {/if}
    {#if spread(index, bars.length, labelSlots)}
      <text class="axis-label" x={x(index)} y={height - padding.bottom + 18} text-anchor="middle">
        {bar.label}
      </text>
    {/if}
  {/each}

  {#if average > 0}
    <line
      class="average"
      x1={padding.left}
      x2={width - padding.right}
      y1={y(average)}
      y2={y(average)}
    />
    <text
      class="average-label"
      x={width - 8}
      y={y(average) - 6}
      text-anchor="end"
      paint-order="stroke"
    >
      {averageLabel}
    </text>
  {/if}

  <line
    class="baseline"
    x1={padding.left}
    x2={width - padding.right}
    y1={padding.top + plotHeight}
    y2={padding.top + plotHeight}
  />
  <text class="caption" x={width / 2} y={height - 8} text-anchor="middle">{caption}</text>
</svg>

<style>
  svg {
    width: 100%;
    height: auto;
    overflow: visible;
  }

  .grid {
    stroke: var(--grid);
    stroke-width: 1;
  }

  .baseline {
    stroke: var(--axis);
    stroke-width: 1;
  }

  .bar {
    fill: var(--bar);
  }

  .bar.latest {
    fill: var(--accent);
  }

  .tick,
  .axis-label {
    fill: var(--muted);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  .value {
    fill: var(--text-2);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  .value.projected-value {
    fill: var(--muted);
  }

  .average {
    stroke: var(--muted);
    stroke-width: 1.5;
    stroke-dasharray: 5 4;
  }

  .average-label {
    fill: var(--text-2);
    stroke: var(--surface);
    stroke-width: 4px;
    stroke-linejoin: round;
    font-size: 11px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .caption {
    fill: var(--text-2);
    font-size: 12px;
  }
</style>
