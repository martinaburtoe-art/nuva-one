export type NuvaAgentFailure = {
  agentId: string;
  stage: "observe" | "reason" | "action" | "verify";
  code: string;
  message: string;
  recoverable: boolean;
};

export type NuvaAgentDiagnosis = {
  classification: "data_missing" | "permission" | "execution" | "verification" | "unknown";
  contained: boolean;
  retryAllowed: boolean;
  learningSignal: string;
};

export function diagnoseNuvaAgentFailure(failure: NuvaAgentFailure): NuvaAgentDiagnosis {
  const classification =
    failure.stage === "observe" ? "data_missing" :
    failure.stage === "reason" ? "verification" :
    failure.stage === "action" && failure.code.includes("PERMISSION") ? "permission" :
    failure.stage === "action" ? "execution" :
    failure.stage === "verify" ? "verification" : "unknown";

  return {
    classification,
    contained: true,
    retryAllowed: failure.recoverable && classification !== "permission",
    learningSignal: `${failure.agentId}:${failure.code}`,
  };
}
