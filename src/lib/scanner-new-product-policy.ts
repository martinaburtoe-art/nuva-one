import { classifyScannerCode, normalizeScannerCode } from "./scanner-code-validation";

export type UnknownCodeDecision =
  | { kind: "invalid"; code: string; message: string }
  | { kind: "create"; code: string; codeKind: "EAN-13" | "EAN-8" | "UPC-A" | "SKU" };

/** Pure policy used before opening the new-product flow.
 * Database uniqueness remains authoritative; this only prevents obviously invalid onboarding.
 */
export function decideUnknownCode(rawCode: string): UnknownCodeDecision {
  const code = normalizeScannerCode(rawCode);
  if (!code) return { kind: "invalid", code, message: "El código está vacío." };

  const classified = classifyScannerCode(code);
  if (classified.kind === "UNKNOWN") {
    return { kind: "invalid", code, message: "El código no tiene un formato compatible." };
  }
  if (!classified.validChecksum) {
    return { kind: "invalid", code, message: "El código de barras no supera la validación." };
  }

  return { kind: "create", code, codeKind: classified.kind };
}
