import { Inngest } from "inngest";

/**
 * Server-only Inngest client.
 * No event key is required for local development; production credentials
 * are supplied by the Inngest/Vercel environment, never by the browser.
 */
export const inngest = new Inngest({
  id: "nuva-one",
});
