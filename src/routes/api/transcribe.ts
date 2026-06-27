import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response(JSON.stringify({ error: "Missing LOVABLE_API_KEY" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        const incoming = await request.formData();
        const file = incoming.get("file");
        if (!(file instanceof Blob)) {
          return new Response(JSON.stringify({ error: "Missing audio file" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (file.size < 1024) {
          return new Response(
            JSON.stringify({ error: "Grabación vacía, intenta de nuevo." }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const upstream = new FormData();
        upstream.append("model", "openai/gpt-4o-mini-transcribe");
        upstream.append("file", file, "recording.wav");
        upstream.append("language", "es");

        const res = await fetch(
          "https://ai.gateway.lovable.dev/v1/audio/transcriptions",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: upstream,
          },
        );
        const body = await res.text();
        return new Response(body, {
          status: res.status,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
