import type { IndustryCapability } from "@/lib/industry-profiles";

export type CapabilityLifecycle = "available" | "pilot" | "planned";

export type CapabilityReadiness = {
  status: CapabilityLifecycle;
  evidence: string;
};

/**
 * A sector profile describes the target operating model. It does not itself
 * enable a feature. This registry is the release gate consumed by future
 * onboarding and industry dashboards.
 *
 * "available" is limited to capabilities with an existing end-to-end module
 * or persisted workflow in the current product. Everything else remains
 * hidden as a planned capability until a separate implementation is verified.
 */
export const INDUSTRY_CAPABILITY_READINESS: Record<IndustryCapability, CapabilityReadiness> = {
  product_variants: {
    status: "planned",
    evidence: "No tenant-safe product family and variant model is present in the current schema.",
  },
  fractional_units: {
    status: "planned",
    evidence: "Inventory movements use numeric quantities, but products.stock is integer; the full POS-to-ledger path is not yet verified for fractions.",
  },
  unit_conversions: {
    status: "planned",
    evidence: "No product-specific, dimension-aware unit conversion registry is present.",
  },
  barcode: {
    status: "available",
    evidence: "Product code registry and mobile scanner workflows exist in the current product.",
  },
  lots_expiry: {
    status: "planned",
    evidence: "No end-to-end lot, expiry, FEFO and recall workflow is verified.",
  },
  serial_tracking: {
    status: "planned",
    evidence: "No serialized-item lifecycle is verified across receiving, sale, return and repair.",
  },
  multi_warehouse: {
    status: "planned",
    evidence: "No verified multi-warehouse stock ownership and transfer workflow is present.",
  },
  price_lists: {
    status: "planned",
    evidence: "No tenant-scoped, customer-specific price-list engine is verified.",
  },
  volume_pricing: {
    status: "planned",
    evidence: "No complete quantity-break pricing engine is verified across quotes and POS.",
  },
  quotes: {
    status: "available",
    evidence: "Quotes module and persisted quotes workflow exist.",
  },
  dispatch: {
    status: "available",
    evidence: "Shipments module and persisted shipment events exist.",
  },
  dispatch_scheduling: {
    status: "planned",
    evidence: "Persisted shipments exist, but no full scheduled dispatch calendar, capacity allocation and route-slot workflow is verified.",
  },
  recipes_bom: {
    status: "planned",
    evidence: "No recipe or bill-of-materials costing and consumption workflow is verified.",
  },
  production_orders: {
    status: "planned",
    evidence: "No production order lifecycle with actual consumption, output and scrap is verified.",
  },
  appointments: {
    status: "planned",
    evidence: "No complete appointment calendar, resource allocation and reminders workflow is verified.",
  },
  work_orders: {
    status: "planned",
    evidence: "No full work-order lifecycle with labor, parts, authorization and closeout is verified.",
  },
  projects: {
    status: "planned",
    evidence: "No project budget, milestones, time and cost allocation workflow is verified.",
  },
  fleet: {
    status: "planned",
    evidence: "No fleet, vehicle, trip, driver and maintenance lifecycle is verified.",
  },
  asset_rental: {
    status: "planned",
    evidence: "No serialized asset availability, contract and return workflow is verified.",
  },
  reservations: {
    status: "planned",
    evidence: "No availability, reservation, check-in and cancellation workflow is verified.",
  },
  customer_history: {
    status: "available",
    evidence: "Customer CRM activity and customer records are persisted.",
  },
  commissions: {
    status: "planned",
    evidence: "No commission calculation, approval and settlement workflow is verified.",
  },
  returns_warranty: {
    status: "planned",
    evidence: "No complete returns, warranty and serial/lot traceability workflow is verified.",
  },
  cash_register: {
    status: "available",
    evidence: "Cash register, cash movements and close controls exist.",
  },
  credit_accounts: {
    status: "planned",
    evidence: "No complete customer credit limit, receivable ageing and collection lifecycle is verified.",
  },
};

export function getCapabilityReadiness(capability: IndustryCapability): CapabilityReadiness {
  return INDUSTRY_CAPABILITY_READINESS[capability];
}

export function getAvailableIndustryCapabilities(
  capabilities: readonly IndustryCapability[],
): IndustryCapability[] {
  return capabilities.filter((capability) => INDUSTRY_CAPABILITY_READINESS[capability].status === "available");
}
