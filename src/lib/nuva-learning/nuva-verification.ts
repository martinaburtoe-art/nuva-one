export type NuvaVerificationStage =
  | "prerequisites"
  | "permissions"
  | "execution"
  | "result"
  | "learning";

export type NuvaVerificationResult = {
  passed: boolean;
  stage: NuvaVerificationStage;
  checks: Array<{ name: string; passed: boolean }>;
};

export function verifyNuvaAction(
  prerequisites: boolean,
  permissions: boolean,
  executionSucceeded: boolean,
  resultValid: boolean,
): NuvaVerificationResult {
  const checks = [
    { name: "Prerequisitos", passed: prerequisites },
    { name: "Permisos", passed: permissions },
    { name: "Ejecución", passed: executionSucceeded },
    { name: "Resultado verificable", passed: resultValid },
  ];

  const failed = checks.find((check) => !check.passed);
  return {
    passed: !failed,
    stage: failed ? (failed.name === "Prerequisitos" ? "prerequisites" : failed.name === "Permisos" ? "permissions" : failed.name === "Ejecución" ? "execution" : "result") : "learning",
    checks,
  };
}
