# Footnotes: design

The approved mockups are in `docs/design/`:

- `dashboard-desktop.png` and `dashboard.html`: the Dashboard page
- `trends-desktop.png` and `trends.html`: the Trends page

The `.html` files are static exports. Open them in a browser to inspect exact sizes and colors. All numbers in them are sample data. Runs, Records, Settings and the empty state were not mocked up: build them from the same tokens and components.

Where the mockups and this document or `SPEC.md` disagree, follow the documents:

- The Trends mockup shows the period options "12 wk / 6 mo / 1 yr / All". Use the same four options as the Dashboard: **4 wk / 12 wk / 1 yr / All**.
- The Trends mockup has no "Open folder" button. Every page header has one.
- "Sample data · Aug 24 – Nov 15, 2026" becomes the real range: "61 runs · Aug 24 – Nov 15, 2026".
- The mockups don't adapt well to phones. Follow the responsive rules below.

## Look

Calm, light and data-first, like a clean analytics tool. White cards on a light grey background, one blue accent, no gradients, no shadows except on the active button of a segmented control, no emoji.

## Tokens (`src/app.css`)

```css
:root {
  --bg: #F5F6F8;
  --surface: #FFFFFF;
  --surface-muted: #F9FAFB;
  --border: #E5E7EB;
  --divider: #F0F1F3;
  --grid: #EEF0F3;
  --axis: #9CA3AF;

  --text: #111827;
  --text-2: #374151;
  --muted: #4B5563;

  --accent: #2457D6;
  --accent-strong: #1F4FB8;
  --accent-soft: #EEF3FD;
  --bar: #C7D2E3;
  --point: #AFC1E4;
  --positive: #047857;
  --selected: #111827;

  --zone-1: #7EB3DD;
  --zone-2: #3FA796;
  --zone-3: #E8B23A;
  --zone-4: #E8773D;
  --zone-5: #D44848;

  --heat-0: #EEF0F3;
  --heat-1: #C7D7F5;
  --heat-2: #8FB0EE;
  --heat-3: #4F7FE0;
  --heat-4: #2457D6;

  --radius-card: 14px;
  --radius-control: 10px;
  --radius-inner: 7px;
  --radius-pill: 999px;

  --font-body: 'Inter Variable', Inter, system-ui, sans-serif;
  --font-display: 'Space Grotesk', Inter, system-ui, sans-serif;
}
```

Fonts are self-hosted with `@fontsource-variable/inter` and `@fontsource/space-grotesk` (weights 500 and 600). Do not load Google Fonts: a request to a third party contradicts the privacy promise.

## Typography

| Use | Style |
| --- | --- |
| Body, table cells | Inter 14px / 1.45, `--text` |
| Page title (h1) | Space Grotesk 30px, 600, letter-spacing −0.01em |
| Date range above the title | Inter 13px, `--muted` |
| Card title (h2) | Inter 16px, 600 |
| Card subtitle | Inter 13px, `--muted` |
| Big numbers (75%, 3:58, 5:31) | Space Grotesk 26–32px, 600, tabular figures |
| Table header | Inter 12px, 600, uppercase, letter-spacing 0.05em, `--muted` |
| Chart ticks and captions | Inter 11–12px, `--muted`. Axis captions in `--text-2`. |

Every number uses `font-variant-numeric: tabular-nums`.

## Layout

- **App shell:** a flex row that wraps. Sidebar `flex: 1 1 220px`, main area `flex: 999 1 560px; min-width: 0`.
- **Main area:** padding `28px 40px 48px`, 24px between sections, 16px between cards in a row.
- **Cards:** `--surface`, `1px solid var(--border)`, `--radius-card`, padding `20px 24px`.
- **Dashboard rows:**
  1. Distance over time (`flex: 2 1 560px`) beside Intensity (`flex: 1 1 300px`)
  2. A "Best efforts · last 12 weeks" heading row with a "See all records →" link, then one tile per distance (`flex: 1 1 200px`)
  3. Recent runs, a full-width card
- **Trends rows:** Pace at fixed heart rate (full width), then Consistency (full width).

## Components

- **Sidebar:**
  - White, with a right border, padding `24px 16px`.
  - Brand: a 30px rounded accent square with a white pulse line, then "Footnotes" in Space Grotesk 17px 700.
  - Nav items are 44px tall with an 18px stroke icon and the label. The active item uses `--accent-soft` with `--accent-strong` text at 600 and `aria-current="page"`.
  - The "Data folder" block is pinned to the bottom.
- **Segmented control** (period, units, measure):
  - White group, 1px border, `--radius-control`, 3px padding.
  - Buttons are at least 40px tall. The selected one is `--selected` with white text.
  - Uses `role="group"`, an `aria-label` and `aria-pressed`.
  - Exception: the measure toggle on Trends has a `--bg` track, and its selected button is white with a light shadow.
- **Select:** a native `<select>` inside a `<label>`, 46px tall, same border and radius.
- **Primary button:** `--accent` background, white text at 600, 46px tall, `--radius-control`, optional 18px icon. The "Open folder" button has a folder icon.
- **Secondary button:** white background, `--border` border, `--text` color.
- **Best-effort tile:** distance label (13px, 600, muted), time (Space Grotesk 26px), date and run name (12px, muted). The PR badge is a pill with `--accent-soft` background and `--accent-strong` text, 11px, 700.
- **Zone bar:** 14px tall, 7px radius, 2px gaps between segments. Rows below it: a 10px swatch, the label, the time (muted) and the percentage (600).
- **Table:** full width with a `min-width` of 640px inside an `overflow-x: auto` wrapper. Rows separated by 1px `--divider` lines, cells padded 12px vertically.
- **Links:** `--accent-strong` at 600, no underline. Arrow suffix " →" for "see all" links.
- **Icons:** inline 24×24 stroke SVGs (stroke-width 2, round caps), drawn at 18px. Use a small `Icon.svelte` with named paths. No icon library.

## Charts

Every chart is a small Svelte component that renders a responsive `<svg viewBox>` with `width: 100%; height: auto`.

- **Both axes always have scale labels and a caption with the unit.** The y-axis has 4–6 round ticks with light `--grid` lines and the caption rotated on the left. The x-axis has a baseline in `--axis`, 5px tick marks and a caption below.
- Highlight the most recent bucket or value in `--accent`. Everything else uses `--bar` or `--point`.
- Averages are dashed `--muted` lines with a small label at the right end.
- Bars, cells and scatter points carry an SVG `<title>` giving the exact value and date, which serves as a native tooltip.
- Line charts answer the pointer instead: `LineChart.svelte` draws a vertical bar at the nearest sample with a small readout of the x value and the y value. A line is sampled every 25 m, so one `<title>` per point would mean thousands of nodes per chart.
- A line chart drawn with a smoothed series puts the smoothed line behind, thick and `--point`, under a gradient area, and the raw line in front, thin and `--accent`.
- Each chart has `role="img"` and an `aria-label` that sums up the data in one sentence.
- One shared helper, `niceTicks(min, max, count)`, in `src/lib/charts.ts`, with tests.

Components:

- `BarChart.svelte`: distance over time
- `ScatterTrendChart.svelte`: pace at fixed HR and efficiency factor. Takes an `invertY` prop for pace.
- `Heatmap.svelte`: consistency. Built from HTML/CSS grid cells, not SVG, so it can scroll.
- `ZoneBar.svelte`: intensity

## Responsive (below 900px wide)

- The sidebar becomes a slim top bar holding only the brand. Navigation moves to a fixed bottom tab bar with the five destinations, each a 56px tall icon-and-label tab taking an equal share of the width, with `env(safe-area-inset-bottom)` padding so it clears the home indicator. The active tab is `--accent-strong`; the others are `--muted`. The Data folder block moves to the Settings page.
- Header controls wrap under the title.
- Cards stack.
- Bar charts space x labels by plot width and the widest label, and hide the value labels above the bars.
- The scatter chart shows at most 4 date labels.
- Best-effort tiles form a 2-column grid.
- Tables scroll sideways inside their card.
- Check every page at 390px and 1440px wide.

## Accessibility

- Use real `<button>`, `<a href>` and `<label>` + `<input>`/`<select>` elements. Never put a click handler on a `<div>`.
- Visible focus: `outline: 2px solid var(--accent); outline-offset: 2px` on `:focus-visible`.
- Text contrast is at least 4.5:1. The tokens above already pass on white and on `--bg`.
- Don't rely on color alone: zones also have names, and the PR badge has text.
