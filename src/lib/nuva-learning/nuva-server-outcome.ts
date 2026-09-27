import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { updateNuvaInstinct, type NuvaInstinct } from "./nuva-instincts";

type Action = Database["public"]["Tables"]["nuva_action_queue"]["Row"];

export async function learnFromNuvaActionOutcome(
  supabase: SupabaseClient<Database>,
  action: Action,
  result: Record<string, unknown>,
  succeeded: boolean,
) {
  const observedAt = new Date().toISOString();
  const signal = `action:${action.action_type}`;
  const verificationPassed = succeeded;

  await supabase.from("nuva_decision_evidence").upsert({
    business_id: action.business_id,
    decision_id: action.id,
    signal,
    evidence: result,
    agents_consulted: ["action-executor"],
    consensus_confidence: succeeded ? 1 : 0,
    agreement: succeeded ? 1 : 0,
    dissent: [],
    recommended_action: action.title,
    guardian_decision: "ALLOW",
    execution_result: succeeded ? "success" : "failed",
    verification_passed: verificationPassed,
  }, { onConflict: "business_id,decision_id" });

  const { data: current } = await supabase
    .from("nuva_business_instincts")
    .select("key, statement, confidence, evidence_count, scope, last_observed_at")
    .eq("business_id", action.business_id)
    .eq("key", signal)
    .maybeSingle();

  const instinct: NuvaInstinct = updateNuvaInstinct(
    current
      ? {
          key: current.key,
          statement: current.statement,
          confidence: current.confidence,
          evidenceCount: current.evidence_count,
          scope: current.scope as "business" | "global",
          lastObservedAt: current.last_observed_at,
        }
      : null,
    verificationPassed,
    observedAt,
  );

  await supabase.from("nuva_business_instincts").upsert({
    business_id: action.business_id,
    key: signal,
    statement: instinct.statement,
    confidence: instinct.confidence,
    evidence_count: instinct.evidenceCount,
    scope: instinct.scope,
    last_observed_at: instinct.lastObservedAt,
  }, { onConflict: "business_id,key" });
}
