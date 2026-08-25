export type ForecastPoint = { period: string; value: number };
export type ForecastResult = {
  trend: "up" | "down" | "stable";
  slope: number;
  forecast: number[];
  confidence: "low" | "medium" | "high";
  risk: "critical" | "high" | "medium" | "low";
  explanation: string;
};

export function forecastMetric(history: ForecastPoint[], periodsAhead = 3): ForecastResult {
  const points = history.filter((point) => Number.isFinite(point.value));
  if (points.length < 2 || periodsAhead < 1) {
    return {
      trend: "stable",
      slope: 0,
      forecast: [],
      confidence: "low",
      risk: "low",
      explanation: "Se requieren al menos dos observaciones válidas para proyectar tendencia.",
    };
  }

  const n = points.length;
  const xMean = (n - 1) / 2;
  const yMean = points.reduce((sum, point) => sum + point.value, 0) / n;
  const denominator = points.reduce((sum, _, index) => sum + (index - xMean) ** 2, 0);
  const slope =
    denominator === 0
      ? 0
      : points.reduce((sum, point, index) => sum + (index - xMean) * (point.value - yMean), 0) /
        denominator;
  const intercept = yMean - slope * xMean;
  const forecast = Array.from({ length: periodsAhead }, (_, offset) =>
    Math.max(0, intercept + slope * (n + offset)),
  );
  const scale = Math.max(Math.abs(yMean), 1);
  const normalizedSlope = Math.abs(slope) / scale;
  const trend = normalizedSlope < 0.02 ? "stable" : slope > 0 ? "up" : "down";
  const recent = points.slice(-Math.min(3, n));
  const residual =
    recent.reduce((sum, point, i) => {
      const globalIndex = n - recent.length + i;
      const error = point.value - (intercept + slope * globalIndex);
      return sum + error ** 2;
    }, 0) / recent.length;
  const volatility = Math.sqrt(residual) / scale;
  const confidence =
    points.length >= 6 && volatility < 0.15
      ? "high"
      : points.length >= 4 && volatility < 0.3
        ? "medium"
        : "low";
  const risk =
    trend === "down" && normalizedSlope >= 0.1
      ? "critical"
      : trend === "down" && normalizedSlope >= 0.05
        ? "high"
        : trend === "down"
          ? "medium"
          : "low";
  const explanation =
    trend === "down"
      ? "La tendencia histórica es descendente; revisar el indicador antes de que el deterioro se materialice."
      : trend === "up"
        ? "La tendencia histórica es ascendente; validar que el crecimiento sea sostenible y no genere presión operativa."
        : "El indicador se mantiene relativamente estable en el período observado.";

  return { trend, slope, forecast, confidence, risk, explanation };
}
