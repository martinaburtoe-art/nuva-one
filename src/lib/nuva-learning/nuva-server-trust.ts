import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { NuvaMeasuredMetrics } from "./nuva-decision-gate";

type ServerSupabase = SupabaseClient<Database>;

const clamp = (value: number) => Math.min(1, Math.max(0, value));

export async function getNuvaMeasuredMetrics(
  supabase: ServerSupabase,
  businessId: string,
  signalKey: string,
): Promise<NuvaMeasuredMetrics> {
  const { data: evidenceRows } = await supabase
    .from("nuva_decision_evidence")
    .select("agreement,verification_passed,created_at")
    .eq("business_id", businessId)
    .eq("signal", signalKey)
    .order("created_at", { ascending: false })
    .limit(20);

  const rows = evidenceRows ?? [];
  const latest = rows[0]?.created_at ? new Date(rows[0].created_at).getTime() : 0;
  const ageHours = latest ? Math.max(0, (Date.now() - latest) / 36e5) : 24 * 30;
  const dataFreshness = ageHours <= 24 ? 1 : ageHours <= 24 * 7 ? 0.85 : ageHours <= 24 * 30 ? 0.65 : 0.4;

  const agreements = rows
    .map((row) => Number(row.agreement))
    .filter(Number.isFinite)
    .map((value) => value > 1 ? value / 100 : value);
  const agentAgreement = agreements.length
    ? clamp(agreements.reduce((sum, value) => sum + value, 0) / agreements.length)
    : 0.5;

  const verified = rows.filter((row) => row.verification_passed !== null);
  const historicalAccuracy = verified.length
    ? verified.filter((row) => row.verification_passed).length / verified.length
    : 0.5;

  const { data: outcomes } = await supabase
    .from("nuva_action_outcomes")
    .select("outcome_type")
    .eq("business_id", businessId)
    .order("observed_at", { ascending: false })
    .limit(20);

  const outcomeRows = outcomes ?? [];
  const previousOutcomeQuality = outcomeRows.length
    ? outcomeRows.filter((row) => row.outcome_type === "success").length / outcomeRows.length
    : 0.5;

  return { dataFreshness, agentAgreement, historicalAccuracy, previousOutcomeQuality };
}
