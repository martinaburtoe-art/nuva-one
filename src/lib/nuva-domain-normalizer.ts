export type IntelligenceDomain = "cashflow" | "sales" | "inventory" | "purchases" | "crm" | "tax" | "compliance";

/** Keeps Business Brain domains intact instead of collapsing tax/compliance signals into CRM. */
export function normalizeIntelligenceDomain(module: string): IntelligenceDomain {
  switch (module) {
    case "cashflow":
    case "sales":
    case "inventory":
    case "purchases":
    case "crm":
    case "tax":
    case "compliance":
      return module;
    default:
      return "compliance";
  }
}
