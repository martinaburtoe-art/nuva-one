export type ResumenOperationalStatus = {
  label: string;
  tone: "loading" | "clear" | "attention";
  description: string;
};

export function getResumenOperationalStatus(input: {
  hasBusiness?: boolean;
  invalidDateRange?: boolean;
  loading: boolean;
  kpisError: boolean;
  integrationErrorCount: number;
  lowStockCount: number;
  net: number | undefined;
}): ResumenOperationalStatus {
  if (input.hasBusiness === false) {
    return {
      label: "Negocio no seleccionado",
      tone: "attention",
      description: "Selecciona o crea un negocio para consultar indicadores reales. No hay datos suficientes para evaluar el estado operativo.",
    };
  }

  if (input.invalidDateRange) {
    return {
      label: "Fechas por corregir",
      tone: "attention",
      description: "Corrige el período seleccionado para actualizar los indicadores y evaluar el estado del negocio.",
    };
  }

  if (input.loading) {
    return {
      label: "Cargando",
      tone: "loading",
      description: "Esperando los datos del negocio.",
    };
  }

  if (input.kpisError) {
    return {
      label: "No disponible",
      tone: "attention",
      description: "No se pudo verificar el estado operativo. Revisa la conexión e inténtalo nuevamente.",
    };
  }

  if (input.integrationErrorCount > 0) {
    return {
      label: "Datos parciales",
      tone: "attention",
      description: "Algunos indicadores no están disponibles; el estado del negocio todavía no se puede confirmar por completo.",
    };
  }

  if (input.lowStockCount > 0 || (input.net ?? 0) < 0) {
    return {
      label: "Requiere revisión",
      tone: "attention",
      description: `${input.lowStockCount} alertas de stock y ${(input.net ?? 0) < 0 ? "un resultado neto negativo" : "otros indicadores"} que conviene revisar.`,
    };
  }

  return {
    label: "En orden",
    tone: "clear",
    description: "No hay alertas prioritarias en los indicadores disponibles.",
  };
}

/** True when any persisted business activity exists, not only sales or money movements. */
export function hasResumenActivity(input: {
  productsCount?: number;
  salesCount?: number;
  income?: number;
  expense?: number;
  quotesCount?: number;
  customersCount?: number;
  cashRegisterOpen?: boolean;
}): boolean {
  const hasRecords = [
    input.productsCount,
    input.salesCount,
    input.quotesCount,
    input.customersCount,
  ].some((value) => Number.isFinite(Number(value)) && Number(value) > 0);
  const hasFinancialMovement = [input.income, input.expense]
    .some((value) => Number.isFinite(Number(value)) && Number(value) !== 0);

  return hasRecords || hasFinancialMovement || Boolean(input.cashRegisterOpen);
}
