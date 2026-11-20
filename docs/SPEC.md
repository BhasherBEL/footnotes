# Footnotes: specification

## 1. Goal

Any runner opens the site, picks the folder holding their `.fit` files, and sees how their running is going: volume, intensity, best efforts and aerobic progress. The app is generic. Nothing is tied to one person or one brand of watch.

Hard constraints:

- **Static site.** `npm run build` produces `dist/`, which is hosted as plain files. No backend.
- **Private.** Files are read in the browser and never sent anywhere. Say so in the UI.
- **Generic.** Works with FIT files from any device. Profile values such as heart-rate zones are detected from the files when present, and are always editable.
- **Browsers:** current Chrome, Edge, Firefox and Safari, on desktop and phone.
- **Languages:** English (default) and French, built so adding a language means adding one file.
- **Units:** kilometers (default) or miles, saved in settings.

Out of scope for v1: maps, a single-run detail page, training load, elevation trends, imports from zip archives or online services, power metrics, dark mode.

## 2. Data flow

```
Folder picker ─▶ keep *.fit files ─▶ skip files already cached
             ─▶ Web Worker: decode FIT ─▶ RunSummary (or "not a run")
             ─▶ IndexedDB cache ─▶ runs state ─▶ derived metrics ─▶ pages
```

1. **Pick a folder:** `<input type="file" webkitdirectory multiple>`. It works in every target browser. Keep files whose name ends in `.fit`, case-insensitive.
2. **Cache key:** `${CACHE_VERSION}:${file.webkitRelativePath || file.name}:${file.size}:${file.lastModified}`. Known keys are not decoded again. Bump `CACHE_VERSION` whenever the shape of `RunSummary` or the parsing logic changes.
3. **Decode** in a single module worker (`new Worker(new URL('./fit.worker.ts', import.meta.url), { type: 'module' })`), one file at a time. The worker returns either `{ kind: 'run', summary }`, `{ kind: 'skipped', reason }` or `{ kind: 'error', message }`.
4. **Store** each result in IndexedDB (`idb-keyval`) under its cache key, skipped files included, so they are not decoded again.
5. **Load:** on startup, read every cached `RunSummary` from IndexedDB, so a returning user sees their dashboard straight away.
6. **Re-scan:** the user picks the folder again. Only new or changed files are decoded. Cached entries whose files are missing from the new pick are deleted.
7. **Progress:** show "Reading 120 of 248 files" with a progress bar. At the end, show how many runs were found and a collapsible list of skipped or failed files with the reason.

## 3. Decoding FIT files

Use `@garmin/fitsdk`. Check field names against `node_modules/@garmin/fitsdk/src/index.d.ts` and the README.

```ts
const stream = Stream.fromArrayBuffer(buffer)
const decoder = new Decoder(stream)
if (!decoder.isFIT()) skip('not-fit')
const { messages, errors } = decoder.read({
  applyScaleAndOffset: true,
  expandComponents: true,
  convertTypesToStrings: true,
  convertDateTimesToDates: true,
  mergeHeartRates: true,
})
```

Messages used:

| Message | Fields |
| --- | --- |
| `sessionMesgs` | `sport`, `subSport`, `startTime`, `totalDistance`, `totalTimerTime`, `totalElapsedTime`, `totalAscent`, `avgHeartRate`, `maxHeartRate` |
| `recordMesgs` | `timestamp`, `distance`, `enhancedSpeed` (fall back to `speed`), `heartRate`, `enhancedAltitude` (fall back to `altitude`) |
| `zonesTargetMesgs` | `maxHeartRate`, `thresholdHeartRate` (optional, used for profile detection) |
| `userProfileMesgs` | `restingHeartRate` (optional, used for profile detection) |

Rules:

- A file is a run when at least one session has `sport === 'running'`, whatever its `subSport` (road, trail, treadmill, track). Skip other files with reason `not-running`.
- If a file holds several running sessions, use the first one, and only the records whose timestamps fall inside it.
- Skip runs shorter than 60 seconds or 200 meters (`too-short`).
- Missing heart rate is fine. HR-based metrics then ignore the run.
- Missing GPS is fine (treadmill). Use the distance the device recorded.
- If `totalAscent` is missing, compute it from altitude: smooth with a 5-sample moving average, then add up the rises, counting a rise only once it reaches 2 m.
- Records are read once to build the summary below. The raw records are not stored.

## 4. Data model

```ts
type RunSummary = {
  id: string
  startTime: string
  sport: 'running'
  subSport: string
  name: string
  distance: number
  movingTime: number
  elapsedTime: number
  ascent: number
  avgHeartRate: number | null
  maxHeartRate: number | null
  heartRateSeconds: Record<number, number>
  bestEfforts: Record<EffortDistance, number>
  steadyHeartRateFit: SteadyFit | null
  deviceProfile: { maxHeartRate?: number; thresholdHeartRate?: number; restingHeartRate?: number }
}

type EffortDistance = '1k' | '5k' | '10k' | 'half' | 'marathon'

type SteadyFit = {
  intercept: number
  slope: number
  minHeartRate: number
  maxHeartRate: number
}
```

- `id` is the cache key. `startTime` is an ISO string.
- `name` is a readable label: the sub-sport if it is not `generic` ("Trail", "Treadmill"), otherwise "Run". The UI translates it.
- `movingTime` is `totalTimerTime`. `elapsedTime` is `totalElapsedTime`.
- `heartRateSeconds` maps each bpm value to the seconds spent at it. Time-in-zone is computed from it later, so editing the zones never needs a re-parse. Count the time between two consecutive records, capped at 10 s, so pauses don't count.
- `bestEfforts` only has entries for distances the run actually covered (see 6.4).
- `steadyHeartRateFit`: see 6.5. Null when the run doesn't qualify.

## 5. Settings

Stored in `localStorage` under `footnotes.settings` as JSON. Every field has a default.

```ts
type Settings = {
  language: 'en' | 'fr'
  units: 'km' | 'mi'
  period: '4w' | '12w' | '1y' | 'all'
  maxHeartRate: number | null
  restingHeartRate: number | null
  thresholdHeartRate: number | null
  zoneFloors: [number, number, number, number] | null
  referenceHeartRate: number | null
  trendMeasure: 'pace' | 'efficiency'
}
```

Defaults: `en`, `km`, `12w`, `pace`. Every other field is `null`, which means "detect".

**Detecting the heart-rate profile.** For each value the user hasn't set:

1. Take it from the most recent run whose `deviceProfile` has it.
2. Otherwise estimate it:
   - max HR = the highest `maxHeartRate` across all runs
   - threshold HR = `round(0.89 × max HR)`
   - resting HR = none

Settings shows whether each value is "from your files", "estimated" or "set by you", and has a "Reset to detected" button.

**Zones** (five zones based on threshold HR, Friel-style). A zone floor is the lowest bpm in that zone. Default floors for zones 2 to 5: `round(threshold × 0.84)`, `round(× 0.90)`, `round(× 0.94)`, `threshold`. Zone 1 is everything below the zone 2 floor. All four floors can be edited in bpm and must be strictly increasing.

Zone names: 1 Recovery, 2 Endurance, 3 Tempo, 4 Threshold, 5 VO₂ max. "Easy" means zones 1 and 2.

**Reference HR** for the pace trend defaults to the zone 2 floor plus half the width of zone 2, rounded to the nearest 5 bpm. The select offers every 5 bpm from 120 to 180.

## 6. Metrics

All dates are in the user's local time. Weeks start on Monday.

### 6.1 Period

The global period selector shows four options on every page: **4 wk, 12 wk, 1 yr, All**. The choice is saved in settings.

- The period ends with the week of the **most recent run**, not today, so an old export still shows data.
- 4 wk and 12 wk cover that many Monday-to-Sunday weeks, ending with that week.
- 1 yr covers 52 weeks. All goes back to the week of the first run.
- Every number and chart on Dashboard, Runs and Trends uses only runs inside the period.
- The header shows the actual range, for example "61 runs · Aug 24 – Nov 15, 2026".

### 6.2 Distance over time (Dashboard)

- Buckets: **weekly** for 4 wk and 12 wk, **monthly** for 1 yr and All.
- One bar per bucket, including empty ones (height 0). The value is shown above each bar, and the most recent bar uses the accent color.
- A dashed line marks the average per bucket, labeled "avg 35.8".
- Card header: total distance and average per bucket ("429.3 km total · 35.8 km/week average", or "… /month").
- The y-axis has round ticks (`niceTicks`, 4 to 6 ticks), with the unit in the axis caption below the x labels: "Week starting (Monday) · km" or "Month · km".

### 6.3 Intensity (Dashboard)

- Add up `heartRateSeconds` over every run in the period, then split the seconds into the five zones using the current floors.
- Show the share of easy time (zones 1 and 2) as a big number, followed by "easy (zones 1–2) · target ~80%".
- A stacked horizontal bar of the five zones, then one row per zone: color swatch, name, bpm range, time ("19 h 26"), percentage.
- Title: "Intensity · " + the period label ("last 12 weeks", "last year", "all time"). Subtitle: "Time in heart-rate zones · 40 h 29 in total".
- Footer: "Zones from your threshold heart rate (168 bpm) · edit in Settings", with a link to Settings.
- If the period has no HR data, show an empty state inside the card.

### 6.4 Best efforts (Dashboard and Records)

- Distances: 1 km, 5 km, 10 km, half marathon (21 097.5 m), marathon (42 195 m).
- For each run and distance, use two pointers over the records' cumulative `distance` and `timestamp` to find the shortest time in which the run covered that distance, interpolating linearly at the window edges. Only compute a distance the run actually covered.
- Dashboard: the best time per distance in the period, with its date and run name. Hide distances with no result (the marathon usually). Add a "PR" badge when it is also the all-time best.
- Records page: for each distance, the top 3 of all time, each with time, pace, date and run.

### 6.5 Pace at a fixed heart rate (Trends)

This shows aerobic progress: how fast you run at the same heart rate.

When a run qualifies, its steady fit is computed while it is decoded:

1. The run lasts at least 20 minutes, and at least 70% of its HR time is below 160 bpm. A run with no HR doesn't qualify.
2. Ignore the first 10 minutes (warm-up and HR lag).
3. Keep records with heart rate and with speed above 1.5 m/s. Group them into 60-second bins and average speed and HR in each.
4. Keep bins whose speed is within ±25% of the run's median bin speed, which drops stops and strides.
5. You need at least 10 bins. Fit a least-squares line `speed = intercept + slope × hr` through them. Keep the fit only if `slope > 0`.
6. Store `intercept`, `slope`, and the lowest and highest bin HR.

The 160 bpm cap in step 1 is fixed, because the fit is stored before the user's zones are known. The chart then applies the real filter: a run is plotted only if at least 80% of its HR time is in zones 1–2 with the current settings.

**Value for one run** at reference HR `R`: when `R` lies within `[minHeartRate − 5, maxHeartRate + 5]`, it is `speed = intercept + slope × R` and `pace = 1000 / speed` seconds per km. Otherwise the run is not plotted.

**Trend:** at the end of each week in the period, the mean of the run values from the previous 28 days. Skip weeks with no value.

**Headline:** the latest trend value as a pace ("5:31 /km at 145 bpm"), then the change since the first trend value in the period ("▲ 21 s/km faster than Aug 24 (5:52)"). Green when faster, neutral grey when slower.

**Chart:**
- One point per run, plus the trend line in the accent color.
- The y-axis is pace with **faster at the top**. The caption reads "min/km at 145 bpm · faster ↑" ("min/mi" in miles). Round ticks.
- The x-axis is dates, with 5 to 7 evenly spaced labels, plus the caption "Date".
- Legend: "One easy run", "4-week trend".

**Efficiency factor** (the toggle): the same chart, with each run's value equal to `(distance / movingTime × 60) / avgHeartRate`, meaning meters per minute per bpm. It uses the same qualifying runs, a y-axis with higher at the top, and the caption "Efficiency factor (m/min per bpm) · higher ↑".

If fewer than 3 runs qualify, show an empty state explaining that the chart needs easy runs with heart-rate data.

### 6.6 Consistency (Trends)

- A calendar heatmap with one column per week of the period and one row per weekday (Mon to Sun). Label every other week column, and the Mon, Wed, Fri and Sun rows.
- Each cell is the total distance of that day, in five levels: rest, under 5 km, 5–10 km, 10–20 km, 20 km and more. In miles: under 3, 3–6, 6–12, 12 and more.
- Legend: "Rest", the five swatches, then "20+ km" (or "12+ mi").
- Card header: "16 weeks · 61 runs · 3.8 runs/week".
- With 1 yr or All, the grid scrolls sideways inside its card. Each cell keeps a minimum width of 10 px.

### 6.7 Recent runs (Dashboard) and Runs page

- Dashboard: the 5 most recent runs in the period, plus a link "View all N runs →".
- Runs page: every run in the period in the same table. Clicking a column header sorts by it (date, distance, time, pace, D+, avg HR), descending first. Show 50 rows, then a "Show more" button.
- Columns: Date ("Sun, Nov 15"), Run (name), Distance, Time (`h:mm:ss` or `mm:ss`), Pace (`m:ss /km`), D+ (`m` or `ft`), Avg HR ("—" if missing). Numbers are right-aligned with tabular figures.

## 7. Pages and states

The app shell is a sidebar (desktop) or a top bar (phone), described in `DESIGN.md`. The nav entries are Dashboard, Runs, Trends, Records and Settings.

| Route | Page |
| --- | --- |
| `#/` | Dashboard: Distance over time + Intensity side by side, then Best efforts, then Recent runs |
| `#/runs` | Runs |
| `#/trends` | Trends: Pace at fixed heart rate, then Consistency |
| `#/records` | Records |
| `#/settings` | Settings |

**Page header** (Dashboard, Runs, Trends): the date range line, the page title, and on the right the period selector, the km/mi toggle, the language select and the "Open folder" button.

**No data yet:** every route shows a centered welcome card with:
- the title "See your running progress"
- one sentence on what the app does
- an "Open folder" primary button
- the line "Your files are read in your browser. Nothing is uploaded."
- a hint: "Works with .fit files from Garmin, Coros, Suunto, Polar, Wahoo and other devices. On Garmin, connect your watch and open GARMIN/Activity."

**Sidebar footer** once data is loaded: "Data folder", the folder name (taken from `webkitRelativePath`), "248 runs · scanned today 08:12", a "Re-scan folder" button and the privacy line.

**Settings page:** sections Display (language, units), Heart rate (max, resting, threshold with source labels, the four zone floors, "Reset to detected"), and Data (cached run count, "Clear cached data" with a confirmation in the page, never `window.confirm`). End with an About section: privacy statement and a link to the source code.

## 8. Formatting and i18n

- `src/lib/format.ts` holds every formatter: distance, pace, duration, elevation, dates. Each takes the units and locale it needs.
- Conversions: 1 mi = 1609.344 m, 1 ft = 0.3048 m. Pace per mile = pace per km × 1.609344.
- Locales for `Intl`: `en` → `en-US` (dates like "Sun, Nov 15", as in the mockups), `fr` → `fr-FR`.
- Dictionaries: `src/lib/i18n/en.ts` exports `const en = { 'dashboard.title': 'Dashboard', ... }`. `fr.ts` is typed `Record<keyof typeof en, string>`, so the compiler catches a missing key. `t(key, vars?)` replaces `{name}` placeholders.
- Adding a language means adding one dictionary file and one entry in the language list.
- Set `<html lang>` to the active language.

## 9. Deployment

- `vite.config.ts` sets `base: './'`.
- Include `.github/workflows/deploy.yml`, which builds on every push to `main` and publishes `dist/` to GitHub Pages using the official `actions/upload-pages-artifact` and `actions/deploy-pages` actions.
- `.gitignore` covers `node_modules`, `dist` and `fit-samples`.
