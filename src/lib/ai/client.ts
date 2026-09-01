import Anthropic from "@anthropic-ai/sdk";

// Lazily constructed (not at module load) so that a build-time step which
// merely imports route modules - without ANTHROPIC_API_KEY necessarily
// present at that point - doesn't fail the build. Resolves credentials from
// ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN / an `ant auth login` profile -
// never hardcode a key here.
let client: Anthropic | undefined;

export function getAnthropicClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

// Default to the most capable model; override via env if you want to trade
// quality for cost on a bulk run across many teachers (e.g. claude-sonnet-5
// or claude-haiku-4-5).
export const AI_MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";
