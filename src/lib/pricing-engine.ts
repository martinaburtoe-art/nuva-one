export type PricingBusinessType = "manufactured" | "resale" | "service" | "digital";

export interface PricingInput {
  productType: PricingBusinessType;
  directCost: number;
  laborCost: number;
  packagingCost: number;
  logisticsCost: number;
  otherVariableCost: number;
  wasteRate: number;
  fixedCostsMonthly: number;
  expectedUnitsMonthly: number;
  targetMargin: number;
  paymentFeeRate: number;
  salesCommissionRate: number;
  marketplaceFeeRate: number;
  returnRate: number;
  warrantyRate: number;
  ownerHourlyCost: number;
  ownerHoursPerUnit: number;
  abcMonthlyAllocation: number;
  competitorPrices: number[];
  differentiationScore: number;
  valueScore: number;
  referenceValue: number;
  differentiatedValue: number;
  valueCaptureRate: number;
  elasticity: number | null;
  currentPrice: number;
  discountRate: number;
  vatRate: number;
  vatIncluded: boolean;
  psychologicalPricing: boolean;
}

export interface PricingScenario {
  label: string;
  price: number;
  units: number;
  revenue: number;
  contribution: number;
  profit: number;
  marginRate: number;
}

export interface PricingResult {
  variableUnitCost: number;
  fullUnitCost: number;
  operatingFloor: number;
  economicFloor: number;
  costPlusPrice: number;
  targetPrice: number;
  marketPrice: number | null;
  valueCeiling: number | null;
  recommendedPrice: number;
  aspirationalPrice: number | null;
  contributionMargin: number;
  contributionMarginRate: number;
  breakEvenUnits: number | null;
  breakEvenRevenue: number | null;
  projectedRevenue: number;
  projectedProfit: number;
  projectedProfitAfterDiscount: number;
  confidenceScore: number;
  scenarios: PricingScenario[];
  warnings: Array<{ severity: "critical" | "warning" | "info"; message: string }>;
  recommendations: Array<{ title: string; message: string }>;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const n = (v: number) => (Number.isFinite(v) && v >= 0 ? v : 0);

function roundRetailPrice(price: number) {
  if (price <= 0) return 0;
  if (price < 1000) return Math.round(price / 10) * 10;
  if (price < 10000) return Math.round(price / 100) * 100;
  if (price < 100000) return Math.max(1000, Math.round((price + 10) / 1000) * 1000 - 10);
  return Math.round(price / 1000) * 1000;
}

export function calculatePricing(input: PricingInput): PricingResult {
  const units = Math.max(1, Math.round(n(input.expectedUnitsMonthly)));
  const waste = clamp(n(input.wasteRate), 0, 0.99);
  const margin = clamp(n(input.targetMargin), 0, 0.95);
  const feeRate = clamp(
    n(input.paymentFeeRate) + n(input.salesCommissionRate) + n(input.marketplaceFeeRate) +
      n(input.returnRate) + n(input.warrantyRate),
    0,
    0.99,
  );

  const ownerLabor = n(input.ownerHourlyCost) * n(input.ownerHoursPerUnit);
  const baseVariable = n(input.directCost) + n(input.laborCost) + n(input.packagingCost) +
    n(input.logisticsCost) + n(input.otherVariableCost) + ownerLabor;
  const wasteAdjusted = waste >= 0.99 ? Number.POSITIVE_INFINITY : baseVariable / (1 - waste);
  const variableUnitCost = wasteAdjusted + n(input.abcMonthlyAllocation) / units;
  const fixedUnitCost = n(input.fixedCostsMonthly) / units;
  const fullUnitCost = variableUnitCost + fixedUnitCost;

  const feeDenominator = 1 - feeRate;
  const targetDenominator = 1 - feeRate - margin;
  const operatingFloor = Number.isFinite(variableUnitCost) && feeDenominator > 0 ? variableUnitCost / feeDenominator : Infinity;
  const economicFloor = Number.isFinite(fullUnitCost) && feeDenominator > 0 ? fullUnitCost / feeDenominator : Infinity;
  const costPlusPrice = Number.isFinite(fullUnitCost) && feeDenominator > 0 ? economicFloor : 0;
  const targetPrice = Number.isFinite(fullUnitCost) && targetDenominator > 0 ? fullUnitCost / targetDenominator : Infinity;

  const marketPrices = input.competitorPrices.filter((p) => Number.isFinite(p) && p > 0).sort((a, b) => a - b);
  const marketPrice = marketPrices.length ? marketPrices[Math.floor(marketPrices.length / 2)] : null;
  const valueTotal = n(input.referenceValue) + n(input.differentiatedValue);
  const valueCeiling = valueTotal > 0 ? valueTotal * clamp(n(input.valueCaptureRate), 0, 1) : null;

  const diff = clamp(n(input.differentiationScore) / 10, 0, 1);
  const value = clamp(n(input.valueScore) / 10, 0, 1);
  const targetWeight = marketPrice ? 0.6 : 0.8;
  const marketWeight = marketPrice ? 0.2 + diff * 0.1 : 0;
  const valueWeight = valueCeiling ? 0.2 + value * 0.1 : 0;
  const totalWeight = targetWeight + marketWeight + valueWeight;
  const marketSignal = marketPrice ?? targetPrice;
  const valueSignal = valueCeiling ?? targetPrice;
  let recommended = totalWeight > 0
    ? (targetPrice * targetWeight + marketSignal * marketWeight + valueSignal * valueWeight) / totalWeight
    : targetPrice;
  recommended = Math.max(economicFloor, recommended);
  if (marketPrice && diff < 0.4) recommended = Math.min(recommended, marketPrice * 1.05);
  if (input.psychologicalPricing && Number.isFinite(recommended)) recommended = roundRetailPrice(recommended);
  recommended = Math.max(economicFloor, recommended);

  const p75 = marketPrices.length ? marketPrices[Math.min(marketPrices.length - 1, Math.floor(marketPrices.length * 0.75))] : 0;
  const aspirationalRaw = Math.max(Number.isFinite(targetPrice) ? targetPrice : 0, p75, valueCeiling ?? 0);
  const aspirationalPrice = aspirationalRaw > 0 ? input.psychologicalPricing ? roundRetailPrice(aspirationalRaw) : aspirationalRaw : null;

  const contributionMargin = Number.isFinite(recommended) ? recommended * feeDenominator - variableUnitCost : 0;
  const contributionMarginRate = recommended > 0 ? contributionMargin / recommended : 0;
  const breakEvenUnits = contributionMargin > 0 ? Math.ceil(n(input.fixedCostsMonthly) / contributionMargin) : null;
  const breakEvenRevenue = breakEvenUnits === null ? null : breakEvenUnits * recommended;
  const projectedRevenue = recommended * units;
  const projectedProfit = contributionMargin * units - n(input.fixedCostsMonthly);
  const discountedPrice = recommended * (1 - clamp(n(input.discountRate), 0, 0.95));
  const projectedProfitAfterDiscount = (discountedPrice * feeDenominator - variableUnitCost) * units - n(input.fixedCostsMonthly);
  const confidenceScore = calculatePricingConfidence(input, marketPrices.length);

  const warnings: PricingResult["warnings"] = [];
  const recommendations: PricingResult["recommendations"] = [];
  if (!Number.isFinite(targetPrice)) warnings.push({ severity: "critical", message: "El margen objetivo y las comisiones son incompatibles. Reduce uno de los dos." });
  if (input.currentPrice > 0 && input.currentPrice < operatingFloor) warnings.push({ severity: "critical", message: "Tu precio actual está bajo el piso operativo y cada venta reduce tu margen de contribución." });
  else if (input.currentPrice > 0 && input.currentPrice < economicFloor) warnings.push({ severity: "warning", message: "Tu precio actual cubre costos variables, pero no todos los costos asignados." });
  if (!marketPrice) warnings.push({ severity: "info", message: "Agrega al menos 3 precios de competidores para mejorar la referencia de mercado." });
  if (n(input.wasteRate) > 0.15) warnings.push({ severity: "warning", message: "La merma supera 15%. Reducir desperdicio puede mejorar tu costo directamente." });
  if (input.elasticity !== null && Math.abs(input.elasticity) > 1) recommendations.push({ title: "Demanda sensible", message: "La demanda estimada es elástica. Prueba escenarios antes de subir el precio." });
  if (marketPrice && recommended > marketPrice * 1.1 && diff < 0.7) recommendations.push({ title: "Revisa tu posicionamiento", message: "El precio recomendado supera al mercado observado; necesitas justificarlo con valor o diferenciación." });
  if (n(input.discountRate) > 0) recommendations.push({ title: "Simula el descuento", message: `Con ${Math.round(n(input.discountRate) * 100)}% de descuento, la utilidad proyectada cambia a ${Math.round(projectedProfitAfterDiscount).toLocaleString("es-CL")} CLP.` });
  recommendations.push({ title: confidenceScore >= 80 ? "Buena base" : "Mejora la precisión", message: confidenceScore >= 80 ? "Nüva dispone de una base sólida para recomendar el precio." : "Completa costos, competencia y valor para aumentar la confianza del cálculo." });

  const scenarios = [-0.1, -0.05, 0, 0.05, 0.1].map((delta, index) => {
    const price = Math.max(0, recommended * (1 + delta));
    const contribution = price * feeDenominator - variableUnitCost;
    return {
      label: index === 2 ? "Recomendado" : `${delta > 0 ? "+" : ""}${Math.round(delta * 100)}%`,
      price,
      units,
      revenue: price * units,
      contribution,
      profit: contribution * units - n(input.fixedCostsMonthly),
      marginRate: price > 0 ? contribution / price : 0,
    };
  });

  return { variableUnitCost, fullUnitCost, operatingFloor, economicFloor, costPlusPrice, targetPrice, marketPrice,
    valueCeiling, recommendedPrice: recommended, aspirationalPrice, contributionMargin, contributionMarginRate,
    breakEvenUnits, breakEvenRevenue, projectedRevenue, projectedProfit, projectedProfitAfterDiscount,
    confidenceScore, scenarios, warnings, recommendations };
}

export function calculatePricingConfidence(input: PricingInput, competitorCount = input.competitorPrices.length) {
  let score = 20;
  if (n(input.directCost) + n(input.laborCost) > 0) score += 15;
  if (n(input.fixedCostsMonthly) > 0 && n(input.expectedUnitsMonthly) > 0) score += 10;
  if (competitorCount >= 3) score += 15; else if (competitorCount > 0) score += 7;
  if (n(input.valueScore) > 0 && n(input.differentiationScore) > 0) score += 10;
  if (input.elasticity !== null) score += 10;
  if (n(input.referenceValue) + n(input.differentiatedValue) > 0) score += 5;
  if (n(input.currentPrice) > 0) score += 5;
  if (n(input.abcMonthlyAllocation) > 0) score += 5;
  return clamp(Math.round(score), 0, 100);
}

export function priceWithVat(netPrice: number, vatRate = 0.19) { return Math.max(0, netPrice) * (1 + clamp(vatRate, 0, 1)); }
export function priceWithoutVat(grossPrice: number, vatRate = 0.19) { const d = 1 + clamp(vatRate, 0, 1); return d > 0 ? Math.max(0, grossPrice) / d : 0; }
