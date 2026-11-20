const narrowQuery = '(max-width: 900px)'

export const viewport = $state({ narrow: matchMedia(narrowQuery).matches })

matchMedia(narrowQuery).addEventListener('change', (event) => {
  viewport.narrow = event.matches
})
