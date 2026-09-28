import type { NuvaAgentId } from "../nuva-intelligence-agent-council";

export type NuvaAgentHealth = {
  agentId: NuvaAgentId;
  decisions: number;
  successfulActions: number;
  failedActions: number;
  fallbackCount: number;
  successRate: number;
  health: "healthy" | "watch" | "degraded";
};

export function calculateNuvaAgentHealth(input: Omit<NuvaAgentHealth, "successRate" | "health">): NuvaAgentHealth {
  const attempts = input.successfulActions + input.failedActions;
  const successRate = attempts === 0 ? 0 : input.successfulActions / attempts;
  const fallbackRate = input.decisions === 0 ? 0 : input.fallbackCount / input.decisions;
  const health = attempts === 0 ? "watch" : successRate >= 0.9 && fallbackRate <= 0.1 ? "healthy" : successRate >= 0.7 ? "watch" : "degraded";
  return { ...input, successRate, health };
}
