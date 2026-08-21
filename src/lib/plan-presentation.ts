import { NUVA_PLANS, formatClp, type NuvaPlan } from "./plan-config";

export type PlanPresentation = {
  id: NuvaPlan;
  name: string;
  tagline: string;
  monthlyPrice: string;
  annualPrice: string;
  annualSavings: string;
  includedUsersLabel: string;
  productsLabel: string;
  aiLabel: string;
  storageLabel: string;
  highlights: string[];
};

const gb = (mb: number) => (mb >= 1024 ? `${mb / 1024} GB` : `${mb} MB`);

export function getPlanPresentation(plan: NuvaPlan): PlanPresentation {
  const config = NUVA_PLANS[plan];
  const monthlyAnnualized = config.monthlyPriceClp * 12;
  const savings = Math.max(0, monthlyAnnualized - config.annualPriceClp);

  return {
    id: config.id,
    name: config.name,
    tagline: config.tagline,
    monthlyPrice: formatClp(config.monthlyPriceClp),
    annualPrice: formatClp(config.annualPriceClp),
    annualSavings: formatClp(savings),
    includedUsersLabel: `${config.includedUsers} ${config.includedUsers === 1 ? "usuario" : "usuarios"}`,
    productsLabel: `Hasta ${config.maxProducts.toLocaleString("es-CL")} productos`,
    aiLabel: `${config.aiMessagesMonthly.toLocaleString("es-CL")} créditos IA/mes`,
    storageLabel: gb(config.storageMb),
    highlights:
      plan === "pro"
        ? [
            "Todo Nüva Start",
            "Nüva Radar y Nüva Copilot",
            "Finanzas avanzadas y reportes",
            "Automatizaciones inteligentes",
          ]
        : [
            "Inventario y Scanner",
            "Ventas, caja y cotizaciones",
            "CRM y Nüva Score básico",
            "Nüva IA básica",
          ],
  };
}

export const NUVA_PLAN_PRESENTATIONS = {
  starter: getPlanPresentation("starter"),
  pro: getPlanPresentation("pro"),
} as const;
