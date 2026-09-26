import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/collections/check-overdue")({
  server: {
    handlers: {
      POST: async () =>
        new Response("Automated WhatsApp collection reminders are no longer part of Nüva One.", {
          status: 410,
          headers: { "Cache-Control": "no-store" },
        }),
    },
  },
});
