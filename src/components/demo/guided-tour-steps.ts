export type DemoStep = {
  title: string;
  description: string;
  target: string;
};

export const DEMO_STEPS: DemoStep[] = [
  { title: "1. Tu negocio, en un vistazo", description: "Parte con una visión clara de ingresos, gastos, ventas y stock.", target: "overview" },
  { title: "2. Nüva Score", description: "Convierte tus datos en una lectura simple de la salud del negocio.", target: "score" },
  { title: "3. Explícame mi negocio", description: "Obtén una explicación accionable sin revisar planillas una por una.", target: "explain" },
  { title: "4. Inventario inteligente", description: "Detecta quiebres de stock y prioriza qué reponer.", target: "inventory" },
  { title: "5. Oportunidad detectada", description: "En este escenario, la demo identifica una oportunidad de seguimiento comercial.", target: "recommendation" },
  { title: "6. Una venta mueve todo", description: "Simula una venta y observa cómo cambian stock, ingresos y finanzas.", target: "sale" },
  { title: "7. Finanzas y clientes conectados", description: "La venta actualiza ingresos, caja y costos; también actualiza el historial del cliente.", target: "finance" },
  { title: "8. Pregúntale a la IA", description: "Consulta el negocio en lenguaje natural. Esta demo usa IA simulada, sin consumir cuota.", target: "ai" },
  { title: "9. Tu siguiente paso", description: "Cuando el valor queda claro, puedes crear tu cuenta y comenzar con tus propios datos.", target: "cta" },
];
