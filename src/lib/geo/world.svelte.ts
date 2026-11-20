import type { Country } from '../metrics/countries'

export const world = $state<{ countries: Country[] }>({ countries: [] })

let loading = false

export async function loadWorld(): Promise<void> {
  if (loading || world.countries.length > 0) return
  loading = true
  const data = (await import('./world.json')).default as { countries: Country[] }
  world.countries = data.countries
}
