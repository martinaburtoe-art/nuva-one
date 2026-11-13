export function getNuvaScoreLabel(
  total: number,
  availableComponents: number,
  totalComponents = 5,
): string {
  if (availableComponents < totalComponents) return "Parcial";
  if (total >= 85) return "Excelente";
  if (total >= 70) return "Saludable";
  if (total >= 40) return "Atención";
  return "Crítico";
}
