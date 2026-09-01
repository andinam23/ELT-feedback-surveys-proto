import db from "./db";
import type { TeacherSummary } from "./types";
import type { TeacherAnalysis } from "./ai/teacherAnalysis";

type SummaryRow = {
  id: number;
  dataset_id: number;
  teacher_name: string;
  narrative: string;
  themes: string;
  flagged_concerns: string;
  pd_actions: string;
  generated_at: string;
  edited_at: string | null;
};

function rowToSummary(row: SummaryRow): TeacherSummary {
  return {
    id: row.id,
    datasetId: row.dataset_id,
    teacherName: row.teacher_name,
    narrative: row.narrative,
    themes: JSON.parse(row.themes),
    flaggedConcerns: JSON.parse(row.flagged_concerns),
    pdActions: JSON.parse(row.pd_actions),
    generatedAt: row.generated_at,
    editedAt: row.edited_at,
  };
}

export async function saveTeacherSummary(
  datasetId: number,
  teacherName: string,
  analysis: TeacherAnalysis,
): Promise<TeacherSummary> {
  const now = new Date().toISOString();
  const themes = JSON.stringify(analysis.themes);
  const flaggedConcerns = JSON.stringify(analysis.flaggedConcerns);
  const pdActions = JSON.stringify(analysis.pdActions);

  const [row] = await db.sql<SummaryRow>`
    INSERT INTO teacher_summaries
      (dataset_id, teacher_name, narrative, themes, flagged_concerns, pd_actions, generated_at, edited_at)
    VALUES (${datasetId}, ${teacherName}, ${analysis.narrative}, ${themes}, ${flaggedConcerns}, ${pdActions}, ${now}, NULL)
    ON CONFLICT (dataset_id, teacher_name) DO UPDATE SET
      narrative = EXCLUDED.narrative,
      themes = EXCLUDED.themes,
      flagged_concerns = EXCLUDED.flagged_concerns,
      pd_actions = EXCLUDED.pd_actions,
      generated_at = EXCLUDED.generated_at,
      edited_at = NULL
    RETURNING *
  `;
  return rowToSummary(row);
}

export async function getTeacherSummary(
  datasetId: number,
  teacherName: string,
): Promise<TeacherSummary | null> {
  const [row] = await db.sql<SummaryRow>`
    SELECT * FROM teacher_summaries WHERE dataset_id = ${datasetId} AND teacher_name = ${teacherName}
  `;
  return row ? rowToSummary(row) : null;
}

export async function listSummaries(datasetId: number): Promise<TeacherSummary[]> {
  const rows = await db.sql<SummaryRow>`
    SELECT * FROM teacher_summaries WHERE dataset_id = ${datasetId}
  `;
  return rows.map(rowToSummary);
}

export async function updatePdActions(
  datasetId: number,
  teacherName: string,
  pdActions: string[],
): Promise<TeacherSummary | null> {
  const [row] = await db.sql<SummaryRow>`
    UPDATE teacher_summaries SET pd_actions = ${JSON.stringify(pdActions)}, edited_at = ${new Date().toISOString()}
    WHERE dataset_id = ${datasetId} AND teacher_name = ${teacherName}
    RETURNING *
  `;
  return row ? rowToSummary(row) : null;
}
