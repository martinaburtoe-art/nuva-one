export type PiiScanStatus = "PASS" | "WARN" | "FAIL" | "UNKNOWN";
export interface PiiScanResult {
  scannedFiles: number;
  filesWithFindings: number;
  emailMatches: number;
  rutMatches: number;
  missingDirectories: number;
  unreadableDirectories: number;
  unreadableFiles: number;
  skippedLargeFiles: number;
  truncated: boolean;
  status: PiiScanStatus;
}
export function isValidChileanRut(value: string): boolean;
export function scanPiiText(content: string): { emailMatches: number; rutMatches: number; totalMatches: number };
export function scanPiiDirectories(directories: string[], options?: { maxFiles?: number; maxDepth?: number; maxFileBytes?: number }): Promise<PiiScanResult>;
