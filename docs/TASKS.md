# Tasks

Work top to bottom. Delegate each task to a subagent, review it, run `npm run check && npm test && npm run build`, tick the box and commit.

## 0. Scaffold

- [x] Run `npm create vite@latest scaffold -- --template svelte-ts`, move the generated files to the repo root and delete `scaffold/`. Remove the template's demo content.
- [x] Add the dependencies: `@garmin/fitsdk`, `idb-keyval`, `@fontsource-variable/inter`, `@fontsource/space-grotesk`. Dev dependencies: `vitest`, `prettier`, `prettier-plugin-svelte`.
- [x] Add these npm scripts: `dev`, `build`, `preview`, `check` (svelte-check), `test` (`vitest run`), `format`.
- [x] Set `base: './'` in `vite.config.ts`. Keep the existing `.gitignore` and add the scaffold's entries to it.
- [x] Add `.github/workflows/deploy.yml` for GitHub Pages (SPEC §9).
- [x] Create the folder layout:

```
src/
  main.ts  App.svelte  app.css
  lib/        format.ts  charts.ts  period.ts  types.ts
    fit/      parseFit.ts  summarize.ts  fit.worker.ts
    metrics/  zones.ts  bestEfforts.ts  steadyFit.ts  buckets.ts  consistency.ts
    data/     runs.svelte.ts  cache.ts  importFolder.ts
    settings/ settings.svelte.ts  heartProfile.ts
    i18n/     index.svelte.ts  en.ts  fr.ts
  components/ Sidebar.svelte  PageHeader.svelte  Segmented.svelte  Card.svelte  Icon.svelte  ...
    charts/   BarChart.svelte  ScatterTrendChart.svelte  Heatmap.svelte  ZoneBar.svelte
  pages/      Dashboard.svelte  Runs.svelte  Trends.svelte  Records.svelte  Settings.svelte  Welcome.svelte
```

**Done when** `npm run dev` shows an empty app and all scripts pass.

## 1. Foundations

- [x] `app.css` with the tokens and base styles from DESIGN.md, and the self-hosted fonts.
- [x] Settings state: `settings.svelte.ts`, saved to `localStorage`, with the defaults from SPEC §5.
- [x] i18n: `t()`, `en.ts`, and `fr.ts` typed against the keys of `en.ts`. `<html lang>` follows the language.
- [x] `format.ts`: distance, pace, duration, elevation, dates, km/mi. With tests.
- [x] Hash router in `App.svelte` and the app shell: Sidebar, PageHeader, Segmented control, Icon. Placeholder pages.

**Done when** you can switch language and units and the choice survives a reload, nav links change pages, and the shell matches `dashboard-desktop.png`.

## 2. FIT decoding

- [x] `summarize.ts`: pure functions that turn session and record arrays into a `RunSummary` (SPEC §3–4): HR seconds, ascent fallback, best efforts, steady fit. Test each one with synthetic records.
- [x] `metrics/bestEfforts.ts` and `metrics/steadyFit.ts` with tests: exact distances, interpolation, too-short runs, no HR.
- [x] `parseFit.ts`: ArrayBuffer → `@garmin/fitsdk` → `summarize`. It returns `{ kind: 'run' | 'skipped' | 'error' }`.
- [x] `fit.worker.ts` wraps `parseFit`.

**Done when** tests pass and decoding a real file from `fit-samples/` in dev logs a sensible summary.

## 3. Import and cache

- [x] `importFolder.ts`: folder input, `.fit` filter, cache keys, sequential decoding in the worker, progress, the skipped/error list, removal of stale entries (SPEC §2).
- [x] `cache.ts` on `idb-keyval`. `runs.svelte.ts` loads every cached run on startup.
- [x] Welcome page (empty state), import progress UI, and the sidebar Data folder block with "Re-scan folder".
- [x] `heartProfile.ts`: detect max, resting and threshold HR and the zone floors (SPEC §5), with tests.

**Done when** picking a folder of 200+ files shows progress, then the run count, a reload doesn't decode anything again, and a re-scan only decodes new files.

## 4. Dashboard

- [x] `period.ts` and `buckets.ts`: the period range anchored on the latest run, weekly and monthly buckets. With tests.
- [x] `charts.ts`: `niceTicks`, with tests.
- [x] Distance over time card with `BarChart.svelte` (SPEC §6.2).
- [x] Intensity card with `ZoneBar.svelte` (SPEC §6.3). It follows the period.
- [x] Best efforts tiles with the PR badge (SPEC §6.4).
- [x] Recent runs table (SPEC §6.7).

**Done when** the page matches `dashboard-desktop.png` with real data, and switching between 4 wk, 12 wk, 1 yr and All updates every card.

## 5. Runs

- [x] A sortable table of every run in the period, with "Show more" (SPEC §6.7).

## 6. Trends

- [x] Pace at fixed heart rate with `ScatterTrendChart.svelte`, the reference HR select and the pace/efficiency toggle (SPEC §6.5).
- [x] Consistency heatmap with `Heatmap.svelte` (SPEC §6.6). It follows the period and scrolls sideways for long periods.

**Done when** the page matches `trends-desktop.png`, both axes have scales and captions, and changing the reference HR updates the chart instantly with no re-parse.

## 7. Records

- [x] Top 3 all-time efforts per distance (SPEC §6.4).

## 8. Settings

- [x] Display, Heart rate (with source labels and validation), Data (count, clear cache with an in-page confirmation) and About sections (SPEC §7).

## 9. Polish and ship

- [x] Responsive pass at 390px and 1440px (DESIGN.md "Responsive").
- [x] Accessibility pass: keyboard only, focus visible, labels, chart `aria-label`s.
- [x] Every visible string is in `en.ts` and `fr.ts`. The French reads naturally.
- [x] Empty states: no HR data, fewer than 3 steady runs, a period with no runs.
- [x] Rewrite `README.md` for the public: what the app is, the privacy promise, how to export FIT files from common watches, how to run and deploy it, and how to add a language.
- [x] Build, then check `npm run preview` from a subfolder path.

## 10. Countries map (added by the user, 2026-11-17)

Overrides SPEC §1, which put maps out of scope for v1.

- [x] Store the start position of each run (`startPositionLat` / `startPositionLong` from the session, or the first record with a position) in `RunSummary` as `startLatitude` / `startLongitude`, both `number | null`. Bump `CACHE_VERSION` so existing caches are re-parsed.
- [x] `src/lib/metrics/countries.ts`: resolve a coordinate to a country with a point-in-polygon test against a simplified world boundary file bundled with the app. No network lookup: a geocoding request would break the privacy promise.
- [x] `src/components/charts/WorldMap.svelte`: an SVG choropleth of the same boundaries, shading each country by how many runs started there, with a `<title>` per country and a legend. Countries with no runs stay `--heat-0`.
- [x] A "Where you run" card listing each country with its run count and total distance.

**Done when** the map shades the countries of the loaded runs, works offline, and treadmill runs with no GPS are counted as "no location" rather than dropped silently.

## 11. Run detail page (added by the user, 2026-11-17)

Overrides SPEC §1, which put a single-run detail page out of scope for v1.

- [x] Extend `RunSummary` with what a detail page needs and cannot recompute: per-kilometre (and per-mile) splits, and the run's own time-in-zone. Keep raw records out of the cache. Bump `CACHE_VERSION`.
- [x] Route `#/run/:id`, read from `location.hash`. Every run row and best-effort tile links to it.
- [x] `src/pages/Run.svelte`: header with date, name, distance, time, pace, D+, avg and max HR; a splits table with a bar per split; the run's zone bar; and its best efforts.
- [x] Back link to the page the user came from, and a clear state when the id is unknown (cache cleared, stale link).

**Done when** clicking any run opens its page, the splits add up to the run distance, and a reload on a `#/run/...` URL still works.

## 12. Training and Progress groups on Trends (added by the user, 2026-11-17)

- [x] Split the Trends page into two labelled groups, each with a heading and one line saying what it answers.
  - **Training** - consistency, volume, intensity: are you training often enough, enough volume, and easy enough?
  - **Progress** - pace at a fixed heart rate and the efficiency factor: are you getting faster at the same effort?
- [x] Extract the volume card and the intensity card into `src/components/VolumeCard.svelte` and `src/components/IntensityCard.svelte` so the Dashboard and Trends render the same component instead of two copies.
- [x] "Where you run" stays its own section after the two groups: it is neither training nor progress.

**Done when** Trends reads as two clearly separated groups, the Dashboard still looks the same, and both pages follow the period selector.

## 13. Manual-testing fixes (added by the user, 2026-11-18)

From `OPEN_ISSUES_MANUAL.md`. Overrides SPEC §4 (`splits` shape), §6.1 (period start),
§6.5 (which runs feed the pace trend) and DESIGN.md "Responsive" (mobile navigation).

### 13.1 Paused time must never count

A real file shows the size of the bug: 5004 s elapsed, 4130 s of timer time, one 684 s
stop. Splits, best efforts and the steady fit all measure a record's time as
`timestamp - sessionStart`, so every pause lands inside them.

- [x] Read `eventMesgs` and pass the timer events into `summarize`. Build the paused
      intervals from `start` / `stop*` pairs and turn every record timestamp into
      **moving seconds** (elapsed minus the pause time before it). With no timer events,
      fall back to summing the gaps between records capped at 10 s, as
      `heartRateSeconds` already does.
- [x] Feed those moving seconds to `bestEfforts`, the split track and `steadyFit`.
- [x] Bump `CACHE_VERSION` so every cached summary is re-parsed.

**Done when** a run's last moving second equals its `movingTime` (±2 s), and a split
that spans a stop no longer carries it.

### 13.2 Splits the user can choose

A 1 km split's duration and its pace are the same number, printed twice.

- [x] Replace `splits: { km, mi }` in `RunSummary` with a `splitTrack`: cumulative
      `{ meters, seconds }` points every 100 m plus the end of the run, and `laps`:
      one `{ meters, seconds }` per lap message. Cut splits at any length by
      interpolating the track.
- [x] On the run page, a length picker (0.5, 1, 2, 5 of the current unit, plus "Laps"
      when the run has more than one lap). Rows show index, the bar, the pace and the
      **cumulative** time, with the distance only when it differs from the chosen length.

**Done when** 1 km splits print one number per column, the lengths all add up to the run
distance, and an interval session can be read lap by lap.

### 13.3 Trends respond instantly

Every `format*` call builds a new `Intl` formatter. Formatting one year of heatmap
cells costs 77 ms; with cached formatters it costs 1 ms.

- [x] Memoize the `Intl` formatters in `format.ts` behind the current function
      signatures.

**Done when** switching the period on Trends has no visible delay.

### 13.4 Charts that fill their card

- [x] `BarChart`: let a bar grow to 72 px when there are few buckets, and pick the
      label interval from the plot width and the longest label instead of a fixed count,
      so all twelve months show on a wide card and none ever overlap.
- [x] `Heatmap`: no horizontal scrolling. A full year fits the card width, four weeks
      stay square and left-aligned, and the column labels mark the first week of each
      month once the range passes three months.

### 13.5 Averages ignore the time before the first run

A 1 yr period on four months of data averages over twelve months.

- [x] Clamp the period start to the week of the first run, so "1 yr" on a short history
      behaves like "All". Every bucket average, `weekCount` and the header range follow.

### 13.6 Progress charts that show something

Measured on the user's 40 files: 3 runs pass the easy-zone gate, 3 produce a steady fit,
1 passes both, and the chart needs 3. `runPoints` also gates the efficiency factor on
the steady fit although it only needs the average heart rate.

- [x] Efficiency factor: one point for every run with an average heart rate.
- [x] Pace at a fixed heart rate: drop the easy-run gate and relax the steady fit
      (shorter runs, fewer bins, a wider speed band, no warm-up skip).
- [x] The reference heart-rate select follows the runs that are loaded instead of a
      fixed 120–180.

**Done when** both measures draw a line on the user's folder at the default reference.

### 13.7 "Where you run" on the Dashboard

- [x] Move the card from Trends to the Dashboard.
- [x] Zoom the map to the runs: the bounding box of the run start positions, a margin,
      a floor on the span and a clamp to the world. Mark each start with a dot.
- [x] Shade the countries on a logarithmic scale so two runs are not the same colour as
      one and forty.

### 13.8 A mobile menu that works

Replaces the sideways-scrolling row DESIGN.md asks for.

- [x] Below 900 px: a fixed bottom tab bar, five icon-and-label tabs, 56 px tall, with
      `env(safe-area-inset-bottom)` padding. The brand stays in a slim top bar.
- [x] Update the DESIGN.md "Responsive" section to describe it.

### 13.9 Records link to their run

- [x] Every row on the Records page opens `#/run/:id`, like a row of the runs table.

### 13.11 Partial splits and a sidebar that stays

- [x] The bar of a split shorter than the chosen length is scaled by how much of that
      length it covers, while the track keeps its full width.
- [x] Above 900 px the sidebar sticks to the viewport instead of scrolling away.

### 13.10 Plainer copy

- [x] Cut the explanatory sentences: the two Trends group leads, the pace-at-heart-rate
      subtitle, the zones-from-threshold line, the privacy line, the About paragraph,
      the heart-rate and zone-floor hints in Settings, and the welcome lead. Shorten the
      empty states to one short factual clause. `en.ts` and `fr.ts` stay in step.

### 13.12 Asked for during the session (2026-11-18)

- [x] A close button on the "N files were skipped" banner.
- [x] Y-axis labels pick their decimals from the tick step, so the efficiency scale no
      longer prints 0.9 0.9 1.0 1.0 1.1 1.1.
- [x] Estimate the current week's distance from how much each weekday contributes on
      average over the complete weeks before it. Today counts for at least its average, so
      an evening run is still expected. Shown as a dashed ghost on the current week's bar
      and as "≈ 22.9 km projected" in the card header, only in weekly bucketing and only
      when the last bar really is this week.

### 13.13 Queue from the 2026-11-18 evening review

Do the first item before the others: they all need fields from it, and doing it once
avoids four conflicting edits to the same three files.

- [x] **Extend what a run summary carries.** Probed on a real file from the user's watch,
      so these exist on their device but on no other guarantee — every one is nullable
      with a fallback. `RunSummary` gains `steps` (`totalStrides` × 2, a stride being two
      steps), `trainingLoad` (`trainingLoadPeak`), and `gradeFactor` (how much faster the
      run would have been on the flat: `avgGradeAdjustedSpeed / (distance / movingTime)`
      when the session has it, otherwise `(distance + 8 × ascent) / distance`, clamped to
      0.8–1.5, never null). `TrackPoint` gains `altitude: number | null`, interpolated at
      each 100 m mark like `seconds`. `EffortDistance` gains `'400'` with 400 m in
      `EFFORT_METERS` — that breaks every exhaustive `effortNames` map until each gains an
      `effort.400` entry. Bump `CACHE_VERSION`.
- [x] **Less noise in the progress charts.** Pace at a fixed heart rate scatters about
      ±20 s/km and the efficiency factor about ±0.08 run to run, which buries the signal on
      the 4 wk and 12 wk views. Three fixes: grade-adjust both measures (the session
      message carries `avgGradeAdjustedSpeed`; where it is missing, treat a metre of climb
      as eight metres of flat running), stop `speedAtHeartRate` extrapolating past the
      heart rates a run actually reached (drop the ±5 bpm margin), and scale the trend
      window to the period — two weeks for 4 wk, four for 12 wk, eight for 1 yr and All.
      Bump `CACHE_VERSION` if the summary gains a field.
- [x] **400 m best efforts.** Add `'400'` to `EffortDistance` and `EFFORT_METERS` so it
      shows in a run's best efforts, on Records and in the Dashboard tiles, with its own
      i18n label. Bump `CACHE_VERSION`.
- [x] **Heart rate, speed and elevation graphs on a run.** Three small SVG charts under the
      splits, drawn from the 100 m track: heart rate with the zone floors as bands, speed
      raw plus a smoothed line, and the elevation profile. The track must gain altitude per
      point; bump `CACHE_VERSION`.
- [x] **Dashboard summary tiles.** A row above the volume card: total distance, total steps
      (`totalStrides` × 2 from the session), fitness (a 42-day exponentially weighted
      average of per-session load — use Garmin's `trainingLoadPeak` when the file has it,
      otherwise a heart-rate TRIMP), and this week's distance against a band from the
      four-week average: minimal to hold fitness at 0.8×, maximal safe at 1.3×. Every tile
      shows its change against last week.

## 14. Heart-rate zones from %HRR (added by the user, 2026-11-19)

Overrides SPEC §5, which derives four zone floors from the threshold heart rate
Friel-style.

- [x] Zones now come from percent of heart-rate reserve (`resting + percent / 100 ×
      (max − resting)`), with Z1 50 %, Z2 61 %, Z3 77 %, Z4 83 %, Z5 89 %. `zoneFloorsOf`
      takes max and resting heart rate and returns five floors instead of four.
- [x] A heart rate below the zone 1 floor belongs to no zone: it is excluded from the
      zone totals rather than folded into zone 1. `zoneOf` returns `0` for it.
- [x] Resting heart rate now has an estimate (60 bpm) so the model always has a reserve.
- [x] Settings shows five zone floor inputs, each labelled with its zone name and its
      percent of reserve, still strictly increasing.

**Done when** the user's profile (max 209, resting 43) yields floors 126, 144, 171, 181,
191, and the Intensity card's zone ranges read as bpm spans starting at the zone 1 floor.

## 15. Readable summary tiles (added by the user, 2026-11-19)

The tile row above the volume card mixed two time scales: the values were period totals
while every footer compared this week against last week — and "this week" was a partial
week measured against a full one. Form was a bare load number with nothing to read it
against.

- [x] Total distance and Steps carry a rate from their own window, `total / weekCount(range)`,
      reading `24.2 km per week` and `25,117 per week`. A delta against the previous
      equivalent window was built first and dropped: it only fires for a runner with twice
      the period in history, so on 17 weeks of data at the 12 wk period neither tile showed
      anything at all.
- [x] Form is a share of the runner's own history: `fitness(now) / peak`, where `peak` is
      the highest daily `fitness` over the 365 days ending at the latest run. The tile
      reads `78%` with the footer `of your 1-year high`, and `—` with no footer when the
      peak is 0.
- [x] Every one of those 365 samples is taken at **end of day**, so each includes that
      day's runs on equal terms, and `now` is the last sample. Sampling at the latest run's
      time of day instead puts the final sample exactly on that run's load spike while the
      other 364 land mid-decay, which pins the tile at 100% almost always.
- [x] A sparkline of `fitness` over the selected period sits to the right of the Form
      value: `Sparkline.svelte`, a bare polyline — no axes, no labels, no tooltip. Its
      dates are end-of-day too, at most one point per day, for the same reason.
- [x] `fitnessSeries(runs, dates)` in `metrics/fitness.ts` returns the fitness at each
      date in one pass over the runs, and backs both the peak and the sparkline.
- [x] This week's tile keeps its value and its safe-range footer.

**Done when** no tile compares two different spans, Form reads as a percentage of the
runner's own high with its trend beside it, and the row still fits four tiles at 1280 px
and two columns at 420 px.

## 16. Livelier run charts, cadence and fitness (added by the user, 2026-11-19)

- [x] **The track is sampled every 25 m, not 100 m.** `TRACK_STEP` drops to 25 so the
      profile lines read as curves instead of a chain of straight segments, and splits snap
      closer to their mark. `TrackPoint` also carries `cadence`, the time-weighted mean of
      `(record.cadence + record.fractionalCadence) × 2` over the step, in steps per minute.
      Bump `CACHE_VERSION`.
- [x] **Every profile chart answers the pointer.** Hovering anywhere over a chart draws a
      vertical bar at the nearest sample and reads out the distance there and the value.
      The per-point `<title>` circles go away.
- [x] **The trace no longer skips a zone.** When one step crossed two zone floors, the
      piece after the first crossing took the colour of the far end, so a drop from zone 2
      to below zone 1 painted zone 1 black. `colorSegments` moved to `charts.ts` and keeps
      splitting until the piece is one colour.
- [x] **One chart language.** Speed, elevation and cadence all draw the same way: a thick
      pale smoothed line and its gradient area behind, the thin raw line in front. Heart
      rate keeps its zone bands and zone-coloured trace.
- [x] **A calm speed trace.** `speedProfile` divided adjacent track points, so at 25 m the
      raw pace swung between 3:20 and 13:20 per km — unreadable, and now the line in front.
      It becomes a centred difference over a fixed 100 m baseline, independent of the step.
- [x] **Smoothing windows are metres, not point counts.** 400 m for speed, 200 m for
      elevation and cadence, derived from `TRACK_STEP`.
- [x] **A cadence chart on a run**, in steps per minute, under the elevation profile.
- [x] **Laps lead the split lengths.** When a run has laps, `Laps` is the first option and
      the selected one; a run without laps does not show it and still starts at 1 km.
- [x] **Laps are not cropped.** The split rows shrink their bars for a partial final
      kilometre. A lap is a complete unit, so lap rows always draw at full height.
- [x] **A fitness graph on Trends**, in the Training group: the 42-day load average sampled
      at end of day over the selected period, with the same hover readout.
- [x] **The y caption no longer collides with the tick labels.** `padding.left` comes from
      the widest formatted tick, so `10:00` on the pace chart gets the room `175` does not.
      `LineChart` also takes `area`, for a line with no smoothed companion.

**Done when** the run charts share one look, a pointer anywhere on them names a distance
and a value, a lap-based run opens on its laps, and Trends shows fitness over the period.

## 14. Requested changes (2026-11-20)

- [x] **Fitness joins Progress.** The fitness card on Trends sits in the Progress group,
      after pace at fixed heart rate. Training keeps consistency, volume and intensity.
- [x] **A calmer countries map.** Visited countries wear a soft accent tint instead of a
      solid heat colour, run starts cluster into one dot sized by the runs behind it.
- [x] **A route map on every run.** Summaries now keep a thinned GPS track (cache v10).
      The run page gets a Route card; the runs table leads with a route thumbnail.
- [x] **Intensity lives under the heart rate chart.** The standalone Intensity card is
      gone: its easy share, zone bar and zone rows sit inside the Heart rate card, under
      the chart. The chart's y-axis bottom crops the warm-up dip (`heartRateFloor`: the
      2nd percentile of the run's heart rate, capped at five beats under the zone 1
      floor), so Z0 is mostly hidden, Z1-Z5 never are, and a genuinely slow run keeps
      its full profile.

**Done when** a run with GPS shows its track on its page and in the list, and the world
map reads as a quiet backdrop with legible markers.

## 15. Requested changes (2026-11-20, second batch)

- [x] **OpenStreetMap behind the route map.** Route maps draw OSM raster tiles under
      the route: the fit switches to Web Mercator so tiles align exactly, the zoom
      follows the route's scale, at most 80 tiles are fetched, the basemap sits calm
      (soft opacity) with the "© OpenStreetMap contributors" attribution, and the
      table thumbnails stay clean. Tile requests only happen when the basemap shows.

- [x] **Route map at the bottom of the run page.** The route card moves after the
      best-efforts card, as the last card on the page.

From `OPEN_ISSUES_MANUAL.md`; items already fixed or stale are listed at the bottom.

- [x] **Rest breaks stay out of the numbers.** A run with a break counts the stopped
      time: the run page, records and every metric inherit it. Reproduce on the real
      file the user linked, fix the moving-time detection in `src/lib/fit`.
      Timer-stopped breaks were already excluded; the leak was standing still while
      the timer ran (speed under 0.5 m/s): those intervals now become holes in the
      seconds axis too, so splits, paces and records all drop them. Real files:
      −105 s on 2026-10-24, −38 s on 2026-11-15, 0–13 s elsewhere.
- [x] **Yearly charts: honest average, every month label.** The distance average
      divides by empty buckets from before the first run; monthly labels get dropped
      instead of all being shown.
- [x] **A 4-week chart that fills its card.** Four thin bars feel empty on weekly
      distance and consistency; give few-bucket charts wider bars.

**Done when** a stopped run shows stopped numbers, the pace trend has points, the map
centres on the running, the yearly average ignores no-history buckets, 4 weeks reads
as a chart, and a 390 px phone can navigate.

Already fixed or stale from the same file: countries map moved to the dashboard;
records rows link to the run; split lengths and laps are user-selectable; the chatty
AI-slop subtitles are gone; paused holes are excluded from splits and split heart
rate; the bottom tab bar from 13.8 is usable at 390 px, proved with phone-width
screenshots of the dashboard, a run page and Trends; the map already zooms to the
run-start bounding box and shades countries on a log scale; pace at a fixed heart rate
draws points now, measured on the user's files where the offered references cover
13 to 17 of 41 runs.

## 17. PWA installability (added by the user, 2026-11-22)

- [x] **Web manifest and icons.** `public/manifest.webmanifest` linked from
      `index.html`: standalone display, relative `start_url` and `scope` so the app
      binds to the `/Footnotes/` GitHub Pages subpath, splash and theme colors from
      the tokens in `app.css`. PNG icons 192 and 512 plus a maskable 512 and a 180
      apple-touch-icon, rasterized from the lightning-bolt `favicon.svg`. Meta tags:
      theme-color, description, apple-mobile-web-app.
- [x] **Service worker.** Emitted at build time by a small Vite plugin, no new
      dependencies: precache the hashed bundle (FIT worker chunk and fonts included)
      plus the public files; cache-first for precached assets, network-first with
      cache fallback for navigations and other same-origin GETs; cross-origin
      requests (OSM tiles) untouched. Registered in production only, after load.

**Done when** the build emits a valid manifest and `sw.js`, `npm run check`,
`npm test` and `npm run build` pass, and a headless browser paints the dashboard
from cache with the server stopped.
