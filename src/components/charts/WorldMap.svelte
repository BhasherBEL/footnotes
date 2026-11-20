<script lang="ts">
  import type { Country } from '../../lib/metrics/countries'
  import { boundsOf, clusterPoints, heatLevelOf, type MapPoint } from '../../lib/metrics/mapView'

  let {
    countries,
    runsByCode,
    points,
    titleOf,
    ariaLabel,
  }: {
    countries: Country[]
    runsByCode: Record<string, number>
    points: MapPoint[]
    titleOf: (country: Country, runs: number) => string
    ariaLabel: string
  } = $props()

  const width = 720
  const height = 290
  const topLatitude = 84
  const bottomLatitude = -56

  const fillOpacities = [0, 0.1, 0.16, 0.24, 0.35]

  const highest = $derived(Math.max(1, ...Object.values(runsByCode)))

  function projectX(longitude: number): number {
    return ((longitude + 180) / 360) * width
  }

  function projectY(latitude: number): number {
    return ((topLatitude - latitude) / (topLatitude - bottomLatitude)) * height
  }

  const paths = $derived(
    new Map(
      countries.map((country) => [
        country.code + country.name,
        country.shapes
          .map(
            (shape) =>
              shape[0]
                .map(
                  ([longitude, latitude], index) =>
                    `${index === 0 ? 'M' : 'L'}${projectX(longitude).toFixed(1)} ${projectY(latitude).toFixed(1)}`,
                )
                .join(' ') + ' Z',
          )
          .join(' '),
      ]),
    ),
  )

  const view = $derived.by(() => {
    const bounds = boundsOf(points)
    let x = projectX(bounds.west)
    let y = projectY(bounds.north)
    let boxWidth = projectX(bounds.east) - x
    let boxHeight = projectY(bounds.south) - y

    const targetRatio = width / height
    const currentRatio = boxWidth / boxHeight
    if (currentRatio < targetRatio) {
      const grownWidth = boxHeight * targetRatio
      x -= (grownWidth - boxWidth) / 2
      boxWidth = grownWidth
    } else if (currentRatio > targetRatio) {
      const grownHeight = boxWidth / targetRatio
      y -= (grownHeight - boxHeight) / 2
      boxHeight = grownHeight
    }

    if (boxWidth > width) boxWidth = width
    if (boxHeight > height) boxHeight = height
    if (x < 0) x = 0
    if (y < 0) y = 0
    if (x + boxWidth > width) x = width - boxWidth
    if (y + boxHeight > height) y = height - boxHeight

    return { x, y, width: boxWidth, height: boxHeight }
  })

  const clusters = $derived.by(() => {
    const cell = (view.width / 720) * 0.15
    const baseRadius = view.width / 160
    return clusterPoints(points, cell).map((cluster) => ({
      ...cluster,
      radius: baseRadius * (1 + Math.min(1.2, 0.3 * Math.sqrt(cluster.count))),
    }))
  })
</script>

<svg viewBox="{view.x} {view.y} {view.width} {view.height}" role="img" aria-label={ariaLabel}>
  {#each countries as country (country.code + country.name)}
    {@const path = paths.get(country.code + country.name)}
    {@const runs = runsByCode[country.code] ?? 0}
    {#if runs > 0}
      <path
        d={path}
        fill="var(--accent)"
        fill-opacity={fillOpacities[heatLevelOf(runs, highest)]}
        stroke="var(--accent)"
        stroke-opacity="0.5"
        stroke-width="1"
        vector-effect="non-scaling-stroke"
      >
        <title>{titleOf(country, runs)}</title>
      </path>
    {:else}
      <path
        d={path}
        fill="var(--heat-0)"
        stroke="var(--surface)"
        stroke-width="0.4"
        vector-effect="non-scaling-stroke"
      />
    {/if}
  {/each}
  <g aria-hidden="true">
    {#each clusters as cluster, index (index)}
      <circle
        cx={projectX(cluster.longitude)}
        cy={projectY(cluster.latitude)}
        r={cluster.radius}
        fill="var(--accent-strong)"
        stroke="var(--surface)"
        stroke-width="1.2"
        vector-effect="non-scaling-stroke"
      />
    {/each}
  </g>
</svg>

<style>
  svg {
    width: 100%;
    max-width: 760px;
    height: auto;
    background: var(--surface-muted);
    border-radius: var(--radius-inner);
  }
</style>
