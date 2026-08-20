import type { ScannerAction } from "@/components/scanner/LiveProductScanner";

export type ScannerInventoryOperation = Extract<ScannerAction, "entry" | "exit" | "count">;

export type ScannerInventoryActionState = {
  operation: ScannerInventoryOperation;
  quantity: number;
  reason: string;
  currentStock: number;
};

export function validateScannerInventoryAction(input: ScannerInventoryActionState) {
  const reason = input.reason.trim();
  if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) {
    throw new Error("La cantidad debe ser un entero mayor que cero.");
  }
  if (!Number.isSafeInteger(input.currentStock) || input.currentStock < 0) {
    throw new Error("El stock actual no es válido.");
  }
  if (!reason) throw new Error("Debes indicar el motivo del movimiento.");
  if (input.operation === "exit" && input.quantity > input.currentStock) {
    throw new Error("Stock insuficiente para realizar la salida.");
  }
  if (input.operation === "count" && input.quantity === input.currentStock) {
    throw new Error("El conteo coincide con el stock actual; no hay ajuste que registrar.");
  }
  return { ...input, reason };
}
