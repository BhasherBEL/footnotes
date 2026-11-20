import type { RunSummary } from '../types'
import type { SkipReason } from '../fit/summarize'
import { clearEntries, readEntries } from './cache'
import type { CacheEntry } from './cache'

export type SkippedFile = {
  key: string
  name: string
  reason: SkipReason | 'error'
  message?: string
}

export type Folder = { name: string; scannedAt: string }

const folderKey = 'footnotes.folder'

function readFolder(): Folder | null {
  try {
    const raw = localStorage.getItem(folderKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Folder
    if (typeof parsed.name !== 'string' || typeof parsed.scannedAt !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

export const runsState = $state({
  runs: [] as RunSummary[],
  skipped: [] as SkippedFile[],
  folder: readFolder(),
  loaded: false,
  importing: false,
  done: 0,
  total: 0,
})

export function sortByStart(runs: RunSummary[]): RunSummary[] {
  return [...runs].sort((a, b) => a.startTime.localeCompare(b.startTime))
}

export function runsOfEntries(entries: Map<string, CacheEntry>): RunSummary[] {
  const runs: RunSummary[] = []
  for (const entry of entries.values()) {
    if (entry.result.kind === 'run') runs.push(entry.result.summary)
  }
  return sortByStart(runs)
}

export async function loadCachedRuns(): Promise<void> {
  try {
    runsState.runs = runsOfEntries(await readEntries())
  } catch {
    runsState.runs = []
  }
  runsState.loaded = true
}

export function rememberFolder(name: string): void {
  const folder = { name, scannedAt: new Date().toISOString() }
  runsState.folder = folder
  try {
    localStorage.setItem(folderKey, JSON.stringify(folder))
  } catch {
    return
  }
}

export function dismissSkipped(): void {
  runsState.skipped = []
}

export async function forgetEverything(): Promise<void> {
  await clearEntries()
  runsState.runs = []
  runsState.skipped = []
  runsState.folder = null
  try {
    localStorage.removeItem(folderKey)
  } catch {
    return
  }
}
