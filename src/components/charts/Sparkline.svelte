<script lang="ts">
  const width = 72
  const height = 24
  const padding = 2

  let { values }: { values: number[] } = $props()

  const points = $derived.by(() => {
    if (values.length < 2) return `${padding},${height / 2} ${width - padding},${height / 2}`

    const min = Math.min(...values)
    const max = Math.max(...values)
    if (min === max) return `${padding},${height / 2} ${width - padding},${height / 2}`

    const innerWidth = width - padding * 2
    const innerHeight = height - padding * 2
    return values
      .map((value, index) => {
        const x = padding + (index / (values.length - 1)) * innerWidth
        const y = padding + innerHeight - ((value - min) / (max - min)) * innerHeight
        return `${x},${y}`
      })
      .join(' ')
  })
</script>

<svg {width} {height} viewBox="0 0 {width} {height}" aria-hidden="true">
  <polyline {points} />
</svg>

<style>
  polyline {
    fill: none;
    stroke: var(--accent);
    stroke-width: 1.5;
    stroke-linejoin: round;
    stroke-linecap: round;
  }
</style>
