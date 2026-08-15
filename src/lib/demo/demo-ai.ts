import { DEMO_BUSINESS, DEMO_PRODUCTS, money } from "./demo-data";

export function demoAiAnswer(question: string) {
  const q = question.toLowerCase();
  if (q.includes("stock") || q.includes("inventario")) {
    const low = DEMO_PRODUCTS.filter((product) => product.stock <= product.reorderAt);
    return `Tienes ${low.length} productos para revisar. Recomiendo reponer ${low.map((p) => p.name).join(", ")}.`;
  }
  if (q.includes("venta") || q.includes("ingreso")) {
    return `Alma Café registra ${money(DEMO_BUSINESS.monthlyRevenue)} de ingresos del período y un margen saludable. La oportunidad está en aumentar la recurrencia de clientes.`;
  }
  if (q.includes("recomend") || q.includes("qué harías") || q.includes("que harías")) {
    return "Priorizaría reposición de Granos Colombia, una campaña para clientes recurrentes y seguimiento comercial a los clientes de mayor valor.";
  }
  return "En esta demo puedo analizar ventas, inventario y oportunidades comerciales usando los datos ficticios de Alma Café.";
}
