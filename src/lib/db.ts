import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// Single local SQLite file — this is a single-user prototype, no auth,
// no multi-tenancy. Lives outside the repo (gitignored) so it survives
// `npm run dev` restarts but never gets committed.
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "app.db");

declare global {
  var __eltDb: Database.Database | undefined;
}

// Reuse the connection across hot-reloads in dev (Next.js re-evaluates
// modules on every request in dev mode otherwise, which would exhaust
// file handles).
const db = global.__eltDb ?? new Database(dbPath);
if (process.env.NODE_ENV !== "production") global.__eltDb = db;

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS datasets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    term_label TEXT NOT NULL,
    source_filename TEXT NOT NULL,
    uploaded_at TEXT NOT NULL,
    rating_questions TEXT NOT NULL, -- JSON array
    comment_questions TEXT NOT NULL -- JSON array
  );

  CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    row_index INTEGER NOT NULL,
    teacher_raw TEXT NOT NULL,
    teacher_name TEXT, -- NULL when unassigned and not yet resolved
    is_unassigned INTEGER NOT NULL DEFAULT 0,
    class_name TEXT NOT NULL,
    ratings TEXT NOT NULL, -- JSON: { question: score }
    comments TEXT NOT NULL -- JSON: { question: text }
  );

  CREATE INDEX IF NOT EXISTS idx_responses_dataset ON responses(dataset_id);
  CREATE INDEX IF NOT EXISTS idx_responses_teacher ON responses(dataset_id, teacher_name);

  CREATE TABLE IF NOT EXISTS teacher_summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    teacher_name TEXT NOT NULL,
    narrative TEXT NOT NULL,
    themes TEXT NOT NULL, -- JSON array of { theme, sentiment, mentions }
    flagged_concerns TEXT NOT NULL, -- JSON array of strings
    pd_actions TEXT NOT NULL, -- JSON array of strings (editable by manager)
    generated_at TEXT NOT NULL,
    edited_at TEXT,
    UNIQUE(dataset_id, teacher_name)
  );

  CREATE TABLE IF NOT EXISTS executive_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    content TEXT NOT NULL, -- JSON
    generated_at TEXT NOT NULL,
    UNIQUE(dataset_id)
  );
`);

export default db;
