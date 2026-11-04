import { describe, it, expect, beforeEach, vi } from "vitest";
import { handlePaymentWebhook } from "./payment-webhook-handler.server";
import { getPaymentAdapter, decryptPaymentCreds } from "./payment-service.server";

vi.mock("./crypto.server", () => ({
  decryptSecret: (v: string | null) => v ?? "",
}));
vi.mock("./payment-service.server", () => ({
  getPaymentAdapter: vi.fn(() => ({ checkStatus: vi.fn(), createPayment: vi.fn() })),
  decryptPaymentCreds: vi.fn(() => ({ apiKey: "x", secretKey: "y" })),
}));

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

function seedIntent(
  sb: ReturnType<typeof makeFakeSupabase>,
  { businessId, saleId, token, amount, plan }: { businessId: string; saleId: string; token: string; amount: number; plan: "starter" | "pro" },
) {
  sb._tables.payment_intents.push({
    business_id: businessId,
    sale_id: saleId,
    provider: "flow",
    token,
    commerce_order: `sub-${plan}-${saleId}`,
    amount,
    status: "pending",
  });
  sb._tables.billing_integrations.push({
    business_id: businessId,
    type: "payment",
    provider: "flow",
    status: "connected",
    environment: "dev",
    api_key: "x",
    secret_key: "y",
    api_url: "",
  });
}

describe("Flujo de contratación — suscripciones starter y pro (T-35)", () => {
  let sb: ReturnType<typeof makeFakeSupabase>;
  const businessId = "biz-sus-1";

  beforeEach(() => {
    sb = makeFakeSupabase();
    vi.mocked(getPaymentAdapter).mockClear();
    vi.mocked(decryptPaymentCreds).mockClear();
  });

  it("starter: cobro de $11.990 aprobado activa la suscripción (pasos 5,6,7,8,9)", async () => {
    vi.mocked(getPaymentAdapter).mockReturnValue({
      checkStatus: vi.fn().mockResolvedValue({ status: "paid" }),
    });

    const token = "tok-starter-1";
    seedIntent(sb, { businessId, saleId: "sale-starter-1", token, amount: 11_990, plan: "starter" });

    const r = await handlePaymentWebhook(sb, "flow", token);

    expect(r.outcome).toBe("resolved_paid");
    expect(sb._tables.payment_intents[0].status).toBe("paid");
    expect(sb._tables.payments[0]).toMatchObject({
      business_id: businessId,
      sale_id: "sale-starter-1",
      amount: 11_990,
      method: "flow",
    });
    expect(vi.mocked(getPaymentAdapter).mock.calls[0][0]).toBe("flow");
  });

  it("pro: cobro de $27.990 aprobado activa la suscripción (pasos 5,6,7,8,9)", async () => {
    vi.mocked(getPaymentAdapter).mockReturnValue({
      checkStatus: vi.fn().mockResolvedValue({ status: "paid" }),
    });

    const token = "tok-pro-1";
    seedIntent(sb, { businessId, saleId: "sale-pro-1", token, amount: 27_990, plan: "pro" });

    const r = await handlePaymentWebhook(sb, "flow", token);

    expect(r.outcome).toBe("resolved_paid");
    expect(sb._tables.payment_intents[0].status).toBe("paid");
    expect(sb._tables.payments[0].amount).toBe(27_990);
  });

  it("pro: cobro rechazado marca el intento como rechazado, sin abono duplicado (pasos 7,12)", async () => {
    vi.mocked(getPaymentAdapter).mockReturnValue({
      checkStatus: vi.fn().mockResolvedValue({ status: "rejected" }),
    });

    const token = "tok-pro-reject-1";
    seedIntent(sb, { businessId, saleId: "sale-pro-reject-1", token, amount: 27_990, plan: "pro" });

    const r = await handlePaymentWebhook(sb, "flow", token);

    expect(r.outcome).toBe("resolved_rejected");
    expect(sb._tables.payment_intents[0].status).toBe("rejected");
    expect(sb._tables.payments.length).toBe(0); // pago rechazado no genera abono
  });

  it("idempotencia: mismo token procesado N veces no duplica el abono (paso 7)", async () => {
    vi.mocked(getPaymentAdapter).mockReturnValue({
      checkStatus: vi.fn().mockResolvedValue({ status: "paid" }),
    });

    const token = "tok-idem-1";
    seedIntent(sb, { businessId, saleId: "sale-idem-1", token, amount: 11_990, plan: "starter" });

    await handlePaymentWebhook(sb, "flow", token);
    await handlePaymentWebhook(sb, "flow", token);
    const r3 = await handlePaymentWebhook(sb, "flow", token);

    expect(r3.outcome).toBe("already_processed");
    expect(sb._tables.payments.length).toBe(1); // nunca 2 ni 3
    expect(sb._tables.payment_webhook_events.filter((e) => e.processed).length).toBe(1);
  });

  it("token desconocido no rompe y no inserta nada", async () => {
    const r = await handlePaymentWebhook(sb, "flow", "token-fantasma");
    expect(r.outcome).toBe("unknown_token");
    expect(sb._tables.payments.length).toBe(0);
    expect(sb._tables.payment_intents.length).toBe(0);
  });

  it("estado pendiente no marca como procesado (reintentos seguros) (paso 7)", async () => {
    vi.mocked(getPaymentAdapter).mockReturnValue({
      checkStatus: vi.fn().mockResolvedValue({ status: "pending" }),
    });

    const token = "tok-pending-1";
    seedIntent(sb, { businessId, saleId: "sale-pending-1", token, amount: 11_990, plan: "starter" });

    const r = await handlePaymentWebhook(sb, "flow", token);

    expect(r.outcome).toBe("resolved_pending");
    expect(sb._tables.payment_intents[0].status).toBe("pending");
    expect(sb._tables.payments.length).toBe(0);
    // El evento no queda marcado como processed para permitir reintento
    const events = sb._tables.payment_webhook_events.filter((e) => e.token === token);
    expect(events[0]?.processed).toBeUndefined();
  });
});
