import { createFileRoute } from "@tanstack/react-router";
import { Buffer } from "node:buffer";
import { normalizeVoiceMovementDraft } from "@/lib/voice-movement";

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
          return json({ error: "Missing GEMINI_API_KEY or GOOGLE_API_KEY" }, 500);
        }

        const incoming = await request.formData();
        const file = incoming.get("file");
        if (!(file instanceof Blob)) {
          return json({ error: "Missing audio file" }, 400);
        }
        if (file.size < 1024) {
          return json({ error: "Grabacion vacia, intenta de nuevo." }, 400);
        }

        const audioBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
        const result = await generateMovementDraft(apiKey, file.type || "audio/wav", audioBase64);
        if (!result.ok) return json({ error: result.error }, result.status);

        const text = extractGeminiText(result.body);
        const parsed = parseJsonObject(text);
        if (!parsed) {
          return json({ error: "La IA no devolvio una estructura valida." }, 502);
        }

        return json({
          text: typeof parsed.text === "string" ? parsed.text.trim() : "",
          movement: normalizeVoiceMovementDraft(parsed.movement),
        });
      },
    },
  },
});

async function generateMovementDraft(apiKey: string, mimeType: string, audioBase64: string) {
  const models = process.env.GEMINI_MODEL
    ? [process.env.GEMINI_MODEL]
    : ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.0-flash"];
  let lastError = "Error al interpretar la grabacion";
  let lastStatus = 500;

  for (const model of models) {
    for (const request of buildGeminiRequests(model, mimeType, audioBase64)) {
      const res = await fetch(request.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(request.body),
      });

      const body = await res.json().catch(() => null);
      if (res.ok) return { ok: true as const, body };

      lastStatus = res.status;
      lastError = body?.error?.message || body?.error || lastError;
      if (typeof lastError === "string" && lastError.toLowerCase().includes("denied access")) {
        lastError =
          "El proyecto/API key de Gemini no tiene acceso habilitado. Crea una API key desde Google AI Studio, verifica que la Gemini API este habilitada para ese proyecto y reinicia la app.";
      }

      if (!shouldTryNextGeminiRequest(res.status)) break;
    }

    if (process.env.GEMINI_MODEL || !shouldTryNextModel(lastStatus)) break;
  }

  return { ok: false as const, error: lastError, status: lastStatus };
}

function buildGeminiRequests(model: string, mimeType: string, audioBase64: string) {
  const prompt =
    "Transcribe el audio en espanol e interpreta si describe un movimiento de inventario. " +
    "Devuelve solo JSON valido con esta forma exacta: " +
    '{"text":"transcripcion","movement":{"type":"entrada|salida|null","product":"nombre del producto o string vacio","quantity":numero entero o null,"purchasePrice":numero o null}}. ' +
    "Usa type entrada para llego/llegaron/entro/entrada/compre/recibi. " +
    "Usa type salida para salio/salieron/salida/vendi/retire. " +
    "purchasePrice solo debe tener valor si el precio de compra fue mencionado explicitamente.";

  return [
    {
      url: "https://generativelanguage.googleapis.com/v1beta/interactions",
      body: {
        model,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              {
                type: "input_audio",
                input_audio: {
                  data: audioBase64,
                  format: mimeType.includes("wav") ? "wav" : "mp3",
                },
              },
            ],
          },
        ],
        generation_config: { temperature: 0 },
      },
    },
    {
      url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      body: {
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: audioBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      },
    },
  ];
}

function shouldTryNextGeminiRequest(status: number) {
  return status === 400 || status === 404 || status === 405;
}

function shouldTryNextModel(status: number) {
  return status === 400 || status === 404;
}

function extractGeminiText(body: unknown): string {
  const outputText = (body as { output_text?: unknown })?.output_text;
  if (typeof outputText === "string") return outputText.trim();

  const output = (body as { output?: unknown[] })?.output;
  const fromOutput = output
    ?.flatMap((item) => {
      const content = (item as { content?: unknown[] })?.content;
      return (
        content?.map((part) => {
          const text = (part as { text?: unknown })?.text;
          return typeof text === "string" ? text : "";
        }) ?? []
      );
    })
    .join("")
    .trim();
  if (fromOutput) return fromOutput;

  const candidates = (body as { candidates?: unknown[] })?.candidates;
  const first = candidates?.[0] as { content?: { parts?: Array<{ text?: string }> } } | undefined;

  return (
    first?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || ""
  );
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[0]);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
