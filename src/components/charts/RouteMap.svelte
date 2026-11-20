<script lang="ts">
  import type { RoutePoint } from '../../lib/types'
  import { mercatorY, tileLayout } from '../../lib/metrics/tiles'
  import { t } from '../../lib/i18n/index.svelte'

  let {
    route,
    width = 640,
    height = 300,
    strokeWidth = 3,
    ariaLabel,
  }: {
    route: RoutePoint[]
    width?: number
    height?: number
    strokeWidth?: number
    ariaLabel?: string
  } = $props()

  const paddingShare = 0.06
  const minimumSpan = 1e-6

  function span(min: number, max: number): number {
    return Math.max(max - min, minimumSpan)
  }

  const fit = $derived.by(() => {
    if (route.length < 2) return null

    const xs = route.map((point) => point.longitude)
    const ys = route.map((point) => -mercatorY(point.latitude))

    const minX = Math.min(...xs)
    const minY = Math.min(...ys)
    const drawWidth = span(minX, Math.max(...xs))
    const drawHeight = span(minY, Math.max(...ys))

    const scale = Math.min(
      (width * (1 - paddingShare * 2)) / drawWidth,
      (height * (1 - paddingShare * 2)) / drawHeight,
    )

    const offsetX = (width - drawWidth * scale) / 2
    const offsetY = (height - drawHeight * scale) / 2

    const points = xs.map((x, index) => ({
      x: offsetX + (x - minX) * scale,
      y: offsetY + (ys[index] - minY) * scale,
    }))

    return {
      minX,
      minY,
      scale,
      offsetX,
      offsetY,
      path: points
        .map(
          (point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
        )
        .join(' '),
      start: points[0],
      finish: points[points.length - 1],
    }
  })

  const layout = $derived(
    fit === null
      ? null
      : tileLayout({
          originU: fit.minX - fit.offsetX / fit.scale,
          originV: fit.minY - fit.offsetY / fit.scale,
          scale: fit.scale,
          width,
          height,
        }),
  )

  const markerRadius = $derived(Math.max(4, strokeWidth * 1.6))
</script>

{#if fit !== null}
  <svg
    viewBox="0 0 {width} {height}"
    role={ariaLabel ? 'img' : undefined}
    aria-label={ariaLabel}
    aria-hidden={ariaLabel ? undefined : 'true'}
  >
    {#if width >= 300 && layout !== null}
      <g class="tiles" aria-hidden="true">
        {#each layout.tiles as tile (`${layout.zoom}-${tile.x}-${tile.y}`)}
          <image
            href={tile.url}
            x={tile.x}
            y={tile.y}
            width={tile.size}
            height={tile.size}
            preserveAspectRatio="none"
          />
        {/each}
      </g>
    {/if}
    <path
      d={fit.path}
      fill="none"
      stroke="var(--accent)"
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
      vector-effect="non-scaling-stroke"
    />
    {#if width >= 300}
      <circle
        cx={fit.start.x}
        cy={fit.start.y}
        r={markerRadius}
        fill="var(--accent-strong)"
        stroke="var(--surface)"
        stroke-width="1.5"
      />
      <circle
        cx={fit.finish.x}
        cy={fit.finish.y}
        r={markerRadius}
        fill="#fff"
        stroke="var(--accent-strong)"
        stroke-width="1.5"
      />
      <text x={width - 6} y={height - 6} text-anchor="end" font-size="10" fill="var(--muted)">
        {t('map.attribution')}
      </text>
    {/if}
  </svg>
{/if}

<style>
  svg {
    width: 100%;
    height: auto;
    background: var(--surface-muted);
    border-radius: var(--radius-inner);
    display: block;
  }

  .tiles {
    opacity: 0.85;
    filter: saturate(0.8);
  }
</style>
