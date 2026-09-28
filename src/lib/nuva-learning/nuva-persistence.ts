import { supabase } from "@/integrations/supabase/client";
import type { NuvaEvidencePack } from "./nuva-evidence-pack";
import type { NuvaInstinct } from "./nuva-instincts";
import type { Json } from "@/integrations/supabase/types";

export async function persistNuvaEvidencePack(pack: NuvaEvidencePack) {
  const { error } = await supabase.from("nuva_decision_evidence").upsert({
    business_id: pack.businessId,
    decision_id: pack.decisionId,
    signal: pack.signal,
    evidence: pack.evidence as Json,
    agents_consulted: pack.agentsConsulted,
    consensus_confidence: pack.consensusConfidence,
    agreement: pack.agreement,
    dissent: pack.dissent,
    recommended_action: pack.recommendedAction ?? null,
    guardian_decision: pack.guardianDecision ?? null,
    execution_result: pack.executionResult ?? null,
    verification_passed: pack.verificationPassed ?? null,
  }, { onConflict: "business_id,decision_id" });

  if (error) throw error;
}

export async function persistNuvaInstinct(businessId: string, instinct: NuvaInstinct) {
  const { error } = await supabase.from("nuva_business_instincts").upsert({
    business_id: businessId,
    key: instinct.key,
    statement: instinct.statement,
    confidence: instinct.confidence,
    evidence_count: instinct.evidenceCount,
    scope: instinct.scope,
    last_observed_at: instinct.lastObservedAt,
  }, { onConflict: "business_id,key" });

  if (error) throw error;
}
