import db from "./db";
import type { ExecutiveReport } from "./types";
import type { ExecutiveAnalysis } from "./ai/executiveAnalysis";

type Row = { dataset_id: number; content: string; generated_at: string };

function rowToReport(row: Row): ExecutiveReport {
  const content = JSON.parse(row.content) as ExecutiveAnalysis;
  return {
    datasetId: row.dataset_id,
    narrative: content.narrative,
    keyTakeaways: content.keyTakeaways,
    generatedAt: row.generated_at,
  };
}

export function saveExecutiveReport(datasetId: number, analysis: ExecutiveAnalysis): ExecutiveReport {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO executive_reports (dataset_id, content, generated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(dataset_id) DO UPDATE SET content = excluded.content, generated_at = excluded.generated_at`,
  ).run(datasetId, JSON.stringify(analysis), now);
  return getExecutiveReport(datasetId)!;
}

export function getExecutiveReport(datasetId: number): ExecutiveReport | null {
  const row = db
    .prepare(`SELECT * FROM executive_reports WHERE dataset_id = ?`)
    .get(datasetId) as Row | undefined;
  return row ? rowToReport(row) : null;
}
