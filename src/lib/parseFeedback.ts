import ExcelJS from "exceljs";
import Papa from "papaparse";
import type { ParsedDataset, ParsedResponse } from "./types";

const TEACHER_HEADER_CANDIDATES = [
  "assigned to",
  "teacher",
  "teacher name",
  "instructor",
];
const CLASS_HEADER_CANDIDATES = ["class", "class name", "course", "course name"];

// Values that mean "no comment given" rather than an actual answer.
const EMPTY_COMMENT_VALUES = new Set(["-", "--", "n/a", "na", "none", ""]);

// Teacher-field values that are data-entry placeholders, not real teachers.
const PLACEHOLDER_TEACHER_VALUES = new Set(["portal teacher", "unknown", ""]);

type Grid = { headers: string[]; rows: unknown[][] };

function cellToPlain(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    // ExcelJS rich text / hyperlink cells
    const v = value as { text?: string; richText?: { text: string }[]; result?: unknown };
    if (typeof v.text === "string") return v.text;
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join("");
    if (v.result !== undefined) return cellToPlain(v.result);
    return "";
  }
  return String(value);
}

async function readXlsx(buffer: Buffer): Promise<Grid> {
  const workbook = new ExcelJS.Workbook();
  // exceljs's bundled types pin an older, incompatible Buffer generic; the
  // value is a real Buffer at runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(buffer as any);
  // Use the first worksheet that actually has rows — some exports include
  // stray blank sheets.
  const worksheet =
    workbook.worksheets.find((ws) => ws.rowCount > 1) ?? workbook.worksheets[0];
  if (!worksheet) throw new Error("The workbook has no worksheets.");

  const rows: unknown[][] = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const values: unknown[] = [];
    // row.values is 1-indexed with a sparse leading undefined; normalize to 0-indexed.
    const raw = row.values as unknown[];
    for (let i = 1; i < raw.length; i++) {
      values[i - 1] = cellToPlain(raw[i]);
    }
    rows.push(values);
  });

  if (rows.length === 0) throw new Error("The worksheet appears to be empty.");
  const headers = rows[0].map((h) => (h ?? "").toString().trim());
  return { headers, rows: rows.slice(1) };
}

function readCsv(text: string): Grid {
  const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error("Could not parse CSV: " + result.errors[0].message);
  }
  const rows = result.data;
  if (rows.length === 0) throw new Error("The CSV appears to be empty.");
  const headers = rows[0].map((h) => (h ?? "").toString().trim());
  return { headers, rows: rows.slice(1) };
}

function findColumn(headers: string[], candidates: string[]): number {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const candidate of candidates) {
    const idx = lower.indexOf(candidate);
    if (idx !== -1) return idx;
  }
  return -1;
}

function isNumericValue(raw: string): boolean {
  if (raw === "" || raw === null || raw === undefined) return true; // blank tolerated
  const n = Number(raw);
  return !Number.isNaN(n) && raw.trim() !== "";
}

/**
 * Classify each non-teacher/class column as a rating column (numeric 1-5 style
 * scores) or a comment column (free text), by sampling its values. This keeps
 * the parser working for future surveys with a different question set instead
 * of hardcoding today's 9 questions.
 */
function classifyColumns(
  grid: Grid,
  teacherCol: number,
  classCol: number,
): { ratingCols: number[]; commentCols: number[] } {
  const ratingCols: number[] = [];
  const commentCols: number[] = [];

  for (let col = 0; col < grid.headers.length; col++) {
    if (col === teacherCol || col === classCol) continue;
    const header = grid.headers[col];
    if (!header) continue; // trailing blank columns from spreadsheet padding

    if (header.includes("?")) {
      commentCols.push(col);
      continue;
    }

    let numericCount = 0;
    let sampled = 0;
    for (const row of grid.rows) {
      const raw = (row[col] ?? "").toString().trim();
      if (raw === "") continue;
      sampled++;
      if (isNumericValue(raw)) numericCount++;
      if (sampled >= 30) break; // sampling is enough to classify
    }

    if (sampled > 0 && numericCount === sampled) {
      ratingCols.push(col);
    } else if (sampled > 0) {
      commentCols.push(col);
    }
    // columns with no data at all in the sample are dropped silently
  }

  return { ratingCols, commentCols };
}

function parseGrid(grid: Grid, warnings: string[]): ParsedDataset {
  const teacherCol = findColumn(grid.headers, TEACHER_HEADER_CANDIDATES);
  const classCol = findColumn(grid.headers, CLASS_HEADER_CANDIDATES);

  if (teacherCol === -1) {
    throw new Error(
      `Could not find a teacher column. Expected a header like "Assigned To" or "Teacher".`,
    );
  }
  if (classCol === -1) {
    throw new Error(`Could not find a class column. Expected a header like "Class".`);
  }

  const { ratingCols, commentCols } = classifyColumns(grid, teacherCol, classCol);
  if (ratingCols.length === 0) {
    warnings.push("No rating (numeric) question columns were detected.");
  }
  if (commentCols.length === 0) {
    warnings.push("No free-text comment columns were detected.");
  }

  const ratingQuestions = ratingCols.map((c) => grid.headers[c]);
  const commentQuestions = commentCols.map((c) => grid.headers[c]);

  const responses: ParsedResponse[] = [];

  grid.rows.forEach((row, i) => {
    const teacherRaw = (row[teacherCol] ?? "").toString().trim();
    const className = (row[classCol] ?? "").toString().trim();

    // Skip fully blank rows (common at the end of a sheet).
    if (!teacherRaw && !className && row.every((v) => (v ?? "").toString().trim() === "")) {
      return;
    }

    const isUnassigned = PLACEHOLDER_TEACHER_VALUES.has(teacherRaw.toLowerCase());

    const ratings: Record<string, number> = {};
    ratingCols.forEach((col, idx) => {
      const raw = (row[col] ?? "").toString().trim();
      if (raw === "") return;
      const n = Number(raw);
      if (!Number.isNaN(n)) ratings[ratingQuestions[idx]] = n;
    });

    const comments: Record<string, string> = {};
    commentCols.forEach((col, idx) => {
      const raw = (row[col] ?? "").toString().trim();
      if (raw === "" || EMPTY_COMMENT_VALUES.has(raw.toLowerCase())) return;
      comments[commentQuestions[idx]] = raw;
    });

    responses.push({
      rowIndex: i + 2, // +1 for 0-index, +1 for header row
      teacherRaw,
      teacherName: isUnassigned ? "" : teacherRaw,
      isUnassigned,
      className,
      ratings,
      comments,
    });
  });

  if (responses.length === 0) {
    warnings.push("No data rows were found after the header row.");
  }

  return { ratingQuestions, commentQuestions, responses, warnings };
}

export async function parseFeedbackFile(
  buffer: Buffer,
  filename: string,
): Promise<ParsedDataset> {
  const warnings: string[] = [];
  const ext = filename.toLowerCase().split(".").pop();

  let grid: Grid;
  if (ext === "csv") {
    grid = readCsv(buffer.toString("utf-8"));
  } else if (ext === "xlsx" || ext === "xlsm" || ext === "xls") {
    grid = await readXlsx(buffer);
  } else {
    throw new Error(`Unsupported file type ".${ext}". Upload a .xlsx or .csv file.`);
  }

  return parseGrid(grid, warnings);
}

export { guessTermLabel } from "./util";
