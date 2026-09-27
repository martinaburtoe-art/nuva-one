export type NuvaPlaybook = {
  key: string;
  name: string;
  triggerSignals: string[];
  steps: string[];
  approvalRequired: boolean;
};

export const NUVA_PLAYBOOKS: readonly NuvaPlaybook[] = [
  {
    key: "cash-under-pressure",
    name: "Caja bajo presión",
    triggerSignals: ["cash-risk", "cash-low", "collections"],
    steps: ["Validar proyección", "Priorizar cobranza", "Revisar egresos", "Verificar resultado"],
    approvalRequired: true,
  },
  {
    key: "stockout-risk",
    name: "Riesgo de quiebre",
    triggerSignals: ["stock", "stockout-risk", "purchase-pressure"],
    steps: ["Validar demanda", "Comparar caja", "Preparar reposición", "Verificar cobertura"],
    approvalRequired: true,
  },
  {
    key: "compliance-gap",
    name: "Brecha de cumplimiento",
    triggerSignals: ["compliance"],
    steps: ["Identificar brecha", "Priorizar riesgo", "Preparar corrección", "Verificar cierre"],
    approvalRequired: true,
  },
];

export function selectNuvaPlaybook(signalKey: string): NuvaPlaybook | null {
  return NUVA_PLAYBOOKS.find((playbook) => playbook.triggerSignals.includes(signalKey)) ?? null;
}
