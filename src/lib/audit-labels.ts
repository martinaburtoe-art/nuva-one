// Etiquetas y utilidades compartidas para presentar el registro de auditoría
// (audit_log) de forma legible en la UI, el CSV y el PDF. Mantener esto en un
// solo lugar evita que la tabla, el resumen y el informe descargable se
// desincronicen entre sí.

export type AuditAction = "INSERT" | "UPDATE" | "DELETE" | (string & {});

export const ACTION_LABELS: Record<string, string> = {
  INSERT: "Creación",
  UPDATE: "Modificación",
  DELETE: "Eliminación",
};

export const ACTION_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  INSERT: {
    bg: "bg-emerald-50 dark:bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  UPDATE: {
    bg: "bg-amber-50 dark:bg-amber-500/15",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  DELETE: {
    bg: "bg-red-50 dark:bg-red-500/15",
    text: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
  },
};

// RGB para jsPDF (0-255), en el mismo orden que ACTION_COLORS.
export const ACTION_COLORS_RGB: Record<string, [number, number, number]> = {
  INSERT: [22, 163, 74],
  UPDATE: [217, 119, 6],
  DELETE: [220, 38, 38],
};

export const ENTITY_LABELS: Record<string, string> = {
  products: "Productos",
  sales: "Ventas",
  purchases: "Compras",
  transactions: "Movimientos de caja",
  quotes: "Cotizaciones",
  customers: "Clientes",
  suppliers: "Proveedores",
  automations: "Automatizaciones",
  marketing_posts: "Marketing",
  audit_log: "Auditoría",
};

export function actionLabel(action: string | null | undefined): string {
  if (!action) return "—";
  return ACTION_LABELS[action] ?? action;
}

export function entityLabel(entity: string | null | undefined): string {
  if (!entity) return "—";
  return ENTITY_LABELS[entity] ?? entity;
}

// Campos técnicos que no aportan al resumen legible de un cambio.
const IGNORED_DIFF_KEYS = new Set(["id", "created_at", "updated_at", "business_id"]);

function pickDisplayName(obj: Record<string, unknown> | undefined | null): string | null {
  if (!obj) return null;
  const candidate = obj.name ?? obj.title ?? obj.full_name ?? obj.customer_name ?? obj.description;
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
}

/**
 * Convierte el metadata crudo (before/after en JSONB) de una fila de
 * audit_log en una frase corta y legible, ej:
 *   "Stock actualizado — Zapatilla Running: stock, precio"
 *   "Cliente creado: Juan Pérez"
 *   "Venta eliminada"
 */
export function summarizeAuditEntry(
  action: string | null | undefined,
  entity: string | null | undefined,
  metadata: unknown,
): string {
  const meta = (metadata ?? {}) as {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  const before = meta.before;
  const after = meta.after;
  const name = pickDisplayName(after) ?? pickDisplayName(before);
  const entityName = entityLabel(entity);

  if (action === "INSERT") {
    return name ? `${entityName} creado: ${name}` : `${entityName} creado`;
  }
  if (action === "DELETE") {
    return name ? `${entityName} eliminado: ${name}` : `${entityName} eliminado`;
  }
  if (action === "UPDATE" && before && after) {
    const changed = Object.keys(after).filter((k) => {
      if (IGNORED_DIFF_KEYS.has(k)) return false;
      const a = JSON.stringify(after[k]);
      const b = JSON.stringify(before[k]);
      return a !== b;
    });
    if (changed.length === 0) {
      return name ? `${entityName} actualizado: ${name}` : `${entityName} actualizado`;
    }
    const fields = changed.slice(0, 4).join(", ") + (changed.length > 4 ? "…" : "");
    return name ? `${name} — campos: ${fields}` : `Campos modificados: ${fields}`;
  }
  return name ? `${entityName}: ${name}` : entityName;
}

export type ResolvedUser = { full_name: string | null; email: string | null; role?: string | null };

export function displayUserName(
  userId: string | null,
  users: Record<string, ResolvedUser>,
): string {
  if (!userId) return "Sistema";
  const u = users[userId];
  if (!u) return userId.slice(0, 8);
  return u.full_name?.trim() || u.email || userId.slice(0, 8);
}
