export type OperationalSourceCheck = {
  name: string;
  data: unknown[] | null;
  error: { message: string } | null;
};

/**
 * Prevents Nüva Intelligence from presenting a partial data snapshot as a
 * complete business assessment. Query errors and null payloads are unavailable;
 * an empty array is a valid, successfully fetched source.
 */
export function assertOperationalSourcesAvailable(sources: OperationalSourceCheck[]): void {
  const failures = sources
    .filter((source) => source.error !== null || source.data === null)
    .map((source) => {
      const detail = source.error?.message ?? "respuesta sin datos";
      return `${source.name}: ${detail}`;
    });

  if (failures.length > 0) {
    throw new Error(
      `No se pudo completar el análisis de Nüva porque faltan fuentes de datos: ${failures.join(" · ")}. El análisis no se mostrará como estable con información incompleta.`,
    );
  }
}
