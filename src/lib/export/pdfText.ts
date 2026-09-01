/**
 * react-pdf's built-in Helvetica uses WinAnsi encoding, which doesn't cover
 * the full Unicode range - arrows, Greek letters, checkmarks etc. render as
 * garbled glyphs instead of being embedded. Rather than bundle a Unicode TTF
 * for this prototype, replace the handful of characters that free-text
 * (student comments, AI-generated narrative/themes) could plausibly contain
 * with plain-ASCII equivalents before they reach a <Text> node.
 */
const REPLACEMENTS: [RegExp, string][] = [
  [/→/g, "->"], // →
  [/←/g, "<-"], // ←
  [/↔/g, "<->"], // ↔
  [/[Α-ω]/g, ""], // Greek letters (Δ, α, etc.) - drop rather than guess
  [/[✅✓]/g, "[check]"], // ✅ ✓
  [/[❌✗]/g, "[x]"], // ❌ ✗
  [/⚠/g, "[!]"], // ⚠
  [/️/g, ""], // variation selector often trailing emoji
];

export function pdfSafe(text: string): string {
  let out = text;
  for (const [pattern, replacement] of REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}
