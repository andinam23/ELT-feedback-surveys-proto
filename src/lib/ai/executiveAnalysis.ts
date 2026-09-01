import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getAnthropicClient, AI_MODEL } from "./client";
import type { ExecutiveStats, TeacherSummary } from "../types";

export const ExecutiveAnalysisSchema = z.object({
  narrative: z
    .string()
    .describe(
      "A 3-5 sentence executive narrative for an academic manager: overall picture this term, what's working, what needs attention.",
    ),
  keyTakeaways: z
    .array(z.string())
    .min(3)
    .max(6)
    .describe(
      "3-6 short, specific bullet points a manager should walk away remembering - concrete, not generic (cite numbers/names where useful).",
    ),
});

export type ExecutiveAnalysis = z.infer<typeof ExecutiveAnalysisSchema>;

const SYSTEM_PROMPT = `You are an instructional-coaching assistant preparing an executive summary for a language school's academic manager, covering all teachers for one term. You're given computed statistics and per-teacher AI summaries - don't recompute numbers, just interpret them.

Rules:
- Base everything only on the data given. Don't invent details.
- Be specific: name teachers, categories, or themes where it strengthens a point. Avoid generic management-speak.
- If a term comparison is provided, mention the direction of change where notable.
- Keep it readable in under a minute.`;

function aggregateThemes(summaries: TeacherSummary[]): string {
  const byTheme = new Map<string, { mentions: number; sentiments: Set<string> }>();
  for (const s of summaries) {
    for (const t of s.themes) {
      const key = t.theme.toLowerCase();
      const entry = byTheme.get(key) ?? { mentions: 0, sentiments: new Set() };
      entry.mentions += t.mentions;
      entry.sentiments.add(t.sentiment);
      byTheme.set(key, entry);
    }
  }
  const sorted = Array.from(byTheme.entries()).sort((a, b) => b[1].mentions - a[1].mentions);
  return sorted
    .slice(0, 15)
    .map(([theme, v]) => `- ${theme} (${[...v.sentiments].join("/")}, ~${v.mentions} mentions across teachers)`)
    .join("\n");
}

function buildUserPrompt(stats: ExecutiveStats, summaries: TeacherSummary[]): string {
  const parts: string[] = [];

  parts.push(
    `Overall: ${stats.totalResponses} responses, ${stats.totalTeachers} teachers, overall average ${stats.overallAverage.toFixed(2)}/5.`,
  );

  parts.push(
    "\nTop-performing categories:\n" +
      stats.topCategories.map((c) => `- ${c.question}: ${c.average.toFixed(2)}`).join("\n"),
  );
  parts.push(
    "\nLowest-scoring categories:\n" +
      stats.bottomCategories.map((c) => `- ${c.question}: ${c.average.toFixed(2)}`).join("\n"),
  );

  if (stats.flaggedTeachers.length > 0) {
    parts.push(
      "\nTeachers flagged for attention:\n" +
        stats.flaggedTeachers
          .map((f) => `- ${f.teacherName} (avg ${f.overallAverage.toFixed(2)}): ${f.reasons.join("; ")}`)
          .join("\n"),
    );
  } else {
    parts.push("\nNo teachers were flagged for urgent attention this term.");
  }

  parts.push(
    "\nTop teachers by average:\n" +
      stats.topTeachers.map((t) => `- ${t.teacherName}: ${t.overallAverage.toFixed(2)}`).join("\n"),
  );

  if (stats.termComparison) {
    const tc = stats.termComparison;
    parts.push(
      `\nCompared to previous term (${tc.previousTermLabel}): overall ${tc.overallPrevious.toFixed(2)} -> ${tc.overallCurrent.toFixed(2)} (${tc.overallDelta >= 0 ? "+" : ""}${tc.overallDelta.toFixed(2)}).\n` +
        tc.categories
          .filter((c) => c.delta !== null)
          .map((c) => `- ${c.question}: ${c.previous!.toFixed(2)} -> ${c.current!.toFixed(2)} (${c.delta! >= 0 ? "+" : ""}${c.delta!.toFixed(2)})`)
          .join("\n"),
    );
  } else {
    parts.push("\nNo previous term is available yet for comparison.");
  }

  if (summaries.length > 0) {
    parts.push("\nRecurring themes across teachers (from per-teacher AI summaries):\n" + aggregateThemes(summaries));
  }

  return parts.join("\n");
}

export async function analyzeExecutiveReport(
  stats: ExecutiveStats,
  summaries: TeacherSummary[],
): Promise<ExecutiveAnalysis> {
  const response = await getAnthropicClient().messages.parse({
    model: AI_MODEL,
    max_tokens: 2048,
    output_config: {
      effort: "medium",
      format: zodOutputFormat(ExecutiveAnalysisSchema),
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(stats, summaries) }],
  });

  if (!response.parsed_output) {
    throw new Error("Claude did not return a parseable executive analysis.");
  }
  return response.parsed_output;
}
