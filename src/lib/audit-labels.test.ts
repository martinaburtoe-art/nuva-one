import { describe, it, expect } from "vitest";
import { actionLabel, entityLabel, summarizeAuditEntry, displayUserName } from "./audit-labels";

describe("audit-labels", () => {
  it("traduce acciones conocidas y deja pasar desconocidas", () => {
    expect(actionLabel("INSERT")).toBe("Creación");
    expect(actionLabel("UPDATE")).toBe("Modificación");
    expect(actionLabel("DELETE")).toBe("Eliminación");
    expect(actionLabel("WEIRD")).toBe("WEIRD");
    expect(actionLabel(null)).toBe("—");
  });

  it("traduce módulos conocidos y deja pasar desconocidos", () => {
    expect(entityLabel("products")).toBe("Productos");
    expect(entityLabel("sales")).toBe("Ventas");
    expect(entityLabel(null)).toBe("—");
  });

  it("resume una creación con el nombre del registro", () => {
    const summary = summarizeAuditEntry("INSERT", "customers", {
      after: { name: "Juan Pérez" },
    });
    expect(summary).toBe("Clientes creado: Juan Pérez");
  });

  it("resume una eliminación con el nombre del registro", () => {
    const summary = summarizeAuditEntry("DELETE", "products", {
      before: { name: "Zapatilla Running" },
    });
    expect(summary).toBe("Productos eliminado: Zapatilla Running");
  });

  it("resume una modificación listando los campos que cambiaron", () => {
    const summary = summarizeAuditEntry("UPDATE", "products", {
      before: { name: "Zapatilla Running", stock: 10, price: 19990 },
      after: { name: "Zapatilla Running", stock: 4, price: 21990 },
    });
    expect(summary).toBe("Zapatilla Running — campos: stock, price");
  });

  it("ignora campos técnicos al diferenciar una actualización", () => {
    const summary = summarizeAuditEntry("UPDATE", "products", {
      before: { name: "A", updated_at: "2026-01-01" },
      after: { name: "A", updated_at: "2026-01-02" },
    });
    expect(summary).toBe("Productos actualizado: A");
  });

  it("resuelve el nombre visible de un usuario", () => {
    const users = {
      "u1": { full_name: "María López", email: "maria@x.cl" },
      "u2": { full_name: null, email: "sin-nombre@x.cl" },
    };
    expect(displayUserName("u1", users)).toBe("María López");
    expect(displayUserName("u2", users)).toBe("sin-nombre@x.cl");
    expect(displayUserName(null, users)).toBe("Sistema");
    expect(displayUserName("desconocido-uuid-123", users)).toBe("desconoc");
  });
});
