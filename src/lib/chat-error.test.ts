import { describe, it, expect } from "vitest";
import { extractChatErrorMessage } from "./chat-error";

describe("extractChatErrorMessage", () => {
  it("extracts the error field from a clean JSON body", () => {
    expect(extractChatErrorMessage('{"error":"No autenticado"}')).toBe("No autenticado");
  });

  it("extracts the error field even with a leading prefix", () => {
    expect(extractChatErrorMessage('Error: {"error":"No autenticado"}')).toBe("No autenticado");
  });

  it("passes through a plain, non-JSON message untouched", () => {
    expect(extractChatErrorMessage("Failed to fetch")).toBe("Failed to fetch");
  });

  it("never surfaces raw unparsed JSON to the user", () => {
    expect(extractChatErrorMessage("{not valid json")).toBe(
      "Error al conectar con el asistente. Intenta nuevamente.",
    );
  });

  it("falls back on empty/undefined input", () => {
    expect(extractChatErrorMessage(undefined)).toBe(
      "Error al conectar con el asistente. Intenta nuevamente.",
    );
  });
});
