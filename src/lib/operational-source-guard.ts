export type OperationalSourceCheck = {
  name: string;
  error: { message: string } | null;
};

/**
 * Prevents Nüva Intelligence from presenting a partial data snapshot as a
 * complete business assessment. Missing sources must be surfaced as an error
 * and retried, not silently converted into empty datasets.
 */
export function assertOperationalSourcesAvailable(sources: OperationalSourceCheck[]): void {
  const failures = sources
    .filter((source) => source.error)
    .map((source) => `${source.name}: ${source.error?.message ?? "Error desconocido"}`);

  if (failures.length > 0) {
    throw new Error(
      `No se pudo completar el análisis de Nüva porque faltan fuentes de datos: ${failures.join(" · ")}. El análisis no se mostrará como estable con información incompleta.`,
    );
  }
}
