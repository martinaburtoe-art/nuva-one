import { inngest } from "./client";

/**
 * Deliberately side-effect-free foundation function.
 * This validates event delivery and durable execution without touching
 * Supabase, agency leases, billing, inventory, or external integrations.
 */
export const nuvaSystemPing = inngest.createFunction(
  {
    id: "nuva-system-ping",
    triggers: [{ event: "nuva/system.ping" }],
    retries: 2,
  },
  async ({ event }) => ({
    ok: true,
    eventName: event.name,
    receivedAt: new Date().toISOString(),
  }),
);

export const inngestFunctions = [nuvaSystemPing];
