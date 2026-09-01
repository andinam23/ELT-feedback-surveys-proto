// Shared types for the feedback pipeline (Stages 4-7).
// Kept generic on purpose: the rating/comment questions are whatever the
// uploaded survey used, not a hardcoded set, so future surveys with
// different questions still parse correctly.

export type ParsedResponse = {
  rowIndex: number; // 1-based row number in the source file, for traceability
  teacherRaw: string; // raw "Assigned To" value exactly as it appeared
  teacherName: string; // resolved teacher name (may equal teacherRaw)
  isUnassigned: boolean; // true when the teacher couldn't be confidently resolved
  className: string;
  ratings: Record<string, number>; // question text -> 1-5 score
  comments: Record<string, string>; // question text -> free-text answer (only non-empty)
};

export type ParsedDataset = {
  ratingQuestions: string[]; // in source column order
  commentQuestions: string[]; // in source column order
  responses: ParsedResponse[];
  warnings: string[];
};

export type DatasetSummary = {
  id: number;
  termLabel: string;
  sourceFilename: string;
  uploadedAt: string;
  responseCount: number;
  teacherCount: number;
  unassignedCount: number;
};

export type DatasetRecord = DatasetSummary & {
  ratingQuestions: string[];
  commentQuestions: string[];
};

export type ResponseRecord = {
  id: number;
  datasetId: number;
  rowIndex: number;
  teacherRaw: string;
  teacherName: string | null;
  isUnassigned: boolean;
  className: string;
  ratings: Record<string, number>;
  comments: Record<string, string>;
};

export type CategoryStat = {
  question: string;
  average: number;
  stdDev: number;
  count: number;
};

export type TeacherStats = {
  teacherName: string;
  responseCount: number;
  classCount: number;
  classes: string[];
  overallAverage: number;
  overallStdDev: number;
  categories: CategoryStat[];
};
