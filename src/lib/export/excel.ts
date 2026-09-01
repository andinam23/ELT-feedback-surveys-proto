import ExcelJS from "exceljs";
import { computeAllTeacherStats } from "../analysis";
import type { DatasetRecord, ResponseRecord, TeacherSummary } from "../types";

const INVALID_SHEET_CHARS = /[*?:\\/[\]]/g;

function sheetName(name: string, used: Set<string>): string {
  const base = name.replace(INVALID_SHEET_CHARS, " ").trim().slice(0, 31) || "Sheet";
  let candidate = base;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${n})`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
    n++;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFEFEFEF" },
};

function styleHeaderRow(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
  });
}

export async function buildDatasetWorkbook(
  dataset: DatasetRecord,
  responses: ResponseRecord[],
  summaries: Map<string, TeacherSummary>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ELT Feedback Tool";
  workbook.created = new Date();

  const teacherStats = computeAllTeacherStats(responses, dataset.ratingQuestions);
  const usedNames = new Set<string>();

  // --- Summary sheet ---
  const summarySheet = workbook.addWorksheet(sheetName("Summary", usedNames));
  const summaryHeader = [
    "Teacher",
    "Responses",
    "Classes",
    ...dataset.ratingQuestions,
    "Overall Avg",
    "Spread (SD)",
    "Flagged concerns",
  ];
  styleHeaderRow(summarySheet.addRow(summaryHeader));
  for (const t of teacherStats) {
    const s = summaries.get(t.teacherName);
    summarySheet.addRow([
      t.teacherName,
      t.responseCount,
      t.classCount,
      ...t.categories.map((c) => c.average),
      t.overallAverage,
      t.overallStdDev,
      s ? s.flaggedConcerns.length : "",
    ]);
  }
  summarySheet.columns.forEach((col, i) => {
    col.width = i === 0 ? 28 : 16;
  });
  summarySheet.getRow(1).height = 30;
  summarySheet.views = [{ state: "frozen", ySplit: 1 }];

  // --- Per-teacher sheets ---
  const responsesByTeacher = new Map<string, ResponseRecord[]>();
  for (const r of responses) {
    if (r.isUnassigned || !r.teacherName) continue;
    const list = responsesByTeacher.get(r.teacherName) ?? [];
    list.push(r);
    responsesByTeacher.set(r.teacherName, list);
  }

  for (const t of teacherStats) {
    const teacherResponses = responsesByTeacher.get(t.teacherName) ?? [];
    const summary = summaries.get(t.teacherName);
    const sheet = workbook.addWorksheet(sheetName(t.teacherName, usedNames));

    sheet.addRow([`Feedback Report – ${t.teacherName}`]);
    sheet.getRow(1).font = { bold: true, size: 14 };
    sheet.addRow([]);
    sheet.addRow(["Total Responses", t.responseCount, "Overall Avg", t.overallAverage]);
    sheet.addRow([]);

    styleHeaderRow(sheet.addRow(dataset.ratingQuestions));
    sheet.addRow(t.categories.map((c) => c.average));
    sheet.addRow([]);

    if (summary) {
      styleHeaderRow(sheet.addRow(["AI Summary"]));
      sheet.addRow([summary.narrative]);
      sheet.addRow([]);

      if (summary.themes.length > 0) {
        sheet.addRow(["Themes"]).font = { bold: true };
        for (const theme of summary.themes) {
          sheet.addRow([theme.theme, theme.sentiment, `${theme.mentions} mentions`]);
        }
        sheet.addRow([]);
      }

      if (summary.flaggedConcerns.length > 0) {
        sheet.addRow(["Flagged concerns"]).font = { bold: true, color: { argb: "FFAA0000" } };
        for (const c of summary.flaggedConcerns) sheet.addRow([c]);
        sheet.addRow([]);
      }

      if (summary.pdActions.length > 0) {
        sheet.addRow(["PD / action plan"]).font = { bold: true };
        summary.pdActions.forEach((a, i) => sheet.addRow([`${i + 1}. ${a}`]));
        sheet.addRow([]);
      }
    }

    styleHeaderRow(sheet.addRow(["Individual Student Feedback"]));
    styleHeaderRow(sheet.addRow(["#", "Class", ...dataset.commentQuestions]));
    teacherResponses.forEach((r, i) => {
      sheet.addRow([
        i + 1,
        r.className,
        ...dataset.commentQuestions.map((q) => r.comments[q] ?? ""),
      ]);
    });

    sheet.columns.forEach((col, i) => {
      col.width = i === 0 ? 5 : i === 1 ? 30 : 40;
      col.alignment = { wrapText: true, vertical: "top" };
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
