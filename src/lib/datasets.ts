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
  is_unassigned: boolean;
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
    isUnassigned: row.is_unassigned,
    className: row.class_name,
    ratings: JSON.parse(row.ratings),
    comments: JSON.parse(row.comments),
  };
}

export async function createDataset(
  termLabel: string,
  sourceFilename: string,
  parsed: ParsedDataset,
): Promise<number> {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    const datasetResult = await client.query<{ id: number }>(
      `INSERT INTO datasets (term_label, source_filename, uploaded_at, rating_questions, comment_questions)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        termLabel,
        sourceFilename,
        new Date().toISOString(),
        JSON.stringify(parsed.ratingQuestions),
        JSON.stringify(parsed.commentQuestions),
      ],
    );
    const datasetId = datasetResult.rows[0].id;

    for (const r of parsed.responses) {
      await client.query(
        `INSERT INTO responses (dataset_id, row_index, teacher_raw, teacher_name, is_unassigned, class_name, ratings, comments)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          datasetId,
          r.rowIndex,
          r.teacherRaw,
          r.isUnassigned ? null : r.teacherName,
          r.isUnassigned,
          r.className,
          JSON.stringify(r.ratings),
          JSON.stringify(r.comments),
        ],
      );
    }

    await client.query("COMMIT");
    return datasetId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function toSummary(row: DatasetRow): Promise<DatasetSummary> {
  const [counts] = await db.sql<{
    responseCount: number;
    teacherCount: number;
    unassignedCount: number;
  }>`SELECT
       COUNT(*)::int as "responseCount",
       COUNT(DISTINCT CASE WHEN is_unassigned = FALSE THEN teacher_name END)::int as "teacherCount",
       COUNT(*) FILTER (WHERE is_unassigned)::int as "unassignedCount"
     FROM responses WHERE dataset_id = ${row.id}`;

  return {
    id: row.id,
    termLabel: row.term_label,
    sourceFilename: row.source_filename,
    uploadedAt: row.uploaded_at,
    responseCount: counts.responseCount,
    teacherCount: counts.teacherCount,
    unassignedCount: counts.unassignedCount,
  };
}

export async function listDatasets(): Promise<DatasetSummary[]> {
  const rows = await db.sql<DatasetRow>`SELECT * FROM datasets ORDER BY uploaded_at DESC`;
  return Promise.all(rows.map(toSummary));
}

export async function getDataset(id: number): Promise<DatasetRecord | null> {
  const [row] = await db.sql<DatasetRow>`SELECT * FROM datasets WHERE id = ${id}`;
  if (!row) return null;
  return {
    ...(await toSummary(row)),
    ratingQuestions: JSON.parse(row.rating_questions),
    commentQuestions: JSON.parse(row.comment_questions),
  };
}

export async function getResponses(datasetId: number): Promise<ResponseRecord[]> {
  const rows = await db.sql<ResponseRow>`
    SELECT * FROM responses WHERE dataset_id = ${datasetId} ORDER BY row_index
  `;
  return rows.map(rowToResponse);
}

export async function getUnassignedGroups(
  datasetId: number,
): Promise<{ className: string; teacherRaw: string; count: number; responseIds: number[] }[]> {
  const rows = await db.sql<{ id: number; class_name: string; teacher_raw: string }>`
    SELECT id, class_name, teacher_raw FROM responses
    WHERE dataset_id = ${datasetId} AND is_unassigned = TRUE
  `;

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

export async function assignTeacherToResponses(
  responseIds: number[],
  teacherName: string,
): Promise<void> {
  const trimmed = teacherName.trim();
  await db.sql`
    UPDATE responses SET teacher_name = ${trimmed}, is_unassigned = FALSE
    WHERE id = ANY(${responseIds})
  `;
}

export async function deleteDataset(id: number): Promise<void> {
  await db.sql`DELETE FROM datasets WHERE id = ${id}`;
}
