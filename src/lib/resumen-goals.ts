export function goalsLabel(value: string) {
  return value === "sales" ? "ventas" : value === "inventory" ? "inventario" : value === "finance" ? "finanzas" : value === "customers" ? "clientes" : "todo el negocio";
}
