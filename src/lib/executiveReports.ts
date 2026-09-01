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

export async function saveExecutiveReport(
  datasetId: number,
  analysis: ExecutiveAnalysis,
): Promise<ExecutiveReport> {
  const now = new Date().toISOString();
  const content = JSON.stringify(analysis);
  const [row] = await db.sql<Row>`
    INSERT INTO executive_reports (dataset_id, content, generated_at)
    VALUES (${datasetId}, ${content}, ${now})
    ON CONFLICT (dataset_id) DO UPDATE SET content = EXCLUDED.content, generated_at = EXCLUDED.generated_at
    RETURNING *
  `;
  return rowToReport(row);
}

export async function getExecutiveReport(datasetId: number): Promise<ExecutiveReport | null> {
  const [row] = await db.sql<Row>`SELECT * FROM executive_reports WHERE dataset_id = ${datasetId}`;
  return row ? rowToReport(row) : null;
}
