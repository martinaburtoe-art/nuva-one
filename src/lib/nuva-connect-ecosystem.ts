export type NuvaIntegrationCategory =
  | "commerce"
  | "automation"
  | "customer"
  | "analytics"
  | "documents"
  | "finance"
  | "logistics";

export type NuvaIntegrationMode = "oauth" | "api_key" | "webhook" | "adapter";
export type NuvaIntegrationStatus = "base_ready" | "configuration_required" | "planned";

export type NuvaIntegration = {
  id: string;
  name: string;
  category: NuvaIntegrationCategory;
  description: string;
  status: NuvaIntegrationStatus;
  modes: NuvaIntegrationMode[];
  syncs: string[];
  direction: "in" | "out" | "bidirectional";
  priority: "core" | "regional" | "extended";
  officialUrl: string;
};

export const NUVA_CONNECT_INTEGRATIONS: NuvaIntegration[] = [
  { id: "shopify", name: "Shopify", category: "commerce", description: "Productos, pedidos, clientes e inventario para tiendas online.", status: "configuration_required", modes: ["oauth", "webhook"], syncs: ["productos", "pedidos", "clientes", "inventario"], direction: "bidirectional", priority: "core", officialUrl: "https://shopify.dev/docs/apps" },
  { id: "woocommerce", name: "WooCommerce", category: "commerce", description: "Conecta una tienda WordPress/WooCommerce con el catálogo y la operación de Nüva.", status: "configuration_required", modes: ["api_key", "webhook"], syncs: ["productos", "pedidos", "clientes", "inventario"], direction: "bidirectional", priority: "core", officialUrl: "https://woocommerce.github.io/woocommerce-rest-api-docs/" },
  { id: "mercadolibre", name: "Mercado Libre", category: "commerce", description: "Publicaciones, ventas, compradores, pagos y envíos del marketplace.", status: "configuration_required", modes: ["oauth", "webhook"], syncs: ["publicaciones", "ventas", "clientes", "envíos"], direction: "bidirectional", priority: "core", officialUrl: "https://developers.mercadolibre.cl/" },
  { id: "calcom", name: "Cal.com", category: "customer", description: "Agenda comercial, reservas y seguimiento de citas.", status: "base_ready", modes: ["oauth", "webhook"], syncs: ["citas", "contactos", "disponibilidad"], direction: "bidirectional", priority: "extended", officialUrl: "https://cal.com/docs" },
  { id: "n8n", name: "n8n", category: "automation", description: "Orquestación avanzada entre eventos de Nüva One y servicios externos.", status: "base_ready", modes: ["webhook", "api_key"], syncs: ["eventos", "automatizaciones", "resultados"], direction: "bidirectional", priority: "core", officialUrl: "https://docs.n8n.io/" },
  { id: "chatwoot", name: "Chatwoot", category: "customer", description: "Conversaciones y soporte conectados al contexto comercial del cliente.", status: "base_ready", modes: ["api_key", "webhook"], syncs: ["contactos", "conversaciones", "eventos"], direction: "bidirectional", priority: "extended", officialUrl: "https://developers.chatwoot.com/" },
  { id: "posthog", name: "PostHog", category: "analytics", description: "Analítica de producto y experiencia para medir adopción y embudos.", status: "base_ready", modes: ["api_key"], syncs: ["eventos", "embudos", "experimentos"], direction: "out", priority: "extended", officialUrl: "https://posthog.com/docs" },
  { id: "nextcloud", name: "Nextcloud", category: "documents", description: "Documentos empresariales y respaldos conectados a la operación.", status: "base_ready", modes: ["api_key"], syncs: ["archivos", "carpetas", "metadatos"], direction: "bidirectional", priority: "extended", officialUrl: "https://docs.nextcloud.com/server/stable/developer_manual/" },
  { id: "banks-cl", name: "Bancos Chile", category: "finance", description: "Capa de adaptadores para conciliación bancaria y movimientos financieros.", status: "planned", modes: ["adapter"], syncs: ["movimientos", "saldos", "conciliación"], direction: "in", priority: "regional", officialUrl: "https://www.abif.cl/" },
  { id: "pos", name: "POS externos", category: "commerce", description: "Conectores para puntos de venta externos sin duplicar la caja de Nüva.", status: "planned", modes: ["api_key", "webhook", "adapter"], syncs: ["ventas", "productos", "stock", "cierres"], direction: "bidirectional", priority: "regional", officialUrl: "https://nuva-one.vercel.app/" },
  { id: "delivery-logistics", name: "Delivery & logística", category: "logistics", description: "Adaptadores para operadores de última milla, estados y trazabilidad de entregas.", status: "planned", modes: ["api_key", "webhook", "adapter"], syncs: ["despachos", "tracking", "estados"], direction: "bidirectional", priority: "regional", officialUrl: "https://nuva-one.vercel.app/" },
  { id: "accounting", name: "Contabilidad externa", category: "finance", description: "Puente para intercambiar asientos, documentos y estados con sistemas contables.", status: "planned", modes: ["api_key", "webhook", "adapter"], syncs: ["asientos", "documentos", "cierres"], direction: "bidirectional", priority: "regional", officialUrl: "https://nuva-one.vercel.app/" },
];

export const NUVA_CONNECT_CATEGORIES: Array<{ id: NuvaIntegrationCategory; label: string }> = [
  { id: "commerce", label: "Comercio" },
  { id: "finance", label: "Finanzas" },
  { id: "logistics", label: "Logística" },
  { id: "customer", label: "Clientes" },
  { id: "automation", label: "Automatización" },
  { id: "analytics", label: "Analítica" },
  { id: "documents", label: "Documentos" },
];

export function getNuvaIntegrationStatusLabel(status: NuvaIntegrationStatus) {
  if (status === "base_ready") return "Base lista";
  if (status === "configuration_required") return "Requiere configuración";
  return "Planificada";
}

export function getNuvaIntegrationStatusTone(status: NuvaIntegrationStatus) {
  if (status === "base_ready") return "default" as const;
  if (status === "configuration_required") return "secondary" as const;
  return "outline" as const;
}
