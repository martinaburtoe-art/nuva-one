import { createFileRoute } from "@tanstack/react-router";
import { serve } from "inngest/edge";
import { inngestFunctions } from "@/lib/inngest/functions";
import { inngest } from "@/lib/inngest/client";

const handler = serve({
  client: inngest,
  functions: inngestFunctions,
});

export const Route = createFileRoute("/api/inngest")({
  server: {
    handlers: {
      GET: async ({ request }) => handler(request),
      POST: async ({ request }) => handler(request),
      PUT: async ({ request }) => handler(request),
    },
  },
});
