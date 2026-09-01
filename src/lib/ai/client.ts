import Anthropic from "@anthropic-ai/sdk";

// Resolves credentials from ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN / an
// `ant auth login` profile - never hardcode a key here.
export const anthropic = new Anthropic();

// Default to the most capable model; override via env if you want to trade
// quality for cost on a bulk run across many teachers (e.g. claude-sonnet-5
// or claude-haiku-4-5).
export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";
