// Deliberately a plain deterministic keyword check, not an LLM call: this
// runs on free-text mental-health notes (intake Section 6.3, and later
// daily notes), and the guardrail is "surface a supportive prompt, never
// advise" — a fixed, auditable word list is the safer tool for that job
// than a model that could improvise clinical-sounding advice.
//
// This is a supportive nudge, not a clinical screen. False positives (a
// flagged note that isn't actually urgent) are the acceptable failure mode;
// false negatives are not, so the list stays intentionally broad.
const DISTRESS_PATTERNS: RegExp[] = [
  /\bsuicid/i,
  /\bself[\s-]?harm/i,
  /\bkill(ing)?\s+myself\b/i,
  /\bwant(ed)?\s+to\s+die\b/i,
  /\bend(ing)?\s+(it|my\s+life)\b/i,
  /\bno\s+(point|reason)\s+(in\s+)?(living|continuing|going\s+on)\b/i,
  /\bcan'?t\s+(go\s+on|do\s+this\s+anymore|take\s+(it|this)\s+anymore)\b/i,
  /\bgive\s+up\s+(on\s+life|completely)\b/i,
  /\bhopeless\b/i,
  /\bworthless\b/i,
  /\bbetter\s+off\s+(dead|without\s+me)\b/i,
];

export function checkForDistressSignals(text: string | null | undefined): boolean {
  if (!text || !text.trim()) return false;
  return DISTRESS_PATTERNS.some((pattern) => pattern.test(text));
}

export const SUPPORTIVE_DISTRESS_MESSAGE = {
  title: "We hear you",
  body: "What you wrote suggests you might be going through a hard time. That matters as much as the physical recovery. Please consider reaching out to your care team, or a crisis resource if you need to talk to someone now.",
  crisisLine: "In the US: call or text 988 (Suicide & Crisis Lifeline), available 24/7.",
};
