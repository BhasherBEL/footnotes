<script lang="ts">
  import { decimalsFor, niceTicks, spread } from '../../lib/charts'

  type Point = { x: number; y: number; title: string }

  let {
    points,
    trend,
    xLabels,
    yCaption,
    xCaption,
    formatY,
    invertY = false,
    ariaLabel,
    maxXLabels = 7,
  }: {
    points: Point[]
    trend: { x: number; y: number }[]
    xLabels: { x: number; label: string }[]
    yCaption: string
    xCaption: string
    formatY: (value: number, decimals: number) => string
    invertY?: boolean
    ariaLabel: string
    maxXLabels?: number
  } = $props()

  const compact = $derived(maxXLabels <= 4)
  const width = $derived(compact ? 420 : 980)
  const height = $derived(compact ? 320 : 380)
  const padding = $derived(
    compact
      ? { top: 12, right: 12, bottom: 54, left: 56 }
      : { top: 16, right: 24, bottom: 62, left: 86 },
  )
  const plotWidth = $derived(width - padding.left - padding.right)
  const plotHeight = $derived(height - padding.top - padding.bottom)

  const values = $derived(points.map((point) => point.y).concat(trend.map((point) => point.y)))
  const ticks = $derived(niceTicks(Math.min(...values), Math.max(...values), 5))
  const low = $derived(ticks[0])
  const high = $derived(ticks[ticks.length - 1])
  const tickStep = $derived(ticks.length > 1 ? ticks[1] - ticks[0] : 1)
  const tickDecimals = $derived(decimalsFor(tickStep))

  const xValues = $derived(points.map((point) => point.x).concat(trend.map((point) => point.x)))
  const xMin = $derived(Math.min(...xValues))
  const xMax = $derived(Math.max(...xValues))

  function x(value: number): number {
    if (xMax === xMin) return padding.left + plotWidth / 2
    return padding.left + ((value - xMin) / (xMax - xMin)) * plotWidth
  }

  function y(value: number): number {
    const share = (value - low) / (high - low)
    const fromTop = invertY ? share : 1 - share
    return padding.top + fromTop * plotHeight
  }

  const trendPath = $derived(
    trend.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.x)} ${y(point.y)}`).join(' '),
  )
</script>

<svg viewBox="0 0 {width} {height}" role="img" aria-label={ariaLabel}>
  {#each ticks as tick (tick)}
    <line class="grid" x1={padding.left} x2={width - padding.right} y1={y(tick)} y2={y(tick)} />
    <text class="tick" x={padding.left - 10} y={y(tick) + 4} text-anchor="end"
      >{formatY(tick, tickDecimals)}</text
    >
  {/each}

  <text
    class="caption"
    transform="translate({compact ? 14 : 22} {padding.top + plotHeight / 2}) rotate(-90)"
    text-anchor="middle">{yCaption}</text
  >

  {#each points as point, index (index)}
    <circle class="point" cx={x(point.x)} cy={y(point.y)} r={compact ? 3.5 : 4.5}>
      <title>{point.title}</title>
    </circle>
  {/each}

  {#if trend.length > 1}
    <path class="trend" d={trendPath} />
  {/if}

  <line
    class="baseline"
    x1={padding.left}
    x2={width - padding.right}
    y1={padding.top + plotHeight}
    y2={padding.top + plotHeight}
  />

  {#each xLabels as label, index (label.label)}
    {#if spread(index, xLabels.length, maxXLabels)}
      <line
        class="baseline"
        x1={x(label.x)}
        x2={x(label.x)}
        y1={padding.top + plotHeight}
        y2={padding.top + plotHeight + 5}
      />
      <text
        class="tick"
        x={x(label.x)}
        y={padding.top + plotHeight + 22}
        text-anchor={index === 0 ? 'start' : index === xLabels.length - 1 ? 'end' : 'middle'}
      >
        {label.label}
      </text>
    {/if}
  {/each}

  <text class="caption" x={width / 2} y={height - 10} text-anchor="middle">{xCaption}</text>
</svg>

<style>
  svg {
    width: 100%;
    height: auto;
  }

  .grid {
    stroke: var(--grid);
    stroke-width: 1;
  }

  .baseline {
    stroke: var(--axis);
    stroke-width: 1;
  }

  .point {
    fill: var(--point);
  }

  .trend {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .tick {
    fill: var(--muted);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  .caption {
    fill: var(--text-2);
    font-size: 12px;
  }
</style>
