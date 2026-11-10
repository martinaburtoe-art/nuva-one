export type ResumenOperationalStatus = {
  label: string;
  tone: "loading" | "clear" | "attention";
  description: string;
};

export function getResumenOperationalStatus(input: {
  loading: boolean;
  kpisError: boolean;
  integrationErrorCount: number;
  lowStockCount: number;
  net: number | undefined;
}): ResumenOperationalStatus {
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
