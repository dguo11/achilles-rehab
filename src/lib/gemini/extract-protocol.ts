import "server-only";
import { Type } from "@google/genai";
import { z } from "zod";
import { createGeminiClient, GEMINI_MODEL } from "@/lib/gemini/client";

const extractedPhaseSchema = z.object({
  name: z.string().max(120).nullable(),
  timeframeLabel: z.string().max(120),
  timeframeStartDays: z.number().int().min(0).max(1000).nullable(),
  timeframeEndDays: z.number().int().min(0).max(1000).nullable(),
  goals: z.array(z.string().max(200)).max(20),
  weightBearing: z.string().max(300).nullable(),
  interventions: z
    .array(
      z.object({
        category: z.string().max(60),
        items: z.array(z.string().max(200)).max(30),
      }),
    )
    .max(15),
  criteriaToProgress: z.array(z.string().max(300)).max(15).nullable(),
});

const extractedProtocolSchema = z.object({
  name: z.string().max(200),
  phases: z.array(extractedPhaseSchema).max(12),
  redFlagSigns: z.array(z.string().max(200)).max(15).nullable(),
});

export type ExtractedProtocol = z.infer<typeof extractedProtocolSchema>;

const MAX_INPUT_CHARS = 20_000;

// This extraction only ever writes into the custom_protocol_uploads staging
// table (parsed_json) — never directly into protocols/protocol_phases. A
// human must review and confirm every field on the review page before
// anything becomes a usable protocol, and the result is permanently flagged
// is_verified = false wherever it's shown.
const SYSTEM_INSTRUCTION = `You are transcribing a physical therapy protocol document that a patient pasted in, into structured JSON. This is NOT your own clinical judgment — you are extracting only what is literally stated in the text.

Strict rules:
- Only include information that is explicitly present in the text. If a field isn't stated, use null (or an empty array) — never infer, guess, or fill in typical/standard values.
- Do not add phases, goals, exercises, weight-bearing rules, or criteria that aren't in the text.
- Preserve the source's own wording for weight-bearing rules and criteria to progress as closely as possible — do not paraphrase into stricter or looser language.
- List phases in the order they appear in the document.
- "interventions" categories should mirror however the document itself groups exercises (e.g. "Range of motion", "Strengthening", "Cardio") — use the document's own category names where present, otherwise a short neutral label.
- "redFlagSigns" should only be populated if the document itself lists warning signs / when-to-call-your-doctor guidance. If it doesn't, return null — do not invent a red-flag list.
Return JSON matching the provided schema.`;

/**
 * Extracts a structured protocol shape from user-pasted document text.
 * Never throws — on any failure this returns { ok: false }, and the caller
 * marks the upload's parsed_status as "failed" so the user can retry or
 * build the protocol manually from a blank template on the review page.
 */
export async function extractProtocolFromDocument(
  fileText: string,
): Promise<{ ok: true; data: ExtractedProtocol } | { ok: false; error: string }> {
  const trimmed = fileText.trim();
  if (!trimmed) return { ok: false, error: "No text provided." };
  if (!process.env.GEMINI_API_KEY) return { ok: false, error: "Extraction is unavailable right now." };

  const truncated = trimmed.slice(0, MAX_INPUT_CHARS);

  try {
    const ai = createGeminiClient();
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Protocol document text:\n\n${truncated}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            phases: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, nullable: true },
                  timeframeLabel: { type: Type.STRING },
                  timeframeStartDays: { type: Type.INTEGER, nullable: true },
                  timeframeEndDays: { type: Type.INTEGER, nullable: true },
                  goals: { type: Type.ARRAY, items: { type: Type.STRING } },
                  weightBearing: { type: Type.STRING, nullable: true },
                  interventions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        category: { type: Type.STRING },
                        items: { type: Type.ARRAY, items: { type: Type.STRING } },
                      },
                      required: ["category", "items"],
                    },
                  },
                  criteriaToProgress: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
                },
                required: ["name", "timeframeLabel", "timeframeStartDays", "timeframeEndDays", "goals", "weightBearing", "interventions", "criteriaToProgress"],
              },
            },
            redFlagSigns: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true },
          },
          required: ["name", "phases", "redFlagSigns"],
        },
      },
    });

    const raw = JSON.parse(response.text ?? "{}");
    const parsed = extractedProtocolSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "Couldn't make sense of that document's structure." };
    if (parsed.data.phases.length === 0) {
      return { ok: false, error: "Couldn't find any distinct phases in that text." };
    }
    return { ok: true, data: parsed.data };
  } catch {
    return { ok: false, error: "Extraction failed. Please try again." };
  }
}
