export type ScannerCodeKind = "EAN-13" | "EAN-8" | "UPC-A" | "SKU" | "UNKNOWN";

export type NormalizedScannerCode = {
  value: string;
  kind: ScannerCodeKind;
  validChecksum: boolean;
};

export type ScannerCodeValidation =
  | { kind: "valid"; value: string; codeKind: Exclude<ScannerCodeKind, "UNKNOWN"> }
  | { kind: "invalid"; value: string; message: string };

export function normalizeScannerCode(raw: string): string {
  return raw.trim().replace(/\s+/g, "").toUpperCase();
}

function hasValidChecksum(value: string): boolean {
  if (!/^\d+$/.test(value) || value.length < 2) return false;
  const digits = value.split("").map(Number);
  const check = digits.pop()!;
  let sum = 0;
  const leftmostWeight = digits.length % 2 === 1 ? 3 : 1;
  digits.forEach((digit, index) => {
    sum += digit * (index % 2 === 0 ? leftmostWeight : 4 - leftmostWeight);
  });
  return (10 - (sum % 10)) % 10 === check;
}

export function classifyScannerCode(raw: string): NormalizedScannerCode {
  const value = normalizeScannerCode(raw);
  if (/^\d{13}$/.test(value)) return { value, kind: "EAN-13", validChecksum: hasValidChecksum(value) };
  if (/^\d{8}$/.test(value)) return { value, kind: "EAN-8", validChecksum: hasValidChecksum(value) };
  if (/^\d{12}$/.test(value)) return { value, kind: "UPC-A", validChecksum: hasValidChecksum(value) };
  if (/^[A-Z0-9][A-Z0-9._/-]{1,63}$/.test(value)) return { value, kind: "SKU", validChecksum: true };
  return { value, kind: "UNKNOWN", validChecksum: false };
}

export function validateScannedCode(raw: string): ScannerCodeValidation {
  const code = classifyScannerCode(raw);
  if (code.kind === "UNKNOWN") return { kind: "invalid", value: code.value, message: "El código escaneado no tiene un formato compatible." };
  if (!code.validChecksum) return { kind: "invalid", value: code.value, message: `El ${code.kind} tiene un dígito verificador inválido.` };
  return { kind: "valid", value: code.value, codeKind: code.kind };
}

export function isValidProductCode(raw: string): boolean {
  return validateScannedCode(raw).kind === "valid";
}
