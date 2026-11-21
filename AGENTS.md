# Footnotes

A static web app that shows running progress over time from a folder of `.fit` files (Garmin and any other device that writes FIT). Everything runs in the browser. No server, no account, no upload.

This repository starts with documents only. You build the app from them.

## Read first, in this order

1. `docs/SPEC.md`: what to build, data model, metric formulas
2. `docs/DESIGN.md`: look and feel, components, responsive rules
3. `docs/design/*.png` and `docs/design/*.html`: approved mockups for Dashboard and Trends
4. `docs/TASKS.md`: the ordered task list. Work through it top to bottom.

If the documents disagree, `SPEC.md` wins over the mockups.

## How you work

You are the lead. You plan, delegate, review and verify. You do not write application code yourself.

- **All coding goes to subagents.** Give each one a single focused task with: the goal, the files to create or change, the relevant spec excerpt (formulas, types, copy), and the acceptance criteria from `TASKS.md`.
- One subagent per task. Never run more than two subagents at the same time, and only in parallel when their tasks touch different files.
- After each task:
  1. Review the diff for correctness, simplicity and the code rules below. Send it back with concrete fixes if needed.
  2. Run `npm run check`, `npm test` and `npm run build`. All must pass.
  3. Tick the task in `docs/TASKS.md`. Leave the changes uncommitted unless the user has explicitly asked for a commit this session (then use a short message like `feat: weekly distance chart`).
- Ask the user only when a decision is truly theirs (product scope, naming). Otherwise decide, and note the decision in the commit message.
- Track the work with the task tools: one task per `TASKS.md` item you are working through, `in_progress` before you dispatch it, `completed` once it is reviewed. New requests that arrive mid-session become tasks too, so the user can see where they sit in the queue.
- **Git: never commit unless the user explicitly tells you to, and never push.** No exceptions: not after a task passes checks, not at the end of a session. Same rule for all subagents.
- `OPEN_ISSUES_MANUAL.md` belongs to the user. Read it, never write it: no ticking items off, no reordering, no gitignoring, no deleting. Copy what you take from it into `TASKS.md` and track progress there.
- Show a screenshot at every step. After each task, drive the running dev server headlessly and send the user an image of what changed — the page the task touched, at the width that shows it best. A description of a visual change is not a substitute for the change itself.

## Tech stack

| Concern | Choice |
| --- | --- |
| UI | Svelte 5 (runes) + TypeScript |
| Build / dev server | Vite (`svelte-ts` template), `base: './'` so the build works from any subfolder |
| FIT decoding | `@garmin/fitsdk` (official Garmin JavaScript SDK), run in a Web Worker |
| Cache of parsed runs | IndexedDB through `idb-keyval` |
| Settings | `localStorage` |
| Charts | Hand-written SVG Svelte components. No chart library. |
| Routing | Hash routes (`#/`, `#/runs`, `#/trends`, `#/records`, `#/settings`) read from `location.hash`. No router library. |
| i18n | Plain TypeScript dictionaries (`en.ts`, `fr.ts`) + `Intl` for numbers and dates. No i18n library. |
| Fonts | Self-hosted with `@fontsource-variable/inter` and `@fontsource/space-grotesk`. No Google Fonts requests. |
| Tests | Vitest for everything under `src/lib` |
| Format / checks | Prettier with `prettier-plugin-svelte`, `svelte-check` |
| Hosting | Any static host. A GitHub Pages workflow is included. |

Do not add other runtime dependencies without a strong reason.

## Code rules

The code must be simple, stupid and readable.

- **No comments.** Make the code explain itself with clear names and small functions. If something needs a comment, rename or split it instead.
- Plain functions and plain objects. No classes unless a library needs one.
- One concept per file. Keep files short. Pure logic lives in `src/lib`, UI in `src/components` and `src/pages`.
- Svelte 5 runes only: `$state`, `$derived`, `$props`. Avoid `$effect` unless you are syncing with the outside world (`localStorage`, `location.hash`).
- Shared state lives in a few `*.svelte.ts` modules that export a `$state` object. No store libraries.
- Store values in SI units internally: meters, seconds, meters per second, bpm. Convert only when formatting for display.
- Every string the user sees goes through `t()`. No hard-coded copy in components.
- Plain CSS. Design tokens are CSS custom properties in `src/app.css`. Component styles are scoped `<style>` blocks. No CSS framework.
- No premature abstraction. Duplicating three lines is fine. A generic helper used once is not.
- Strict TypeScript with simple types. No `any`, no clever generics.

## Commands

```
npm run dev      # local dev server on 0.0.0.0:8080
npm run check    # svelte-check + tsc
npm test         # vitest
npm run build    # static site in dist/
```

Keep `npm run dev` running in the background at all times, so the user can watch progress
at `http://localhost:8080`. Start it as soon as a session begins work, check it is still
up after each task, and restart it when it dies. The port is pinned in `vite.config.ts`
(`port: 8080`, `strictPort: true`) and the server listens on every interface.

## Privacy

- FIT files contain GPS tracks and can reveal where someone lives. Never commit them.
- `fit-samples/` is gitignored. The user may put real files there for manual testing.
- Unit tests use small synthetic record arrays written in the test, never real files.
