import { parseFit } from './parseFit'
import type { ParseResult } from './parseFit'

export type ParseRequest = { id: string; buffer: ArrayBuffer }
export type ParseResponse = { id: string; result: ParseResult }

self.onmessage = (event: MessageEvent<ParseRequest>) => {
  const { id, buffer } = event.data
  const response: ParseResponse = { id, result: parseFit(buffer, id) }
  self.postMessage(response)
}
