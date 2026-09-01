# ELT Feedback Tool (prototype)

Turns a term's raw student feedback spreadsheet into per-teacher summaries, AI-drafted
PD suggestions, and an executive report — a single-user local prototype, no accounts,
no multi-tenancy.

## Status

**Stage 4 (upload → parse → per-teacher grouping) is built.** Stages 5-7 (AI summaries,
PD plans, executive report, PDF/Excel export) are not yet built.

## Setup

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Data is stored locally in `data/app.db` (SQLite, gitignored) — it survives restarts but
never leaves your machine.

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
- SQLite via `better-sqlite3` for local persistence
- `exceljs` / `papaparse` for spreadsheet parsing
- Anthropic API (`@anthropic-ai/sdk`, added but not yet wired up) for the Stage 5-6 AI
  calls — set `ANTHROPIC_API_KEY` in `.env.local` when that lands

## Project layout

```
src/lib/parseFeedback.ts   spreadsheet -> normalized responses (generic column inference)
src/lib/db.ts              SQLite schema + connection
src/lib/datasets.ts        dataset/response persistence
src/lib/analysis.ts        per-teacher averages + spread (std dev)
src/app/                   pages + API routes
```
