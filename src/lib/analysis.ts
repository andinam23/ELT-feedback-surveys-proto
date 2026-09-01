import type { CategoryStat, ResponseRecord, TeacherStats } from "./types";

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Group responses by resolved teacher name (unassigned rows excluded). */
export function groupByTeacher(
  responses: ResponseRecord[],
): Map<string, ResponseRecord[]> {
  const map = new Map<string, ResponseRecord[]>();
  for (const r of responses) {
    if (r.isUnassigned || !r.teacherName) continue;
    const list = map.get(r.teacherName) ?? [];
    list.push(r);
    map.set(r.teacherName, list);
  }
  return map;
}

export function computeTeacherStats(
  teacherName: string,
  responses: ResponseRecord[],
  ratingQuestions: string[],
): TeacherStats {
  const categories: CategoryStat[] = ratingQuestions.map((question) => {
    const values = responses
      .map((r) => r.ratings[question])
      .filter((v): v is number => typeof v === "number");
    return {
      question,
      average: round2(mean(values)),
      stdDev: round2(stdDev(values)),
      count: values.length,
    };
  });

  const allValues = responses.flatMap((r) => Object.values(r.ratings));
  const classes = Array.from(new Set(responses.map((r) => r.className))).sort();

  return {
    teacherName,
    responseCount: responses.length,
    classCount: classes.length,
    classes,
    overallAverage: round2(mean(allValues)),
    overallStdDev: round2(stdDev(allValues)),
    categories,
  };
}

export function computeAllTeacherStats(
  responses: ResponseRecord[],
  ratingQuestions: string[],
): TeacherStats[] {
  const grouped = groupByTeacher(responses);
  const stats = Array.from(grouped.entries()).map(([name, rows]) =>
    computeTeacherStats(name, rows, ratingQuestions),
  );
  return stats.sort((a, b) => a.teacherName.localeCompare(b.teacherName));
}
