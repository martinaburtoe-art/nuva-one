import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { handlePaymentWebhook } from "./payment-webhook-handler.server";
import { startMockFlowServer } from "@/test-utils/mock-flow-server";
import crypto from "node:crypto";

vi.mock("./crypto.server", () => ({
  decryptSecret: (v: string | null) => v ?? "",
}));

const PORT = 4179;
const mock = startMockFlowServer(PORT);
const realFetch = global.fetch;
global.fetch = ((input: any, init?: any) => {
  const url = typeof input === "string" ? input : input.url;
  if (url.startsWith("https://sandbox.flow.cl")) {
    return realFetch(url.replace("https://sandbox.flow.cl", `http://localhost:${PORT}`), init);
  }
  return realFetch(input, init);
}) as any;
afterAll(() => {
  mock.server.close();
  global.fetch = realFetch;
});

// Mock de Supabase en memoria que reproduce la cadena
// .from(table).select().eq().eq()...maybeSingle()/insert()/update() que usa
// el webhook real, guardando todo en Maps in-process.
function makeFakeSupabase() {
  const tables: Record<string, any[]> = {
    payment_webhook_events: [],
    payment_intents: [],
    billing_integrations: [],
    payments: [],
  };

  function matches(row: any, filters: [string, any][]) {
    return filters.every(([k, v]) => row[k] === v);
  }

  function builder(table: string) {
    const filters: [string, any][] = [];
    let insertedRows: any[] | null = null;
    let updatePatch: any = null;
    return {
      select: () => builder2(),
      insert: (row: any) => {
        insertedRows = Array.isArray(row) ? row : [row];
        insertedRows.forEach((r) => tables[table].push({ ...r }));
        return Promise.resolve({ data: insertedRows, error: null });
      },
      update: (patch: any) => {
        updatePatch = patch;
        return builder2();
      },
      eq(this: any, k: string, v: any) {
        filters.push([k, v]);
        return this;
      },
      maybeSingle: async () => {
        const row = tables[table].find((r) => matches(r, filters));
        return { data: row ?? null, error: null };
      },
      then: undefined,
    };

    function builder2() {
      const state = { filters: [...filters] };
      const chain: any = {
        eq(k: string, v: any) {
          state.filters.push([k, v]);
          return chain;
        },
        maybeSingle: async () => {
          const row = tables[table].find((r) => matches(r, state.filters));
          return { data: row ?? null, error: null };
        },
        // Hace el chain "thenable" -- así `await ...update(x).eq().eq()`
        // ejecuta el update, igual que el cliente real de Supabase.
        then: (resolve: any) => {
          if (updatePatch) {
            const row = tables[table].find((r) => matches(r, state.filters));
            if (row) Object.assign(row, updatePatch);
          }
          resolve({ data: null, error: null });
        },
      };
      return chain;
    }
  }

  return {
    from: (table: string) => builder(table),
    _tables: tables,
  };
}

describe("handlePaymentWebhook", () => {
  let sb: ReturnType<typeof makeFakeSupabase>;
  const businessId = "biz-1";
  const saleId = "sale-1";

  beforeEach(() => {
    sb = makeFakeSupabase();
  });

  it("marca la venta pagada cuando Flow confirma el pago (server-to-server)", async () => {
    const intent = { apiKey: mock.API_KEY, secretKey: mock.SECRET, environment: "dev" as const };
    const created = await (
      await import("../fiscal/adapters/flow.server")
    ).flowAdapter.createPayment(
      { ...intent, apiUrl: "" },
      {
        amount: 9990,
        subject: "Test",
        commerceOrder: `sale-${saleId}`,
        returnUrl: "https://x/return",
        webhookUrl: "https://x/webhook",
      },
    );
    const token = created.token!;

    sb._tables.payment_intents.push({
      business_id: businessId,
      sale_id: saleId,
      provider: "flow",
      token,
      commerce_order: `sale-${saleId}`,
      amount: 9990,
      status: "pending",
    });
    sb._tables.billing_integrations.push({
      business_id: businessId,
      type: "payment",
      provider: "flow",
      status: "connected",
      environment: "dev",
      api_key: mock.API_KEY,
      secret_key: mock.SECRET,
      api_url: "",
    });

    // El proveedor recién confirmó -> el negocio aún no lo sabe (pending)
    const r1 = await handlePaymentWebhook(sb, "flow", token);
    expect(r1.outcome).toBe("resolved_pending");
    expect(sb._tables.payments.length).toBe(0);

    // El cliente paga en Flow
    mock.setPaid(token);

    const r2 = await handlePaymentWebhook(sb, "flow", token);
    expect(r2.outcome).toBe("resolved_paid");
    expect(sb._tables.payments.length).toBe(1);
    expect(sb._tables.payments[0].amount).toBe(9990);
    expect(sb._tables.payment_intents[0].status).toBe("paid");
  });

  it("es idempotente: reintentos del mismo token no duplican el abono", async () => {
    const created = await (
      await import("../fiscal/adapters/flow.server")
    ).flowAdapter.createPayment(
      { apiKey: mock.API_KEY, secretKey: mock.SECRET, apiUrl: "", environment: "dev" },
      {
        amount: 5000,
        subject: "Test idempotencia",
        commerceOrder: `sale-idem`,
        returnUrl: "https://x/return",
        webhookUrl: "https://x/webhook",
      },
    );
    const token = created.token!;
    mock.setPaid(token);

    sb._tables.payment_intents.push({
      business_id: businessId,
      sale_id: "sale-idem",
      provider: "flow",
      token,
      commerce_order: "sale-idem",
      amount: 5000,
      status: "pending",
    });
    sb._tables.billing_integrations.push({
      business_id: businessId,
      type: "payment",
      provider: "flow",
      status: "connected",
      environment: "dev",
      api_key: mock.API_KEY,
      secret_key: mock.SECRET,
      api_url: "",
    });

    // Flow reintenta la notificación 3 veces (comportamiento real documentado)
    await handlePaymentWebhook(sb, "flow", token);
    await handlePaymentWebhook(sb, "flow", token);
    const r3 = await handlePaymentWebhook(sb, "flow", token);

    expect(r3.outcome).toBe("already_processed");
    expect(sb._tables.payments.length).toBe(1); // nunca 2 o 3
  });

  it("token desconocido no rompe y no inserta nada", async () => {
    const r = await handlePaymentWebhook(sb, "flow", "token-fantasma");
    expect(r.outcome).toBe("unknown_token");
    expect(sb._tables.payments.length).toBe(0);
  });
});
