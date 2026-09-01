import {
  computeAllTeacherStats,
  computeDatasetCategoryStats,
  round2,
} from "./analysis";
import { getDataset, getResponses, listDatasets } from "./datasets";
import { listSummaries } from "./summaries";
import type { ExecutiveStats, FlaggedTeacher, TermComparison, TermComparisonRow } from "./types";

const LOW_AVERAGE_THRESHOLD = 3.5;
const MIN_RESPONSES_FOR_RANKING = 2;

async function computeTermComparison(
  datasetId: number,
  currentOverall: number,
  currentCategories: { question: string; average: number }[],
): Promise<TermComparison | null> {
  const allDatasets = (await listDatasets()).sort(
    (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime(),
  );
  const currentIndex = allDatasets.findIndex((d) => d.id === datasetId);
  if (currentIndex <= 0) return null; // no earlier dataset uploaded

  const previous = allDatasets[currentIndex - 1];
  const previousDataset = await getDataset(previous.id);
  if (!previousDataset) return null;

  const previousResponses = await getResponses(previous.id);
  const previousCategories = computeDatasetCategoryStats(
    previousResponses,
    previousDataset.ratingQuestions,
  );
  const previousOverallValues = previousResponses.flatMap((r) => Object.values(r.ratings));
  const previousOverall =
    previousOverallValues.length > 0
      ? round2(previousOverallValues.reduce((a, b) => a + b, 0) / previousOverallValues.length)
      : 0;

  const previousByQuestion = new Map(previousCategories.map((c) => [c.question, c.average]));

  // Only compare questions that appear in both terms - a differently worded
  // survey between terms just won't line up here, which is the honest answer.
  const categories: TermComparisonRow[] = currentCategories.map((c) => {
    const prev = previousByQuestion.get(c.question) ?? null;
    return {
      question: c.question,
      current: c.average,
      previous: prev,
      delta: prev !== null ? round2(c.average - prev) : null,
    };
  });

  return {
    previousTermLabel: previous.termLabel,
    previousDatasetId: previous.id,
    overallCurrent: currentOverall,
    overallPrevious: previousOverall,
    overallDelta: round2(currentOverall - previousOverall),
    categories,
  };
}

export async function computeExecutiveStats(datasetId: number): Promise<ExecutiveStats> {
  const dataset = await getDataset(datasetId);
  if (!dataset) throw new Error("Dataset not found");

  const responses = await getResponses(datasetId);
  const categories = computeDatasetCategoryStats(responses, dataset.ratingQuestions);
  const allValues = responses.flatMap((r) => Object.values(r.ratings));
  const overallAverage = round2(
    allValues.length > 0 ? allValues.reduce((a, b) => a + b, 0) / allValues.length : 0,
  );

  const sortedCategories = [...categories].sort((a, b) => b.average - a.average);
  const topCategories = sortedCategories.slice(0, 3);
  const bottomCategories = sortedCategories.slice(-3).reverse();

  const teacherStats = computeAllTeacherStats(responses, dataset.ratingQuestions);
  const rankable = teacherStats.filter((t) => t.responseCount >= MIN_RESPONSES_FOR_RANKING);
  const rankedByAverage = [...rankable].sort((a, b) => b.overallAverage - a.overallAverage);
  const topTeachers = rankedByAverage.slice(0, 5);
  const bottomTeachers = rankedByAverage.slice(-5).reverse();

  const summaries = await listSummaries(datasetId);
  const summaryByTeacher = new Map(summaries.map((s) => [s.teacherName, s]));

  const flaggedTeachers: FlaggedTeacher[] = [];
  for (const t of teacherStats) {
    const reasons: string[] = [];
    const summary = summaryByTeacher.get(t.teacherName);
    if (summary && summary.flaggedConcerns.length > 0) {
      reasons.push(...summary.flaggedConcerns);
    }
    if (t.overallAverage < LOW_AVERAGE_THRESHOLD && t.responseCount >= MIN_RESPONSES_FOR_RANKING) {
      reasons.push(`Low overall average (${t.overallAverage.toFixed(2)}/5)`);
    }
    if (reasons.length > 0) {
      flaggedTeachers.push({ teacherName: t.teacherName, overallAverage: t.overallAverage, reasons });
    }
  }
  flaggedTeachers.sort((a, b) => a.overallAverage - b.overallAverage);

  const termComparison = await computeTermComparison(datasetId, overallAverage, categories);

  return {
    totalResponses: dataset.responseCount,
    totalTeachers: dataset.teacherCount,
    overallAverage,
    categories,
    topCategories,
    bottomCategories,
    topTeachers,
    bottomTeachers,
    flaggedTeachers,
    termComparison,
  };
}
