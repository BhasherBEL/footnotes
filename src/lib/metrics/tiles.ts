export type Tile = { url: string; x: number; y: number; size: number }

export type TileView = {
  originU: number
  originV: number
  scale: number
  width: number
  height: number
}

const MAX_TILES = 80
const MAX_LATITUDE = 85.0511

export function mercatorY(latitude: number): number {
  if (latitude === 0) return 0
  const clamped = Math.min(Math.max(latitude, -MAX_LATITUDE), MAX_LATITUDE)
  return (180 / Math.PI) * Math.log(Math.tan(Math.PI / 4 + (clamped * Math.PI) / 360))
}

export function tileLayout(view: TileView): { zoom: number; tiles: Tile[] } {
  let zoom = clamp(Math.round(Math.log2((view.scale * 360) / 256)), 0, 19)
  let tiles = tilesAt(view, zoom)
  while (tiles.length > MAX_TILES && zoom > 0) {
    zoom -= 1
    tiles = tilesAt(view, zoom)
  }
  return { zoom, tiles }
}

function tilesAt(view: TileView, zoom: number): Tile[] {
  const span = 360 / 2 ** zoom
  const maxIndex = 2 ** zoom - 1
  const firstTx = Math.floor((view.originU + 180) / span)
  const lastTx = Math.floor((view.originU + view.width / view.scale + 180) / span)
  const firstTy = Math.floor((view.originV + 180) / span)
  const lastTy = Math.floor((view.originV + view.height / view.scale + 180) / span)

  const tiles: Tile[] = []
  for (let tx = Math.max(firstTx, 0); tx <= Math.min(lastTx, maxIndex); tx++) {
    for (let ty = Math.max(firstTy, 0); ty <= Math.min(lastTy, maxIndex); ty++) {
      const u = tx * span - 180
      const v = ty * span - 180
      tiles.push({
        url: `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`,
        x: (u - view.originU) * view.scale,
        y: (v - view.originV) * view.scale,
        size: span * view.scale,
      })
    }
  }
  return tiles
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high)
}
