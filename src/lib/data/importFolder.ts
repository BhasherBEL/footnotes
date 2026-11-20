import { cacheKey, readEntries, removeEntries, removeOtherVersions, writeEntry } from './cache'
import type { CacheEntry } from './cache'
import { rememberFolder, runsOfEntries, runsState } from './runs.svelte'
import type { SkippedFile } from './runs.svelte'
import type { ParseRequest, ParseResponse } from '../fit/fit.worker'

function isFitFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.fit')
}

function folderNameOf(files: File[]): string {
  const path = files[0]?.webkitRelativePath ?? ''
  return path.includes('/') ? path.slice(0, path.indexOf('/')) : 'FIT files'
}

function skippedOf(entries: Map<string, CacheEntry>): SkippedFile[] {
  const skipped: SkippedFile[] = []
  for (const [key, entry] of entries) {
    if (entry.result.kind === 'skipped') {
      skipped.push({ key, name: entry.name, reason: entry.result.reason })
    }
    if (entry.result.kind === 'error') {
      skipped.push({ key, name: entry.name, reason: 'error', message: entry.result.message })
    }
  }
  return skipped
}

function decodeInWorker(worker: Worker, request: ParseRequest): Promise<ParseResponse> {
  return new Promise((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<ParseResponse>) => resolve(event.data)
    worker.onerror = (event) => reject(new Error(event.message))
    worker.postMessage(request, [request.buffer])
  })
}

export async function importFiles(picked: File[]): Promise<void> {
  const files = picked.filter(isFitFile)
  if (files.length === 0) return

  runsState.importing = true
  runsState.done = 0
  runsState.total = files.length

  await removeOtherVersions()
  const entries = await readEntries()
  const pickedKeys = new Set(files.map(cacheKey))
  const stale = [...entries.keys()].filter((key) => !pickedKeys.has(key))
  if (stale.length > 0) {
    await removeEntries(stale)
    for (const key of stale) entries.delete(key)
  }

  const worker = new Worker(new URL('../fit/fit.worker.ts', import.meta.url), { type: 'module' })
  try {
    for (const file of files) {
      const key = cacheKey(file)
      if (!entries.has(key)) {
        const buffer = await file.arrayBuffer()
        const response = await decodeInWorker(worker, { id: key, buffer })
        const entry: CacheEntry = { name: file.name, result: response.result }
        entries.set(key, entry)
        await writeEntry(key, entry)
      }
      runsState.done++
      runsState.runs = runsOfEntries(entries)
    }
  } finally {
    worker.terminate()
    runsState.importing = false
  }

  runsState.skipped = skippedOf(entries)
  rememberFolder(folderNameOf(files))
}
