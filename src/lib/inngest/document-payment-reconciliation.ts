import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { cron } from "inngest";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import { handlePaymentWebhook } from "@/lib/fiscal/payment-webhook-handler.server";
import { inngest } from "./client";

export const nuvaInvoicePaymentReconciliation = inngest.createFunction(
  {
    id: "nuva-invoice-payment-reconciliation",
    triggers: [cron("*/15 * * * *")],
    retries: 2,
    concurrency: { limit: 1 },
  },
  async ({ step }) => {
    const { url, serviceRoleKey } = getServerSupabaseEnv();
    if (!url || !serviceRoleKey) throw new Error("NUVA_DOCUMENTS_SUPABASE_SERVICE_ROLE_REQUIRED");
    const db = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    }) as any;

    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    await step.run("expire-stale-invoice-checkouts", async () => {
      const { error } = await db.from("payment_intents")
        .update({ status: "expired" })
        .eq("provider", "flow")
        .eq("status", "pending")
        .not("invoice_id", "is", null)
        .lt("created_at", cutoff);
      if (error) throw error;
      return { cutoff };
    });

    const pending = await step.run("load-pending-invoice-payment-intents", async () => {
      const { data, error } = await db
        .from("payment_intents")
        .select("id,provider,token")
        .eq("provider", "flow")
        .eq("status", "pending")
        .not("invoice_id", "is", null)
        .gte("created_at", cutoff)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    });

    const outcomes: Record<string, number> = {};
    for (const intent of pending) {
      const tokenKey = crypto.createHash("sha256").update(String(intent.token)).digest("hex").slice(0, 16);
      const result = await step.run(`reconcile-invoice-payment-${tokenKey}`, async () => {
        return handlePaymentWebhook(db, intent.provider, intent.token);
      });
      outcomes[result.outcome] = (outcomes[result.outcome] ?? 0) + 1;
    }

    return { status: "complete", checked: pending.length, outcomes };
  },
);
