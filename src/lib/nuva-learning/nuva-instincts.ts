export type NuvaInstinct = {
  key: string;
  statement: string;
  confidence: number;
  evidenceCount: number;
  scope: "business" | "global";
  lastObservedAt: string;
};

export function updateNuvaInstinct(
  current: NuvaInstinct | null,
  observationSupports: boolean,
  observedAt = new Date().toISOString(),
): NuvaInstinct {
  if (!current) {
    return {
      key: "new-observation",
      statement: "Patrón observado por primera vez; requiere más evidencia.",
      confidence: observationSupports ? 0.3 : 0.1,
      evidenceCount: 1,
      scope: "business",
      lastObservedAt: observedAt,
    };
  }

  const step = observationSupports ? 0.08 : -0.08;
  return {
    ...current,
    confidence: Math.max(0, Math.min(0.99, Number((current.confidence + step).toFixed(2)))),
    evidenceCount: current.evidenceCount + 1,
    lastObservedAt: observedAt,
  };
}

export function instinctIsActionable(instinct: NuvaInstinct): boolean {
  return instinct.confidence >= 0.7 && instinct.evidenceCount >= 5;
}
