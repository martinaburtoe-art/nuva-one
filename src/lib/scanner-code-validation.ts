export type ScannerCodeKind = "EAN-13" | "EAN-8" | "UPC-A" | "SKU" | "UNKNOWN";

export type NormalizedScannerCode = {
  value: string;
  kind: ScannerCodeKind;
  validChecksum: boolean;
};

export function normalizeScannerCode(raw: string): string {
  return raw.trim().replace(/\s+/g, "").toUpperCase();
}

function hasValidChecksum(value: string): boolean {
  if (!/^\d+$/.test(value) || value.length < 2) return false;
  const digits = value.split("").map(Number);
  const check = digits.pop()!;
  let sum = 0;
  const weight = digits.length % 2 === 0 ? 3 : 1;
  digits.forEach((digit, index) => {
    sum += digit * (index % 2 === 0 ? weight : 4 - weight);
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

export function isValidProductCode(raw: string): boolean {
  const code = classifyScannerCode(raw);
  return code.kind === "SKU" || ((code.kind === "EAN-13" || code.kind === "EAN-8" || code.kind === "UPC-A") && code.validChecksum);
}
