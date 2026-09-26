import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/whatsapp/webhook")({
  server: {
    handlers: {
      GET: async () =>
        new Response("WhatsApp integration is no longer part of Nüva One.", {
          status: 410,
          headers: { "Cache-Control": "no-store" },
        }),
      POST: async () =>
        new Response("WhatsApp integration is no longer part of Nüva One.", {
          status: 410,
          headers: { "Cache-Control": "no-store" },
        }),
    },
  },
});
