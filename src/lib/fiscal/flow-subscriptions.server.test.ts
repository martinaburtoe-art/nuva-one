import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import {
  createFlowCustomer,
  sendCardRegistration,
  getCardRegisterStatus,
  chargeSubscription,
} from "./flow-subscriptions.server";

const CREDS = { apiKey: "test-key", secretKey: "test-secret", environment: "dev" as const };

function expectedSignature(params: Record<string, string>) {
  const ordered = Object.keys(params).sort();
  const toSign = ordered.map((k) => `${k}${params[k]}`).join("");
  return crypto.createHmac("sha256", CREDS.secretKey).update(toSign).digest("hex");
}

describe("flow-subscriptions.server", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("createFlowCustomer: firma y crea el cliente", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ customerId: "cus_abc123" }) });
    const result = await createFlowCustomer(CREDS, {
      businessId: "biz-1",
      name: "Prueba SPA",
      email: "x@nuvaone.cl",
    });
    const [, options] = fetchMock.mock.calls[0];
    const sent = Object.fromEntries(new URLSearchParams(options.body));
    const { s, ...rest } = sent;
    expect(s).toBe(expectedSignature(rest));
    expect(result.ok).toBe(true);
    expect(result.customerId).toBe("cus_abc123");
  });

  it("sendCardRegistration: arma la url de redirección con el token", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        url: "https://sandbox.flow.cl/app/customer/disclaimer.php",
        token: "reg-tok",
      }),
    });
    const result = await sendCardRegistration(CREDS, {
      customerId: "cus_abc123",
      returnUrl: "https://nuvaone.app/cb",
    });
    expect(result.ok).toBe(true);
    expect(result.registerUrl).toBe(
      "https://sandbox.flow.cl/app/customer/disclaimer.php?token=reg-tok",
    );
  });

  it("getCardRegisterStatus: status '1' se mapea a activo", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "1", customerId: "cus_abc123" }),
    });
    const result = await getCardRegisterStatus(CREDS, "reg-tok");
    expect(result.active).toBe(true);
    expect(result.customerId).toBe("cus_abc123");
  });

  it("getCardRegisterStatus: status distinto de '1' no queda activo", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ status: "0" }) });
    const result = await getCardRegisterStatus(CREDS, "reg-tok");
    expect(result.active).toBe(false);
  });

  it("chargeSubscription: status=2 (Flow) -> 'paid'", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 2, flowOrder: 999 }),
    });
    const result = await chargeSubscription(CREDS, {
      customerId: "cus_abc123",
      amount: 29990,
      subject: "Nüva One Pro",
      commerceOrder: "sub-biz-1-1",
    });
    expect(result.status).toBe("paid");
    expect(result.flowOrder).toBe("999");
  });

  it("chargeSubscription: status rechazado -> 'rejected' con mensaje", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ status: 3 }) });
    const result = await chargeSubscription(CREDS, {
      customerId: "cus_abc123",
      amount: 29990,
      subject: "Nüva One Pro",
      commerceOrder: "sub-biz-1-2",
    });
    expect(result.status).toBe("rejected");
    expect(result.errorMessage).toBeTruthy();
  });

  it("chargeSubscription: falla de red no revienta, devuelve rechazado", async () => {
    fetchMock.mockRejectedValueOnce(new Error("down"));
    const result = await chargeSubscription(CREDS, {
      customerId: "c",
      amount: 1,
      subject: "x",
      commerceOrder: "o",
    });
    expect(result.ok).toBe(false);
    expect(result.status).toBe("rejected");
  });
});
