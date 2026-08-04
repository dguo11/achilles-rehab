import "server-only";

/**
 * Thin wrapper around Gemini's generateContent REST endpoint, constrained to
 * structured JSON output via responseSchema. This is the only place in the
 * app that talks to the Gemini API — every LLM entry point (dosage
 * suggestions, future document extraction) goes through this function so the
 * network/parsing/error-handling behavior stays in one spot.
 *
 * Returns null (never throws) on any failure — missing key, network error,
 * non-JSON response — so callers can treat "no suggestion available" as a
 * normal, expected outcome rather than a fatal error.
 */
export async function generateJson<T>({
  prompt,
  responseSchema,
}: {
  prompt: string;
  responseSchema: object;
}): Promise<T | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[gemini] GEMINI_API_KEY is not set; skipping LLM call.");
    return null;
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.2,
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      console.error(`[gemini] request failed: ${res.status} ${await res.text()}`);
      return null;
    }

    const body = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") {
      console.error("[gemini] response had no text part", JSON.stringify(body).slice(0, 500));
      return null;
    }

    return JSON.parse(text) as T;
  } catch (err) {
    console.error("[gemini] call threw", err);
    return null;
  }
}
