import { getIndustryProfile, type IndustryCapability, type IndustryProfileId } from "@/lib/industry-profiles";
import { getCapabilityReadiness } from "@/lib/industry-capability-readiness";

export type BusinessChannel = "counter" | "delivery" | "online" | "wholesale" | "appointment";
export type IndustryConfigurationInput = {
  channels?: readonly BusinessChannel[];
  inventory?: {
    baseUnit?: string | null;
    purchaseUnits?: readonly string[];
    saleUnits?: readonly string[];
    trackLots?: boolean;
    trackExpiry?: boolean;
    allowFractionalQuantity?: boolean;
    multipleWarehouses?: boolean;
  };
  commercial?: { priceLists?: boolean; volumePricing?: boolean; customerCredit?: boolean };
  operations?: { quoteByProject?: boolean; scheduledDispatch?: boolean; returnsAndWarranty?: boolean };
};
export type IndustryConfiguration = {
  schemaVersion: 1;
  profileId: IndustryProfileId;
  channels: BusinessChannel[];
  inventory: { baseUnit: string | null; purchaseUnits: string[]; saleUnits: string[]; trackLots: boolean; trackExpiry: boolean; allowFractionalQuantity: boolean; multipleWarehouses: boolean };
  commercial: { priceLists: boolean; volumePricing: boolean; customerCredit: boolean };
  operations: { quoteByProject: boolean; scheduledDispatch: boolean; returnsAndWarranty: boolean };
};
export type IndustryConfigurationError = { code: "unknown_profile" | "profile_not_in_p0" | "unknown_field" | "invalid_type" | "invalid_value" | "incompatible_units" | "expiry_requires_lots"; path: string; message: string };
export type IndustryConfigurationResult =
  | { ok: true; configuration: IndustryConfiguration; requestedCapabilities: IndustryCapability[]; availableCapabilities: IndustryCapability[]; plannedCapabilities: IndustryCapability[] }
  | { ok: false; errors: IndustryConfigurationError[] };

const CHANNELS: readonly BusinessChannel[] = ["counter", "delivery", "online", "wholesale", "appointment"];
const DIMENSIONS: Record<string, string> = {
  un: "count", par: "count",
  pack: "package", display: "package", caja: "package", pallet: "package", saco: "package", rollo: "package", barra: "package", bandeja: "package",
  kg: "mass", g: "mass", ton: "mass", mm: "length", cm: "length", m: "length", km: "length",
  "m²": "area", "m³": "volume", lt: "volume", ml: "volume",
};
const PROFILE_UNITS: Partial<Record<IndustryProfileId, readonly string[]>> = {
  hardware_store: ["un", "m", "m²", "m³", "kg", "saco", "caja", "rollo", "barra", "pallet", "mm", "cm"],
  neighborhood_grocery: ["un", "pack", "display", "caja", "kg", "g", "lt", "ml"],
  wholesale_distribution: ["un", "pack", "caja", "pallet", "kg", "g", "lt", "ml", "ton"],
};
const defaults = (profileId: IndustryProfileId): IndustryConfiguration => ({
  schemaVersion: 1, profileId, channels: [],
  inventory: { baseUnit: null, purchaseUnits: [], saleUnits: [], trackLots: false, trackExpiry: false, allowFractionalQuantity: false, multipleWarehouses: false },
  commercial: { priceLists: false, volumePricing: false, customerCredit: false },
  operations: { quoteByProject: false, scheduledDispatch: false, returnsAndWarranty: false },
});
const record = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
function unknownKeys(v: Record<string, unknown>, allowed: readonly string[], path: string, errors: IndustryConfigurationError[]) {
  Object.keys(v).filter((key) => !allowed.includes(key)).forEach((key) => errors.push({ code: "unknown_field", path: path ? path + "." + key : key, message: "Campo no permitido." }));
}
function bool(v: Record<string, unknown>, key: string, path: string, errors: IndustryConfigurationError[]): boolean {
  const value = v[key];
  if (value === undefined) return false;
  if (typeof value !== "boolean") { errors.push({ code: "invalid_type", path: path + "." + key, message: "Se esperaba un booleano." }); return false; }
  return value;
}
function units(v: Record<string, unknown>, key: "purchaseUnits" | "saleUnits", allowed: readonly string[], errors: IndustryConfigurationError[]): string[] {
  const value = v[key];
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((x) => typeof x !== "string")) { errors.push({ code: "invalid_type", path: "inventory." + key, message: "Se esperaba una lista de unidades." }); return []; }
  const result = [...new Set(value as string[])];
  result.filter((unit) => !allowed.includes(unit)).forEach((unit) => errors.push({ code: "invalid_value", path: "inventory." + key, message: "Unidad no admitida: " + unit }));
  return result.filter((unit) => allowed.includes(unit));
}

/** Validates preferences only. It never persists, grants access or activates a feature. */
export function buildIndustryConfiguration(profileId: IndustryProfileId | string, input: IndustryConfigurationInput = {}): IndustryConfigurationResult {
  const profile = getIndustryProfile(profileId);
  if (!profile) return { ok: false, errors: [{ code: "unknown_profile", path: "profileId", message: "Perfil sectorial desconocido." }] };
  if (!PROFILE_UNITS[profile.id]) return { ok: false, errors: [{ code: "profile_not_in_p0", path: "profileId", message: "La configuración operativa detallada todavía está limitada a los tres perfiles P0." }] };
  const errors: IndustryConfigurationError[] = [];
  const root = input as unknown as Record<string, unknown>;
  unknownKeys(root, ["channels", "inventory", "commercial", "operations"], "", errors);
  let channels: BusinessChannel[] = [];
  if (root.channels !== undefined) {
    if (!Array.isArray(root.channels) || root.channels.some((x) => typeof x !== "string")) errors.push({ code: "invalid_type", path: "channels", message: "Se esperaba una lista de canales." });
    else {
      channels = [...new Set(root.channels as string[])].filter((x): x is BusinessChannel => {
        if (CHANNELS.includes(x as BusinessChannel)) return true;
        errors.push({ code: "invalid_value", path: "channels", message: "Canal no admitido: " + x }); return false;
      });
    }
  }
  const rawInventory = root.inventory === undefined ? {} : root.inventory;
  const rawCommercial = root.commercial === undefined ? {} : root.commercial;
  const rawOperations = root.operations === undefined ? {} : root.operations;
  for (const [v, path] of [[rawInventory, "inventory"], [rawCommercial, "commercial"], [rawOperations, "operations"]] as const) {
    if (!record(v)) errors.push({ code: "invalid_type", path, message: "Se esperaba un objeto." });
  }
  const inv = record(rawInventory) ? rawInventory : {};
  const com = record(rawCommercial) ? rawCommercial : {};
  const ops = record(rawOperations) ? rawOperations : {};
  unknownKeys(inv, ["baseUnit", "purchaseUnits", "saleUnits", "trackLots", "trackExpiry", "allowFractionalQuantity", "multipleWarehouses"], "inventory", errors);
  unknownKeys(com, ["priceLists", "volumePricing", "customerCredit"], "commercial", errors);
  unknownKeys(ops, ["quoteByProject", "scheduledDispatch", "returnsAndWarranty"], "operations", errors);
  const allowed = PROFILE_UNITS[profile.id] ?? profile.suggestedUnits;
  let baseUnit: string | null = null;
  if (inv.baseUnit !== undefined && inv.baseUnit !== null) {
    if (typeof inv.baseUnit !== "string" || !allowed.includes(inv.baseUnit)) errors.push({ code: "invalid_value", path: "inventory.baseUnit", message: "Unidad base no admitida." });
    else baseUnit = inv.baseUnit;
  }
  const purchaseUnits = units(inv, "purchaseUnits", allowed, errors);
  const saleUnits = units(inv, "saleUnits", allowed, errors);
  if (baseUnit && [...purchaseUnits, ...saleUnits].some((unit) => {
    const unitDimension = DIMENSIONS[unit];
    const baseDimension = DIMENSIONS[baseUnit!];
    return unitDimension !== baseDimension && unitDimension !== "package";
  })) {
    errors.push({ code: "incompatible_units", path: "inventory", message: "Las unidades de medida deben ser dimensionalmente compatibles. Los formatos de empaque requieren una conversión explícita por producto." });
  }
  const requiresProductConversion = Boolean(baseUnit && [...purchaseUnits, ...saleUnits].some((unit) => DIMENSIONS[unit] !== DIMENSIONS[baseUnit!]));
  const configuration: IndustryConfiguration = {
    ...defaults(profile.id), channels,
    inventory: { baseUnit, purchaseUnits, saleUnits, trackLots: bool(inv, "trackLots", "inventory", errors), trackExpiry: bool(inv, "trackExpiry", "inventory", errors), allowFractionalQuantity: bool(inv, "allowFractionalQuantity", "inventory", errors), multipleWarehouses: bool(inv, "multipleWarehouses", "inventory", errors) },
    commercial: { priceLists: bool(com, "priceLists", "commercial", errors), volumePricing: bool(com, "volumePricing", "commercial", errors), customerCredit: bool(com, "customerCredit", "commercial", errors) },
    operations: { quoteByProject: bool(ops, "quoteByProject", "operations", errors), scheduledDispatch: bool(ops, "scheduledDispatch", "operations", errors), returnsAndWarranty: bool(ops, "returnsAndWarranty", "operations", errors) },
  };
  if (configuration.inventory.trackExpiry && !configuration.inventory.trackLots) errors.push({ code: "expiry_requires_lots", path: "inventory.trackExpiry", message: "El control de vencimientos requiere trazabilidad por lotes." });
  if (errors.length) return { ok: false, errors };

  const requested = new Set<IndustryCapability>();
  if (configuration.inventory.allowFractionalQuantity) requested.add("fractional_units");
  if (configuration.inventory.trackLots || configuration.inventory.trackExpiry) requested.add("lots_expiry");
  if (configuration.inventory.multipleWarehouses) requested.add("multi_warehouse");
  if (requiresProductConversion) requested.add("unit_conversions");
  if (configuration.commercial.priceLists) requested.add("price_lists");
  if (configuration.commercial.volumePricing) requested.add("volume_pricing");
  if (configuration.commercial.customerCredit) requested.add("credit_accounts");
  if (configuration.operations.quoteByProject) requested.add("projects");
  if (configuration.operations.scheduledDispatch) requested.add("dispatch_scheduling");
  if (configuration.operations.returnsAndWarranty) requested.add("returns_warranty");
  const requestedCapabilities = [...requested];
  const availableCapabilities = requestedCapabilities.filter((c) => getCapabilityReadiness(c).status === "available");
  const plannedCapabilities = requestedCapabilities.filter((c) => getCapabilityReadiness(c).status !== "available");
  return { ok: true, configuration, requestedCapabilities, availableCapabilities, plannedCapabilities };
}
