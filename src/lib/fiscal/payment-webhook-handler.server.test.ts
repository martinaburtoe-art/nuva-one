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
    rpc: async (fn: string, args: Record<string, any>) => {
      if (fn !== "settle_payment_intent") {
        return { data: null, error: new Error("RPC inesperado") };
      }
      const { p_provider: provider, p_token: token, p_provider_status: providerStatus,
        p_provider_amount: providerAmount, p_provider_commerce_order: commerceOrder } = args;
      let event = tables.payment_webhook_events.find(
        (row) => row.provider === provider && row.token === token,
      );
      if (!event) {
        event = { provider, token, processed: false };
        tables.payment_webhook_events.push(event);
      }
      if (event.processed) return { data: { outcome: "already_processed" }, error: null };

      const intent = tables.payment_intents.find(
        (row) => row.provider === provider && row.token === token,
      );
      if (!intent) return { data: { outcome: "unknown_token" }, error: null };
      if (intent.status === "paid") {
        event.processed = true;
        return { data: { outcome: "already_paid" }, error: null };
      }
      if (intent.status === "rejected" || intent.status === "expired") {
        if (providerStatus === "paid") {
          event.processed = true;
          return { data: { outcome: "late_paid_after_terminal" }, error: null };
        }
        if (providerStatus === "rejected" || providerStatus === "expired") {
          event.processed = true;
          return { data: { outcome: "terminal_state" }, error: null };
        }
        if (providerStatus === "pending") {
          return { data: { outcome: "terminal_provider_state_unconfirmed" }, error: null };
        }
        return { data: { outcome: "provider_status_unresolved" }, error: null };
      }
      if (providerStatus === "pending") {
        return { data: { outcome: "resolved_pending" }, error: null };
      }
      if (providerStatus === "rejected") {
        intent.status = "rejected";
        event.processed = true;
        return { data: { outcome: "resolved_rejected" }, error: null };
      }
      if (providerStatus !== "paid") {
        return { data: { outcome: "provider_status_unresolved" }, error: null };
      }
      if (
        providerAmount === null || Number(providerAmount) !== Number(intent.amount) ||
        !commerceOrder || commerceOrder !== intent.commerce_order
      ) {
        return { data: { outcome: "provider_mismatch" }, error: null };
      }
      if (intent.sale_id) {
        const existing = tables.payments.find((row) => row.payment_intent_id === (intent.id ?? token));
        if (!existing) {
          tables.payments.push({
            business_id: intent.business_id,
            sale_id: intent.sale_id,
            amount: intent.amount,
            method: provider,
            payment_intent_id: intent.id ?? token,
          });
        }
      }
      intent.status = "paid";
      event.processed = true;
      return { data: { outcome: "resolved_paid" }, error: null };
    },
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


  it("rechaza una confirmación cuyo importe o referencia no coincide con el intento local", async () => {
    const created = await (
      await import("../fiscal/adapters/flow.server")
    ).flowAdapter.createPayment(
      { apiKey: mock.API_KEY, secretKey: mock.SECRET, apiUrl: "", environment: "dev" },
      {
        amount: 5000,
        subject: "Test validación",
        commerceOrder: "sale-verified",
        returnUrl: "https://x/return",
        webhookUrl: "https://x/webhook",
      },
    );
    const token = created.token!;
    mock.setPaid(token);

    sb._tables.payment_intents.push({
      business_id: businessId,
      sale_id: "sale-verified",
      provider: "flow",
      token,
      commerce_order: "sale-verified",
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

    mock.setPaymentDetails(token, { amount: 4999 });
    const wrongAmount = await handlePaymentWebhook(sb, "flow", token);
    expect(wrongAmount.outcome).toBe("provider_mismatch");
    expect(sb._tables.payments).toHaveLength(0);
    expect(sb._tables.payment_intents[0].status).toBe("pending");

    mock.setPaymentDetails(token, { amount: 5000, commerceOrder: "sale-other" });
    const wrongOrder = await handlePaymentWebhook(sb, "flow", token);
    expect(wrongOrder.outcome).toBe("provider_mismatch");
    expect(sb._tables.payments).toHaveLength(0);

    mock.setPaymentDetails(token, { commerceOrder: "sale-verified" });
    const verified = await handlePaymentWebhook(sb, "flow", token);
    expect(verified.outcome).toBe("resolved_paid");
    expect(sb._tables.payments).toHaveLength(1);
  });

  it("pone en cuarentena un pago tardío confirmado tras expiración local", async () => {
    const created = await (
      await import("../fiscal/adapters/flow.server")
    ).flowAdapter.createPayment(
      { apiKey: mock.API_KEY, secretKey: mock.SECRET, apiUrl: "", environment: "dev" },
      {
        amount: 2500,
        subject: "Pago tardío",
        commerceOrder: "sale-late-paid",
        returnUrl: "https://x/return",
        webhookUrl: "https://x/webhook",
      },
    );
    const token = created.token!;
    mock.setPaid(token);

    sb._tables.payment_intents.push({
      business_id: businessId,
      sale_id: "sale-late-paid",
      provider: "flow",
      token,
      commerce_order: "sale-late-paid",
      amount: 2500,
      status: "expired",
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

    const result = await handlePaymentWebhook(sb, "flow", token);
    expect(result.outcome).toBe("late_paid_after_terminal");
    expect(sb._tables.payments).toHaveLength(0);
    expect(sb._tables.payment_intents[0].status).toBe("expired");
    expect(sb._tables.payment_webhook_events[0].processed).toBe(true);
  });

  it("no libera un intento expirado si Flow todavía lo reporta pendiente", async () => {
    const created = await (
      await import("../fiscal/adapters/flow.server")
    ).flowAdapter.createPayment(
      { apiKey: mock.API_KEY, secretKey: mock.SECRET, apiUrl: "", environment: "dev" },
      {
        amount: 1800,
        subject: "Estado terminal no confirmado",
        commerceOrder: "sale-terminal-pending",
        returnUrl: "https://x/return",
        webhookUrl: "https://x/webhook",
      },
    );
    const token = created.token!;

    sb._tables.payment_intents.push({
      business_id: businessId,
      sale_id: "sale-terminal-pending",
      provider: "flow",
      token,
      commerce_order: "sale-terminal-pending",
      amount: 1800,
      status: "expired",
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

    const result = await handlePaymentWebhook(sb, "flow", token);
    expect(result.outcome).toBe("terminal_provider_state_unconfirmed");
    expect(sb._tables.payments).toHaveLength(0);
    expect(sb._tables.payment_intents[0].status).toBe("expired");
    expect(sb._tables.payment_webhook_events[0].processed).toBe(false);
  });

  it("token desconocido no rompe y no inserta nada", async () => {
    const r = await handlePaymentWebhook(sb, "flow", "token-fantasma");
    expect(r.outcome).toBe("unknown_token");
    expect(sb._tables.payments.length).toBe(0);
    expect(sb._tables.payment_webhook_events).toHaveLength(0);
  });
});
