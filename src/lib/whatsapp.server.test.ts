import { afterEach, describe, expect, it, vi } from "vitest";
import { sendWhatsAppMessage } from "./whatsapp.server";

describe("sendWhatsAppMessage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true and posts to the Graph API with the right shape on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const ok = await sendWhatsAppMessage("phone-id-1", "token-abc", "+56911112222", "Hola!");

    expect(ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.facebook.com/v21.0/phone-id-1/messages",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-abc",
          "Content-Type": "application/json",
        }),
      }),
    );
    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sentBody).toEqual({
      messaging_product: "whatsapp",
      to: "+56911112222",
      type: "text",
      text: { body: "Hola!" },
    });
  });

  it("returns false and logs when the Graph API responds with an error status", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Invalid access token",
      }),
    );

    const ok = await sendWhatsAppMessage("phone-id-1", "bad-token", "+56911112222", "Hola!");

    expect(ok).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error enviando mensaje WhatsApp",
      401,
      "Invalid access token",
    );
  });
});
