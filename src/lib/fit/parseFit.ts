import { Decoder, Stream } from '@garmin/fitsdk'
import { summarize } from './summarize'
import type {
  DeviceProfile,
  EventLike,
  LapLike,
  RecordLike,
  SessionLike,
  SkipReason,
} from './summarize'
import type { RunSummary } from '../types'

export type ParseResult =
  | { kind: 'run'; summary: RunSummary }
  | { kind: 'skipped'; reason: SkipReason }
  | { kind: 'error'; message: string }

type FitMessages = {
  sessionMesgs?: SessionLike[]
  recordMesgs?: RecordLike[]
  eventMesgs?: EventLike[]
  lapMesgs?: LapLike[]
  zonesTargetMesgs?: { maxHeartRate?: number; thresholdHeartRate?: number }[]
  userProfileMesgs?: { restingHeartRate?: number }[]
}

function deviceProfileOf(messages: FitMessages): DeviceProfile {
  const zones = messages.zonesTargetMesgs?.[0]
  const profile = messages.userProfileMesgs?.[0]
  return {
    maxHeartRate: zones?.maxHeartRate,
    thresholdHeartRate: zones?.thresholdHeartRate,
    restingHeartRate: profile?.restingHeartRate,
  }
}

export function parseFit(buffer: ArrayBuffer, id: string): ParseResult {
  try {
    const decoder = new Decoder(Stream.fromArrayBuffer(buffer))
    if (!decoder.isFIT()) return { kind: 'skipped', reason: 'not-fit' }

    const { messages } = decoder.read({
      applyScaleAndOffset: true,
      expandComponents: true,
      convertTypesToStrings: true,
      convertDateTimesToDates: true,
      mergeHeartRates: true,
    })
    const fit = messages as FitMessages
    return summarize(
      {
        sessions: fit.sessionMesgs ?? [],
        records: fit.recordMesgs ?? [],
        events: fit.eventMesgs ?? [],
        laps: fit.lapMesgs ?? [],
      },
      deviceProfileOf(fit),
      id,
    )
  } catch (error) {
    return { kind: 'error', message: error instanceof Error ? error.message : String(error) }
  }
}
