import { cron } from "inngest";
import { inngest } from "./client";
import { INNGEST_AGENCY_AGENT_IDS, runInngestAgencyWorker } from "./agency-worker";

/**
 * Safe connectivity check. It has no side effects outside Inngest.
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

/**
 * Read-only Agency specialists are scheduled independently.
 * Database leases remain authoritative, so GitHub Actions and Inngest
 * can coexist during the staged rollout without claiming the same task.
 */
export const nuvaAgencyWorkers = INNGEST_AGENCY_AGENT_IDS.map((agentId) =>
  inngest.createFunction(
    {
      id: `nuva-agency-${agentId}-worker`,
      triggers: [cron("*/5 * * * *")],
      retries: 2,
      concurrency: [
        { limit: 5, scope: "env", key: '"nuva-agency"' },
        { limit: 1, scope: "fn" },
      ],
    },
    async ({ step }) => runInngestAgencyWorker(agentId, step),
  ),
);

export const inngestFunctions = [nuvaSystemPing, ...nuvaAgencyWorkers];
