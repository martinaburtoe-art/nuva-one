export type NuvaPlan = "starter" | "pro";

export const NUVA_PLANS = {
  starter: {
    id: "starter" as const,
    name: "Nüva Start",
    tagline: "Controla tu negocio.",
    monthlyPriceClp: 11_990,
    annualPriceClp: 119_900,
    includedUsers: 1,
    extraUserPriceClp: 2_990,
    aiMessagesMonthly: 100,
    storageMb: 2_048,
    maxProducts: 500,
    features: {
      scanner: true,
      inventory: true,
      sales: true,
      customers: true,
      quotes: true,
      cash: true,
      purchases: true,
      shipments: true,
      nuvaScore: "basic",
      ai: "basic",
      explainBusiness: "basic",
      crm: "basic",
      advancedFinance: false,
      nuvaRadar: false,
      nuvaCopilot: false,
      automations: false,
      advancedReports: false,
    },
  },
  pro: {
    id: "pro" as const,
    name: "Nüva Pro",
    tagline: "Haz que tu negocio tome mejores decisiones.",
    monthlyPriceClp: 27_990,
    annualPriceClp: 279_900,
    includedUsers: 3,
    extraUserPriceClp: 3_990,
    aiMessagesMonthly: 500,
    storageMb: 10_240,
    maxProducts: 5_000,
    features: {
      scanner: true,
      inventory: true,
      sales: true,
      customers: true,
      quotes: true,
      cash: true,
      purchases: true,
      shipments: true,
      nuvaScore: "advanced",
      ai: "advanced",
      explainBusiness: "advanced",
      crm: "advanced",
      advancedFinance: true,
      nuvaRadar: true,
      nuvaCopilot: true,
      automations: true,
      advancedReports: true,
    },
  },
} as const;

export function getNuvaPlan(plan: string | null | undefined) {
  return plan === "pro" ? NUVA_PLANS.pro : NUVA_PLANS.starter;
}

export function formatClp(value: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);
}
