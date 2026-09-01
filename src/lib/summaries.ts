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

export function saveTeacherSummary(
  datasetId: number,
  teacherName: string,
  analysis: TeacherAnalysis,
): TeacherSummary {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO teacher_summaries
       (dataset_id, teacher_name, narrative, themes, flagged_concerns, pd_actions, generated_at, edited_at)
     VALUES (@datasetId, @teacherName, @narrative, @themes, @flaggedConcerns, @pdActions, @generatedAt, NULL)
     ON CONFLICT(dataset_id, teacher_name) DO UPDATE SET
       narrative = excluded.narrative,
       themes = excluded.themes,
       flagged_concerns = excluded.flagged_concerns,
       pd_actions = excluded.pd_actions,
       generated_at = excluded.generated_at,
       edited_at = NULL`,
  ).run({
    datasetId,
    teacherName,
    narrative: analysis.narrative,
    themes: JSON.stringify(analysis.themes),
    flaggedConcerns: JSON.stringify(analysis.flaggedConcerns),
    pdActions: JSON.stringify(analysis.pdActions),
    generatedAt: now,
  });

  return getTeacherSummary(datasetId, teacherName)!;
}

export function getTeacherSummary(datasetId: number, teacherName: string): TeacherSummary | null {
  const row = db
    .prepare(`SELECT * FROM teacher_summaries WHERE dataset_id = ? AND teacher_name = ?`)
    .get(datasetId, teacherName) as SummaryRow | undefined;
  return row ? rowToSummary(row) : null;
}

export function listSummaries(datasetId: number): TeacherSummary[] {
  const rows = db
    .prepare(`SELECT * FROM teacher_summaries WHERE dataset_id = ?`)
    .all(datasetId) as SummaryRow[];
  return rows.map(rowToSummary);
}

export function updatePdActions(
  datasetId: number,
  teacherName: string,
  pdActions: string[],
): TeacherSummary | null {
  const info = db
    .prepare(
      `UPDATE teacher_summaries SET pd_actions = ?, edited_at = ?
       WHERE dataset_id = ? AND teacher_name = ?`,
    )
    .run(JSON.stringify(pdActions), new Date().toISOString(), datasetId, teacherName);
  if (info.changes === 0) return null;
  return getTeacherSummary(datasetId, teacherName);
}
