<script lang="ts">
  import { colorSegments, decimalsFor, niceTicks } from '../../lib/charts'

  type SeriesPoint = { x: number; value: number | null }
  type SmoothPoint = { x: number; value: number }
  type ValuePoint = { x: number; value: number }
  type Band = { from: number; to: number; color: string }
  type Tick = { x: number; label: string }

  let {
    points,
    smoothed = [],
    bands = [],
    invertY = false,
    area = false,
    xTicks,
    xCaption,
    formatValue,
    formatX,
    yCaption,
    ariaLabel,
    compact = false,
    colorOf,
    yMin,
  }: {
    points: SeriesPoint[]
    smoothed?: SmoothPoint[]
    bands?: Band[]
    invertY?: boolean
    area?: boolean
    xTicks: Tick[]
    xCaption: string
    formatValue: (value: number, decimals: number) => string
    formatX: (x: number) => string
    yCaption: string
    ariaLabel: string
    compact?: boolean
    colorOf?: (value: number) => string
    yMin?: number
  } = $props()

  const uid = $props.id()
  const areaGradientId = `${uid}-speed-area`
  const underTraceClipId = `${uid}-under-trace`
  const plotClipId = `${uid}-plot`

  const width = $derived(compact ? 420 : 980)
  const height = $derived(compact ? 180 : 220)

  const values = $derived(
    points
      .map((point) => point.value)
      .concat(smoothed.map((point) => point.value))
      .filter((value): value is number => value !== null),
  )
  const dataMax = $derived(values.length > 0 ? Math.max(...values) : 0)
  const dataMin = $derived(values.length > 0 ? Math.min(...values) : 0)
  const cropFloor = $derived(
    yMin !== undefined && dataMin < yMin && yMin < dataMax ? yMin : undefined,
  )
  const tickMin = $derived(cropFloor ?? dataMin)
  const ticks = $derived(
    niceTicks(values.length > 0 ? tickMin : 0, values.length > 0 ? Math.max(...values) : 1, 5),
  )
  const low = $derived(cropFloor === undefined ? ticks[0] : Math.max(ticks[0], cropFloor))
  const high = $derived(ticks[ticks.length - 1])
  const tickStep = $derived(ticks.length > 1 ? ticks[1] - ticks[0] : 1)
  const tickDecimals = $derived(decimalsFor(tickStep))
  const tickLabels = $derived(ticks.map((tick) => formatValue(tick, tickDecimals)))
  const longestTick = $derived(Math.max(...tickLabels.map((label) => label.length), 1))

  const captionGutter = $derived(compact ? 16 : 20)
  const tickLabelWidth = $derived(longestTick * 6.5)
  const leftPadding = $derived(captionGutter + tickLabelWidth + 8)
  const padding = $derived(
    compact
      ? { top: 10, right: 10, bottom: 34, left: leftPadding }
      : { top: 16, right: 20, bottom: 40, left: leftPadding },
  )
  const plotWidth = $derived(width - padding.left - padding.right)
  const plotHeight = $derived(height - padding.top - padding.bottom)

  const visibleBands = $derived(bands.filter((band) => band.from <= dataMax && band.to >= dataMin))
  const xValues = $derived(points.map((point) => point.x))
  const xMin = $derived(xValues.length > 0 ? Math.min(...xValues) : 0)
  const xMax = $derived(xValues.length > 0 ? Math.max(...xValues) : 1)

  function x(value: number): number {
    if (xMax === xMin) return padding.left + plotWidth / 2
    return padding.left + ((value - xMin) / (xMax - xMin)) * plotWidth
  }

  function y(value: number): number {
    const share = (value - low) / (high - low)
    const fromTop = invertY ? share : 1 - share
    return padding.top + fromTop * plotHeight
  }

  function rawSegments(list: SeriesPoint[]): ValuePoint[][] {
    const groups: ValuePoint[][] = []
    let current: ValuePoint[] = []
    for (const point of list) {
      if (point.value === null) {
        if (current.length > 0) groups.push(current)
        current = []
      } else {
        current.push({ x: point.x, value: point.value })
      }
    }
    if (current.length > 0) groups.push(current)
    return groups
  }

  function linePath(segment: ValuePoint[]): string {
    return segment
      .map((point, index) => `${index === 0 ? 'M' : 'L'}${x(point.x)} ${y(point.value)}`)
      .join(' ')
  }

  function areaPath(segment: ValuePoint[]): string {
    const bottom = padding.top + plotHeight
    const first = segment[0]
    const last = segment[segment.length - 1]
    return `${linePath(segment)} L${x(last.x)} ${bottom} L${x(first.x)} ${bottom} Z`
  }

  function clampBand(band: Band): { from: number; to: number } | null {
    const from = Math.max(low, band.from)
    const to = Math.min(high, band.to)
    if (to <= from) return null
    return { from, to }
  }

  const segments = $derived(rawSegments(points))
  const hitPoints = $derived(points.filter((point): point is ValuePoint => point.value !== null))

  let hovered = $state<ValuePoint | null>(null)

  function nearestHitPoint(vx: number): ValuePoint | null {
    let nearest: ValuePoint | null = null
    let nearestDistance = Infinity
    for (const point of hitPoints) {
      const distance = Math.abs(x(point.x) - vx)
      if (distance < nearestDistance) {
        nearest = point
        nearestDistance = distance
      }
    }
    return nearest
  }

  function handlePointerMove(event: PointerEvent): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    if (rect.width === 0) return
    const vx = ((event.clientX - rect.left) / rect.width) * width
    hovered = nearestHitPoint(vx)
  }

  function handlePointerLeave(): void {
    hovered = null
  }

  const hoverLabel = $derived(hovered === null ? '' : formatX(hovered.x))
  const hoverValue = $derived(hovered === null ? '' : formatValue(hovered.value, tickDecimals))
  const hoverBoxWidth = $derived(
    Math.max(56, Math.max(hoverLabel.length, hoverValue.length) * 6.5 + 20),
  )
  const hoverBoxHeight = $derived(compact ? 34 : 38)
  const hoverBarX = $derived(hovered === null ? 0 : x(hovered.x))
  const hoverFlip = $derived(hoverBarX > padding.left + (plotWidth * 2) / 3)
  const hoverBoxX = $derived(hoverFlip ? hoverBarX - 8 - hoverBoxWidth : hoverBarX + 8)
  const hoverDotColor = $derived(
    hovered === null ? 'var(--accent)' : colorOf ? colorOf(hovered.value) : 'var(--accent)',
  )
</script>

<div
  class="chart-wrap"
  role="presentation"
  onpointermove={handlePointerMove}
  onpointerleave={handlePointerLeave}
>
  <svg viewBox="0 0 {width} {height}" role="img" aria-label={ariaLabel}>
    <title>{ariaLabel}</title>

    <defs>
      <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--accent)" stop-opacity="0.28" />
        <stop offset="1" stop-color="var(--accent)" stop-opacity="0" />
      </linearGradient>
      <clipPath id={underTraceClipId}>
        {#each segments as segment, index (index)}
          <path d={areaPath(segment)} />
        {/each}
      </clipPath>
      <clipPath id={plotClipId}>
        <rect x={padding.left} y={padding.top} width={plotWidth} height={plotHeight} />
      </clipPath>
    </defs>

    <g clip-path="url(#{underTraceClipId})">
      {#each visibleBands as band (band.color)}
        {@const clamped = clampBand(band)}
        {#if clamped}
          {@const yTo = y(clamped.to)}
          {@const yFrom = y(clamped.from)}
          <rect
            class="band"
            x={padding.left}
            width={plotWidth}
            y={Math.min(yTo, yFrom)}
            height={Math.abs(yFrom - yTo)}
            fill={band.color}
          />
        {/if}
      {/each}
    </g>

    {#each visibleBands as band (band.color)}
      {#if band.from > low && band.from < high}
        <line
          class="zone-floor"
          x1={padding.left}
          x2={width - padding.right}
          y1={y(band.from)}
          y2={y(band.from)}
          stroke={band.color}
        />
      {/if}
    {/each}

    {#each ticks as tick, index (tick)}
      {#if tick >= low}
        <line class="grid" x1={padding.left} x2={width - padding.right} y1={y(tick)} y2={y(tick)} />
        <text class="tick" x={padding.left - 8} y={y(tick) + 4} text-anchor="end"
          >{tickLabels[index]}</text
        >
      {/if}
    {/each}

    <text
      class="caption"
      transform="translate({captionGutter / 2} {padding.top + plotHeight / 2}) rotate(-90)"
      text-anchor="middle">{yCaption}</text
    >

    <g clip-path="url(#{plotClipId})">
      {#if smoothed.length > 1}
        <path class="smoothed-area" fill="url(#{areaGradientId})" d={areaPath(smoothed)} />
        <path class="smoothed" d={linePath(smoothed)} />
      {:else if area}
        {#each segments as segment, index (index)}
          <path class="smoothed-area" fill="url(#{areaGradientId})" d={areaPath(segment)} />
        {/each}
      {/if}

      {#each segments as segment, index (index)}
        {#if colorOf}
          {#each colorSegments(segment, colorOf) as piece, pieceIndex (pieceIndex)}
            <path class="line" style:stroke={piece.color} d={linePath(piece.points)} />
          {/each}
        {:else}
          <path class="line" d={linePath(segment)} />
        {/if}
      {/each}
    </g>

    <line
      class="baseline"
      x1={padding.left}
      x2={width - padding.right}
      y1={padding.top + plotHeight}
      y2={padding.top + plotHeight}
    />

    {#each xTicks as tick (tick.x)}
      <line
        class="baseline"
        x1={x(tick.x)}
        x2={x(tick.x)}
        y1={padding.top + plotHeight}
        y2={padding.top + plotHeight + 5}
      />
      <text class="tick" x={x(tick.x)} y={padding.top + plotHeight + 22} text-anchor="middle"
        >{tick.label}</text
      >
    {/each}

    <text class="caption" x={width / 2} y={height - 6} text-anchor="middle">{xCaption}</text>

    {#if hovered !== null}
      <line
        class="hover-line"
        x1={hoverBarX}
        x2={hoverBarX}
        y1={padding.top}
        y2={padding.top + plotHeight}
      />
      <g clip-path="url(#{plotClipId})">
        <circle
          class="hover-dot"
          cx={hoverBarX}
          cy={y(hovered.value)}
          r={compact ? 4 : 5}
          fill={hoverDotColor}
        />
      </g>
      <g class="hover-readout">
        <rect x={hoverBoxX} y={padding.top} width={hoverBoxWidth} height={hoverBoxHeight} rx="6" />
        <text class="hover-text label" x={hoverBoxX + 8} y={padding.top + 15}>{hoverLabel}</text>
        <text class="hover-text value" x={hoverBoxX + 8} y={padding.top + 29}>{hoverValue}</text>
      </g>
    {/if}
  </svg>
</div>

<style>
  .chart-wrap {
    display: block;
    line-height: 0;
  }

  svg {
    width: 100%;
    height: auto;
  }

  .band {
    fill-opacity: 0.3;
  }

  .zone-floor {
    stroke-width: 1.5;
    stroke-opacity: 0.55;
    stroke-dasharray: 6 4;
  }

  .grid {
    stroke: var(--grid);
    stroke-width: 1;
  }

  .baseline {
    stroke: var(--axis);
    stroke-width: 1;
  }

  .line {
    fill: none;
    stroke: var(--accent);
    stroke-width: 1.75;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .smoothed {
    fill: none;
    stroke: var(--point);
    stroke-width: 3.5;
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

  .hover-line {
    stroke: var(--axis);
    stroke-width: 1;
  }

  .hover-dot {
    stroke: var(--surface);
    stroke-width: 1.5;
  }

  .hover-readout rect {
    fill: var(--surface);
    stroke: var(--border);
    stroke-width: 1;
  }

  .hover-text {
    font-size: 11px;
    font-variant-numeric: tabular-nums;
  }

  .hover-text.label {
    fill: var(--muted);
  }

  .hover-text.value {
    fill: var(--text);
    font-weight: 600;
  }
</style>
