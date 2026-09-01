CREATE TABLE datasets (
  id SERIAL PRIMARY KEY,
  term_label TEXT NOT NULL,
  source_filename TEXT NOT NULL,
  uploaded_at TEXT NOT NULL,
  rating_questions TEXT NOT NULL, -- JSON array
  comment_questions TEXT NOT NULL -- JSON array
);

CREATE TABLE responses (
  id SERIAL PRIMARY KEY,
  dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  teacher_raw TEXT NOT NULL,
  teacher_name TEXT, -- NULL when unassigned and not yet resolved
  is_unassigned BOOLEAN NOT NULL DEFAULT FALSE,
  class_name TEXT NOT NULL,
  ratings TEXT NOT NULL, -- JSON: { question: score }
  comments TEXT NOT NULL -- JSON: { question: text }
);

CREATE INDEX idx_responses_dataset ON responses(dataset_id);
CREATE INDEX idx_responses_teacher ON responses(dataset_id, teacher_name);

CREATE TABLE teacher_summaries (
  id SERIAL PRIMARY KEY,
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

CREATE TABLE executive_reports (
  id SERIAL PRIMARY KEY,
  dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  content TEXT NOT NULL, -- JSON
  generated_at TEXT NOT NULL,
  UNIQUE(dataset_id)
);
