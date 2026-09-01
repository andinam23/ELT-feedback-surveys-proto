# ELT Feedback Tool (prototype)

Turns a term's raw student feedback spreadsheet into per-teacher summaries, AI-drafted
PD suggestions, and an executive report — a single-user prototype, no accounts, no
multi-tenancy. Deployed on Netlify with Netlify DB (Postgres, auto-provisioned).

## Status

**All four stages (4-7) are built:** upload → parse → per-teacher grouping; AI-generated
per-teacher summaries (themes, flagged concerns, PD suggestions) with editable PD actions;
per-teacher PDF + full Excel workbook export; and an executive report (in-app dashboard +
PDF) with department-wide trends, flagged teachers, and term-over-term comparison once a
second term is uploaded.

Requires `ANTHROPIC_API_KEY` in `.env.local` for AI summary/executive-narrative generation;
upload, parsing, browsing, and the computed (non-AI) parts of the executive report work
without it.

## Setup

**Deployed:** this app is hosted on Netlify, with a Netlify DB (Postgres) instance
auto-provisioned for it — no manual database setup. Set `ANTHROPIC_API_KEY` as a site
environment variable in the Netlify dashboard for AI features to work.

**Local dev (optional):** requires a Postgres instance and `DATABASE_URL` pointed at it
(the app falls back to Netlify's own auto-injected connection when running via
`netlify dev`, or to `DATABASE_URL` otherwise):

```bash
npm install
DATABASE_URL="postgres://user:pass@localhost:5432/dbname" npm run dev
```

Then open http://localhost:3000. The tables are created by
`netlify/database/migrations/001_init/migration.sql` — run it against your local Postgres
once before first use (`psql $DATABASE_URL -f netlify/database/migrations/001_init/migration.sql`).

## Uploading a feedback file

The uploaded file should be one row per student response, with:

- A teacher column (header like "Assigned To" or "Teacher")
- A class column (header like "Class")
- Any number of 1-5 rated question columns
- Any number of free-text comment columns (question headers containing "?")

The parser infers which columns are ratings vs. free text by sampling their values, so
it isn't hardcoded to one school's exact question wording — a future term with
different/more questions should still parse correctly, as long as the teacher/class
columns are named similarly.

Each upload is tagged with a term label (guessed from the filename, editable) so
multiple terms can later be compared.

### Known data quirk this was built against

Some rows may have a placeholder value like "Portal Teacher" in the teacher column
instead of a real name. These are flagged as **unassigned** rather than guessed at —
resolve them from the dataset page by typing in the correct teacher per affected class.

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind
- Postgres via `@netlify/database` (auto-provisioned on deploy, no manual DB setup)
- `exceljs` / `papaparse` for spreadsheet parsing, and `exceljs` again for the Excel export
- `@anthropic-ai/sdk` (model `claude-opus-5` by default — override with `ANTHROPIC_MODEL`,
  e.g. `claude-sonnet-5`, if you want to trade quality for cost on a large dataset) for the
  per-teacher theme/PD analysis, using structured outputs (`messages.parse` + a Zod schema)
- `@react-pdf/renderer` for the per-teacher PDF export

## Project layout

```
src/lib/parseFeedback.ts        spreadsheet -> normalized responses (generic column inference)
src/lib/db.ts                   Netlify DB connection (lazy-initialized)
netlify/database/migrations/    Postgres schema, applied automatically on deploy
src/lib/datasets.ts             dataset/response persistence
src/lib/analysis.ts             per-teacher averages + spread (std dev)
src/lib/summaries.ts            AI summary persistence (themes, concerns, PD actions)
src/lib/ai/teacherAnalysis.ts   Claude API call + schema for the per-teacher analysis
src/lib/export/excel.ts         dataset -> Excel workbook (one tab per teacher)
src/lib/export/TeacherPdfDocument.tsx  per-teacher PDF layout
src/app/                        pages + API routes
```

## AI summaries

Each teacher's per-response ratings and every free-text comment are sent to Claude in one
call, which returns (as structured JSON, not free text): a 2-3 sentence narrative, clustered
themes with sentiment, any genuinely urgent/negative flagged concerns, and 2-3 evidence-
grounded PD suggestions. PD suggestions are editable in the app before export — edits are
preserved until you explicitly regenerate.

"Generate AI summaries" on a dataset page only processes teachers without one yet;
"Regenerate all" reprocesses everyone (and discards PD edits). Both run with limited
concurrency (3 at a time) so a large dataset doesn't hammer the API — expect it to take a
few minutes for 30+ teachers.

## Executive report

`/datasets/[id]/executive` computes department-wide stats live from the data (overall
average, top/bottom rating categories, top/bottom teachers, and anyone flagged — either by
an AI-flagged concern or a low overall average) and, separately, an optional AI-written
narrative + key takeaways you generate on demand from those stats plus the aggregated
themes across all per-teacher summaries. Term-over-term comparison appears automatically
once a second dataset is uploaded, matched to the immediately preceding upload by upload
time and compared question-by-question (only where the wording matches between terms).
Exports as PDF from the same page.
