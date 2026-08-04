import "server-only";
import { GoogleGenAI } from "@google/genai";

export function createGeminiClient() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
}

// Kept configurable: Gemini model availability/naming shifts over time
// (older "-flash" ids get retired for new API keys), so pin via env rather
// than a second hardcoded string if this one is ever deprecated.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
