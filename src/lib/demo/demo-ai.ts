import { DEMO_BUSINESS, DEMO_PRODUCTS, money, type DemoProduct } from "./demo-data";

let liveProducts: DemoProduct[] = DEMO_PRODUCTS;
let liveRevenue = DEMO_BUSINESS.monthlyRevenue;

export function setDemoAiState(products: DemoProduct[], revenue: number) {
  liveProducts = products;
  liveRevenue = revenue;
}

export function demoAiAnswer(question: string) {
  const q = question.toLowerCase();
  if (q.includes("stock") || q.includes("inventario")) {
    const low = liveProducts.filter((product) => product.stock <= product.reorderAt);
    return `Tienes ${low.length} productos para revisar. Recomiendo reponer ${low.map((p) => p.name).join(", ") || "los productos que estén bajo su punto de reposición"}.`;
  }
  if (q.includes("venta") || q.includes("ingreso")) {
    return `Alma Café registra ${money(liveRevenue)} de ingresos del período y un margen saludable. La oportunidad está en aumentar la recurrencia de clientes.`;
  }
  if (
    q.includes("recomend") ||
    q.includes("recomiend") ||
    q.includes("suger") ||
    q.includes("sugier") ||
    q.includes("qué harías") ||
    q.includes("que harías")
  ) {
    return "Priorizaría reposición de Granos Colombia, una campaña para clientes recurrentes y seguimiento comercial a los clientes de mayor valor.";
  }
  return "En esta demo puedo analizar ventas, inventario y oportunidades comerciales usando los datos ficticios de Alma Café.";
}
