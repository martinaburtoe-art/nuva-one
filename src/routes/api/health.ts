import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => new Response(JSON.stringify({
        ok: true,
        service: "nuva-one-web",
        environment: "production",
        version: process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown",
        timestamp: new Date().toISOString(),
      }), {
        status: 200,
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      }),
    },
  },
});
