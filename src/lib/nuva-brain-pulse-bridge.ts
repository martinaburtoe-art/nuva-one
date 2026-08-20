import type { BrainSignal } from "./nuva-business-brain";
import { buildOperatingPulse, type OperatingPulse, type PulseSignal } from "./nuva-operating-pulse";

export function buildPulseFromBrainSignals(signals: BrainSignal[], maxSignals = 5): OperatingPulse {
  const pulseSignals: PulseSignal[] = signals.map((signal) => ({
    id: signal.id,
    module: signal.module,
    title: signal.title,
    severity: signal.severity,
    impact: signal.impact,
    action: signal.action,
  }));
  return buildOperatingPulse(pulseSignals, maxSignals);
}
