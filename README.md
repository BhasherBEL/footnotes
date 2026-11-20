# Footnotes

See how your running is going: volume, intensity, best efforts and aerobic progress, read straight from the `.fit` files your watch already wrote.

Point it at the folder that holds your activity files and it shows weekly distance, time in heart-rate zones, personal records, pace at a fixed heart rate, a consistency calendar, the countries you run in, and a page per run with its splits.

## Your files stay on your machine

Everything happens in the browser. There is no account, no server and no upload.

- Files are read with the folder picker and decoded in a Web Worker on your own device.
- Parsed summaries are cached in IndexedDB so the dashboard opens instantly next time. Settings live in `localStorage`.
- Nothing is ever sent anywhere: no analytics, no fonts from a CDN, no geocoding service. The country map is resolved against boundary data bundled with the app.
- "Clear cached data" in Settings removes every cached run from the browser. Your `.fit` files are never modified.

FIT files contain GPS tracks and can reveal where you live. Keep them out of public repositories.

## Getting your FIT files

| Watch | Where the files are |
| --- | --- |
| Garmin | Connect the watch by USB and open `GARMIN/Activity` on the device drive |
| Coros | COROS app → Profile → Settings → export, or the watch's USB drive |
| Suunto | SuuntoLink keeps a local copy, or export per activity from the app |
| Polar | Polar Flow → activity → Export → FIT |
| Wahoo | Wahoo app → Workout → Export → FIT |
| Strava | Export a single activity as original, which is the FIT file your watch recorded |

Any folder of `.fit` files works, including subfolders. Files that are not runs (rides, swims, walks) are skipped and listed, so you can point the app at a whole export without sorting it first.

## Running it

```
npm install
npm run dev      # local dev server
npm run check    # svelte-check + tsc
npm test         # vitest
npm run build    # static site in dist/
npm run preview  # serve the built site
```

Requires Node 20 or newer. The build is a plain static site: `dist/` can be served from any host, including a subfolder, because `vite.config.ts` sets `base: './'`.

### Deploying

`.github/workflows/deploy.yml` builds on every push to `main` and publishes `dist/` to GitHub Pages. Enable Pages for the repository with "GitHub Actions" as the source, and it works as is. Any other static host works too: copy `dist/`.

The "Source code" link on the Settings page points at `sourceCodeUrl` in `src/pages/Settings.svelte`. Change it to your repository when you publish.

## Adding a language

1. Copy `src/lib/i18n/en.ts` to `src/lib/i18n/<code>.ts` and translate the values. The file is typed against the English keys, so the compiler tells you if one is missing.
2. Add the dictionary to `dictionaries` and an entry to `languages` in `src/lib/i18n/index.svelte.ts`.
3. Add the code to the `Language` type in `src/lib/types.ts`.

Numbers and dates come from `Intl`, so they follow the new locale on their own.

## How the numbers are built

- **Period**: every page shows the 4 weeks, 12 weeks, year or all of your history, ending with the week of your most recent run, so an old export still shows data. Weeks start on Monday.
- **Zones**: five Friel-style zones from your threshold heart rate, detected from your files and editable in Settings. Time in zone comes from the seconds spent at each bpm, so changing a zone never re-reads a file.
- **Best efforts**: the fastest 1 km, 5 km, 10 km, half marathon and marathon inside each run, found with a sliding window over the distance samples.
- **Pace at a fixed heart rate**: for every easy run, a least-squares fit of speed against heart rate, read at your reference heart rate. It answers "am I getting faster at the same effort?".
- **Countries**: the start point of each run against Natural Earth 110m boundaries, bundled with the app.

## Credits

Country boundaries from [Natural Earth](https://www.naturalearthdata.com/) (public domain). FIT decoding by the [Garmin FIT JavaScript SDK](https://github.com/garmin/fit-javascript-sdk). Fonts: Inter and Space Grotesk, self-hosted.
