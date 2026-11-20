import { clear, createStore, delMany, getMany, keys, set } from 'idb-keyval'
import type { ParseResult } from '../fit/parseFit'

export const CACHE_VERSION = 11

export type CacheEntry = { name: string; result: ParseResult }

const store = createStore('footnotes', 'entries')

export function cacheKey(file: File): string {
  const path = file.webkitRelativePath || file.name
  return `${CACHE_VERSION}:${path}:${file.size}:${file.lastModified}`
}

export async function readEntries(): Promise<Map<string, CacheEntry>> {
  const storedKeys = ((await keys(store)) as string[]).filter((key) =>
    key.startsWith(`${CACHE_VERSION}:`),
  )
  const values = await getMany<CacheEntry>(storedKeys, store)
  const entries = new Map<string, CacheEntry>()
  storedKeys.forEach((key, index) => {
    const value = values[index]
    if (value) entries.set(key, value)
  })
  return entries
}

export async function writeEntry(key: string, entry: CacheEntry): Promise<void> {
  await set(key, entry, store)
}

export async function removeEntries(staleKeys: string[]): Promise<void> {
  await delMany(staleKeys, store)
}

export async function removeOtherVersions(): Promise<void> {
  const storedKeys = (await keys(store)) as string[]
  const outdated = storedKeys.filter((key) => !key.startsWith(`${CACHE_VERSION}:`))
  if (outdated.length > 0) await delMany(outdated, store)
}

export async function clearEntries(): Promise<void> {
  await clear(store)
}
