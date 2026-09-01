import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic, AI_MODEL } from "./client";
import type { CategoryStat, ResponseRecord } from "../types";

export const TeacherAnalysisSchema = z.object({
  narrative: z
    .string()
    .describe(
      "A 2-3 sentence narrative summary of this teacher's qualitative feedback themes, written for an academic manager. Neutral, specific, no fluff.",
    ),
  themes: z
    .array(
      z.object({
        theme: z.string().describe("Short label, e.g. 'Pacing' or 'Materials variety'"),
        sentiment: z.enum(["positive", "negative", "mixed"]),
        mentions: z.number().int().min(1),
      }),
    )
    .describe("Recurring themes clustered from the free-text comments, most-mentioned first."),
  flaggedConcerns: z
    .array(z.string())
    .describe(
      "Genuinely urgent or strongly negative individual comments that need the manager's attention now - not routine mild critique. Empty array if there are none.",
    ),
  pdActions: z
    .array(z.string())
    .min(2)
    .max(3)
    .describe(
      "2-3 specific, actionable PD suggestions grounded in the actual feedback given (cite what students said, e.g. 'Consider varying pace mid-lesson - three students noted a rushed final 15 minutes'). Avoid generic advice not tied to this data.",
    ),
});

export type TeacherAnalysis = z.infer<typeof TeacherAnalysisSchema>;

const SYSTEM_PROMPT = `You are an instructional-coaching assistant for a language school's academic manager. You analyze one term's anonymized student feedback for a single teacher and produce a structured analysis the manager will read before a coaching conversation.

Rules:
- Base everything only on the data given. Don't invent details.
- Themes: cluster the free-text comments into a short list of recurring, distinct themes (don't list every comment as its own theme). Estimate "mentions" from how many comments touch that theme.
- flaggedConcerns: only genuinely urgent or strongly negative items (e.g. a comment describing a real problem, a very low individual rating pattern) - routine "could be a bit more X" feedback is a theme, not a flagged concern. It's fine for this list to be empty.
- narrative: 2-3 sentences, written for a busy manager, combining the overall pattern from both the ratings and the comments.
- pdActions: specific and evidence-grounded, referencing what was actually said (counts, quotes, or close paraphrase) rather than generic teaching advice.`;

function buildUserPrompt(
  teacherName: string,
  categories: CategoryStat[],
  responses: ResponseRecord[],
): string {
  const ratingsBlock = categories
    .map((c) => `- ${c.question}: avg ${c.average.toFixed(2)}/5 (n=${c.count}, sd ${c.stdDev.toFixed(2)})`)
    .join("\n");

  const commentLines: string[] = [];
  for (const r of responses) {
    for (const [question, text] of Object.entries(r.comments)) {
      commentLines.push(`[${r.className}] (${question}) "${text}"`);
    }
  }

  const commentsBlock =
    commentLines.length > 0 ? commentLines.join("\n") : "(No free-text comments were given.)";

  return `Teacher: ${teacherName}
Responses: ${responses.length}

Rating category averages:
${ratingsBlock}

Free-text comments:
${commentsBlock}`;
}

export async function analyzeTeacherFeedback(
  teacherName: string,
  categories: CategoryStat[],
  responses: ResponseRecord[],
): Promise<TeacherAnalysis> {
  const response = await anthropic.messages.parse({
    model: AI_MODEL,
    max_tokens: 2048,
    output_config: {
      effort: "medium", // classification/summarization-shaped task, not deep reasoning
      format: zodOutputFormat(TeacherAnalysisSchema),
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(teacherName, categories, responses) }],
  });

  if (!response.parsed_output) {
    throw new Error(`Claude did not return a parseable analysis for ${teacherName}.`);
  }
  return response.parsed_output;
}
