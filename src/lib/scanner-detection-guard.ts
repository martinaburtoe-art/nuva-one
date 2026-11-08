export type ScannerDetectionGuardInput = {
  code: string;
  lastHandledCode: string;
  inFlight: boolean;
  operationOpen: boolean;
  newProductOpen: boolean;
};

export function shouldAcceptScannerDetection(input: ScannerDetectionGuardInput): boolean {
  return Boolean(input.code.trim())
    && !input.inFlight
    && !input.operationOpen
    && !input.newProductOpen
    && input.code !== input.lastHandledCode;
}
