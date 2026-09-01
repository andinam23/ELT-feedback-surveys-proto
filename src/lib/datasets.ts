import db from "./db";
import type {
  DatasetRecord,
  DatasetSummary,
  ParsedDataset,
  ResponseRecord,
} from "./types";

type DatasetRow = {
  id: number;
  term_label: string;
  source_filename: string;
  uploaded_at: string;
  rating_questions: string;
  comment_questions: string;
};

type ResponseRow = {
  id: number;
  dataset_id: number;
  row_index: number;
  teacher_raw: string;
  teacher_name: string | null;
  is_unassigned: number;
  class_name: string;
  ratings: string;
  comments: string;
};

function rowToResponse(row: ResponseRow): ResponseRecord {
  return {
    id: row.id,
    datasetId: row.dataset_id,
    rowIndex: row.row_index,
    teacherRaw: row.teacher_raw,
    teacherName: row.teacher_name,
    isUnassigned: !!row.is_unassigned,
    className: row.class_name,
    ratings: JSON.parse(row.ratings),
    comments: JSON.parse(row.comments),
  };
}

export function createDataset(
  termLabel: string,
  sourceFilename: string,
  parsed: ParsedDataset,
): number {
  const insertDataset = db.prepare(`
    INSERT INTO datasets (term_label, source_filename, uploaded_at, rating_questions, comment_questions)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertResponse = db.prepare(`
    INSERT INTO responses (dataset_id, row_index, teacher_raw, teacher_name, is_unassigned, class_name, ratings, comments)
    VALUES (@datasetId, @rowIndex, @teacherRaw, @teacherName, @isUnassigned, @className, @ratings, @comments)
  `);

  const txn = db.transaction(() => {
    const info = insertDataset.run(
      termLabel,
      sourceFilename,
      new Date().toISOString(),
      JSON.stringify(parsed.ratingQuestions),
      JSON.stringify(parsed.commentQuestions),
    );
    const datasetId = Number(info.lastInsertRowid);

    for (const r of parsed.responses) {
      insertResponse.run({
        datasetId,
        rowIndex: r.rowIndex,
        teacherRaw: r.teacherRaw,
        teacherName: r.isUnassigned ? null : r.teacherName,
        isUnassigned: r.isUnassigned ? 1 : 0,
        className: r.className,
        ratings: JSON.stringify(r.ratings),
        comments: JSON.stringify(r.comments),
      });
    }

    return datasetId;
  });

  return txn();
}

function toSummary(row: DatasetRow): DatasetSummary {
  const counts = db
    .prepare(
      `SELECT
         COUNT(*) as responseCount,
         COUNT(DISTINCT CASE WHEN is_unassigned = 0 THEN teacher_name END) as teacherCount,
         SUM(is_unassigned) as unassignedCount
       FROM responses WHERE dataset_id = ?`,
    )
    .get(row.id) as {
    responseCount: number;
    teacherCount: number;
    unassignedCount: number | null;
  };

  return {
    id: row.id,
    termLabel: row.term_label,
    sourceFilename: row.source_filename,
    uploadedAt: row.uploaded_at,
    responseCount: counts.responseCount,
    teacherCount: counts.teacherCount,
    unassignedCount: counts.unassignedCount ?? 0,
  };
}

export function listDatasets(): DatasetSummary[] {
  const rows = db
    .prepare(`SELECT * FROM datasets ORDER BY uploaded_at DESC`)
    .all() as DatasetRow[];
  return rows.map(toSummary);
}

export function getDataset(id: number): DatasetRecord | null {
  const row = db.prepare(`SELECT * FROM datasets WHERE id = ?`).get(id) as
    | DatasetRow
    | undefined;
  if (!row) return null;
  return {
    ...toSummary(row),
    ratingQuestions: JSON.parse(row.rating_questions),
    commentQuestions: JSON.parse(row.comment_questions),
  };
}

export function getResponses(datasetId: number): ResponseRecord[] {
  const rows = db
    .prepare(`SELECT * FROM responses WHERE dataset_id = ? ORDER BY row_index`)
    .all(datasetId) as ResponseRow[];
  return rows.map(rowToResponse);
}

export function getUnassignedGroups(
  datasetId: number,
): { className: string; teacherRaw: string; count: number; responseIds: number[] }[] {
  const rows = db
    .prepare(
      `SELECT id, class_name, teacher_raw FROM responses WHERE dataset_id = ? AND is_unassigned = 1`,
    )
    .all(datasetId) as { id: number; class_name: string; teacher_raw: string }[];

  const groups = new Map<
    string,
    { className: string; teacherRaw: string; count: number; responseIds: number[] }
  >();
  for (const r of rows) {
    const key = r.class_name;
    const g = groups.get(key) ?? {
      className: r.class_name,
      teacherRaw: r.teacher_raw,
      count: 0,
      responseIds: [],
    };
    g.count++;
    g.responseIds.push(r.id);
    groups.set(key, g);
  }
  return Array.from(groups.values()).sort((a, b) => a.className.localeCompare(b.className));
}

export function assignTeacherToResponses(responseIds: number[], teacherName: string): void {
  const trimmed = teacherName.trim();
  const stmt = db.prepare(
    `UPDATE responses SET teacher_name = ?, is_unassigned = 0 WHERE id = ?`,
  );
  const txn = db.transaction((ids: number[]) => {
    for (const id of ids) stmt.run(trimmed, id);
  });
  txn(responseIds);
}

export function deleteDataset(id: number): void {
  db.prepare(`DELETE FROM datasets WHERE id = ?`).run(id);
}
