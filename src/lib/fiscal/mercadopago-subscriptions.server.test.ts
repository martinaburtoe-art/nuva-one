import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMercadoPagoSubscription,
  encodeMercadoPagoExternalReference,
  parseMercadoPagoExternalReference,
} from "./mercadopago-subscriptions.server";

describe("Mercado Pago subscription plan reference", () => {
  it("encodes Starter in the preapproval external reference", () => {
    expect(encodeMercadoPagoExternalReference("biz-123", "starter")).toBe("biz-123|plan=starter");
  });

  it("encodes Pro in the preapproval external reference", () => {
    expect(encodeMercadoPagoExternalReference("biz-123", "pro")).toBe("biz-123|plan=pro");
  });

  it("round-trips Starter without losing the business id", () => {
    expect(parseMercadoPagoExternalReference("biz-123|plan=starter")).toEqual({
      businessId: "biz-123",
      planId: "starter",
    });
  });

  it("round-trips Pro without losing the business id", () => {
    expect(parseMercadoPagoExternalReference("biz-123|plan=pro")).toEqual({
      businessId: "biz-123",
      planId: "pro",
    });
  });

  it("keeps legacy references compatible and does not invent Pro", () => {
    expect(parseMercadoPagoExternalReference("biz-legacy")).toEqual({
      businessId: "biz-legacy",
      planId: null,
    });
  });

  it("rejects an unknown plan marker", () => {
    expect(parseMercadoPagoExternalReference("biz-123|plan=enterprise")).toEqual({
      businessId: "biz-123",
      planId: null,
    });
  });
});


describe("Mercado Pago subscription billing cadence", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const config = { accessToken: "test-access-token", environment: "test" as const };

  it("creates a monthly preapproval with one-month recurrence", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "preapproval-monthly", init_point: "https://www.mercadopago.com/checkout/monthly" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await createMercadoPagoSubscription({
      config,
      businessId: "business-1",
      businessName: "Demo",
      email: "owner@example.cl",
      planName: "Nüva Start",
      planId: "starter",
      amount: 11_990,
      billing: "monthly",
      backUrl: "https://nuva-one.vercel.app/settings?billing=mercadopago",
    });

    const request = fetchSpy.mock.calls[0]?.[1];
    const payload = JSON.parse(String(request?.body));
    expect(result.ok).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith("https://api.mercadopago.com/preapproval", expect.objectContaining({ method: "POST" }));
    expect(payload.auto_recurring).toEqual({
      frequency: 1,
      frequency_type: "months",
      transaction_amount: 11_990,
      currency_id: "CLP",
    });
  });

  it("creates an annual preapproval with twelve-month recurrence and annual amount", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "preapproval-annual", init_point: "https://www.mercadopago.com/checkout/annual" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await createMercadoPagoSubscription({
      config,
      businessId: "business-2",
      businessName: "Demo",
      email: "owner@example.cl",
      planName: "Nüva Pro",
      planId: "pro",
      amount: 279_900,
      billing: "annual",
      backUrl: "https://nuva-one.vercel.app/settings?billing=mercadopago",
    });

    const request = fetchSpy.mock.calls[0]?.[1];
    const payload = JSON.parse(String(request?.body));
    expect(result.ok).toBe(true);
    expect(payload.auto_recurring).toEqual({
      frequency: 12,
      frequency_type: "months",
      transaction_amount: 279_900,
      currency_id: "CLP",
    });
  });
});
