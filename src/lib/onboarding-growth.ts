export type OnboardingGoalId = "sales" | "inventory" | "finance" | "customers";

export interface OnboardingGoalConfig {
  id: OnboardingGoalId;
  title: string;
  description: string;
  route: string;
  actionLabel: string;
}

export const ONBOARDING_GOALS: Record<OnboardingGoalId, OnboardingGoalConfig> = {
  sales: {
    id: "sales",
    title: "Ventas",
    description: "Saber qué vendo y cuánto genero.",
    route: "/pos",
    actionLabel: "Registra tu primera venta",
  },
  inventory: {
    id: "inventory",
    title: "Inventario",
    description: "Evitar quiebres y exceso de stock.",
    route: "/inventory",
    actionLabel: "Carga tus primeros productos",
  },
  finance: {
    id: "finance",
    title: "Finanzas",
    description: "Entender ingresos, gastos y margen.",
    route: "/finance",
    actionLabel: "Registra tu primer movimiento",
  },
  customers: {
    id: "customers",
    title: "Clientes",
    description: "Conocer y hacer crecer mi cartera.",
    route: "/customers",
    actionLabel: "Crea tu primer cliente",
  },
};

export function getOnboardingGoalConfig(goalId: string | null | undefined): OnboardingGoalConfig {
  if (goalId && goalId in ONBOARDING_GOALS) {
    return ONBOARDING_GOALS[goalId as OnboardingGoalId];
  }
  return ONBOARDING_GOALS.sales;
}

export function validateOnboardingInput(input: {
  name: string;
  industry: string;
  size: string;
  goal: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const trimmedName = input.name?.trim() ?? "";
  if (!trimmedName) {
    errors.push("El nombre del negocio es obligatorio.");
  } else if (trimmedName.length < 2) {
    errors.push("El nombre del negocio debe tener al menos 2 caracteres.");
  }
  if (!input.industry) {
    errors.push("La industria es obligatoria.");
  }
  if (!input.size) {
    errors.push("El tamaño del equipo es obligatorio.");
  }
  if (!input.goal || !(input.goal in ONBOARDING_GOALS)) {
    errors.push("El foco inicial es inválido.");
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function calculateActivationProgress(completedSteps: string[]): number {
  const totalSteps = 4;
  const count = Math.min(totalSteps, Math.max(0, completedSteps.length));
  return Math.round((count / totalSteps) * 100);
}
