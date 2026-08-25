import {
  buildBusinessBrain,
  type BusinessBrainInput,
  type BusinessBrainResult,
} from "./nuva-business-brain";
import { normalizeSignals, type BusinessSignal } from "./nuva-data-contract";

export type OperationalSnapshot = {
  financialHealthScore: number;
  cashAvailable: number;
  projectedCash30d: number;
  overdueReceivables: number;
  revenue: number;
  inventoryValue: number;
  lowStockSkus: number;
  stockoutRisk: number;
  grossMargin: number | null;
  taxMismatchAmount: number;
  complianceReadiness: number;
  dataSources: string[];
};

export type OperationalIntelligence = {
  brainInput: BusinessBrainInput;
  brain: BusinessBrainResult;
  signals: BusinessSignal[];
  dataQuality: "high" | "medium" | "low";
};

const finiteOr = (value: number | null | undefined, fallback: number) =>
  Number.isFinite(value) ? Number(value) : fallback;

function quality(snapshot: OperationalSnapshot): "high" | "medium" | "low" {
  const available = snapshot.dataSources.filter(Boolean).length;
  if (available >= 5) return "high";
  if (available >= 3) return "medium";
  return "low";
}

export function buildOperationalIntelligence(
  snapshot: OperationalSnapshot,
): OperationalIntelligence {
  const brainInput: BusinessBrainInput = {
    financialHealthScore: Math.max(0, Math.min(100, finiteOr(snapshot.financialHealthScore, 0))),
    projectedCash30d: finiteOr(snapshot.projectedCash30d, finiteOr(snapshot.cashAvailable, 0)),
    overdueReceivables: Math.max(0, finiteOr(snapshot.overdueReceivables, 0)),
    taxMismatchAmount: Math.max(0, finiteOr(snapshot.taxMismatchAmount, 0)),
    lowStockSkus: Math.max(0, Math.round(finiteOr(snapshot.lowStockSkus, 0))),
    complianceReadiness: Math.max(0, Math.min(100, finiteOr(snapshot.complianceReadiness, 0))),
  };

  const brain = buildBusinessBrain(brainInput);
  const signals = normalizeSignals(
    brain.signals.map((signal) => ({
      id: signal.id,
      module:
        signal.module === "cashflow" ||
        signal.module === "inventory" ||
        signal.module === "crm" ||
        signal.module === "sales" ||
        signal.module === "purchases"
          ? signal.module
          : "crm",
      title: signal.title,
      severity: signal.severity,
      confidence: signal.confidence,
      impact: signal.impact,
      action: signal.action,
    })),
  );

  return { brainInput, brain, signals, dataQuality: quality(snapshot) };
}
