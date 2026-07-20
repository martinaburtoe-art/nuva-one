// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { downloadCsv } from "./export";

function captureCsvBlobText(): Promise<string> {
  return new Promise((resolve) => {
    const originalCreate = URL.createObjectURL;
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob: Blob | MediaSource) => {
      (blob as Blob).text().then(resolve);
      return "blob:mock-url";
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    return originalCreate;
  });
}

describe("downloadCsv", () => {
  it("derives headers from row keys when no columns are given, and quotes fields containing commas", async () => {
    const textPromise = captureCsvBlobText();
    downloadCsv("ventas.csv", [{ name: "Juan, Pérez", total: 1000 }]);
    const csv = await textPromise;

    expect(csv).toContain('"Juan, Pérez"');
    expect(csv.startsWith("\ufeffname,total")).toBe(true);
  });

  it("escapes embedded quotes by doubling them (RFC 4180)", async () => {
    const textPromise = captureCsvBlobText();
    downloadCsv("productos.csv", [{ label: 'TV 55" LED' }]);
    const csv = await textPromise;

    expect(csv).toContain('"TV 55"" LED"');
  });

  it("quotes fields containing newlines", async () => {
    const textPromise = captureCsvBlobText();
    downloadCsv("notas.csv", [{ note: "linea1\nlinea2" }]);
    const csv = await textPromise;

    expect(csv).toContain('"linea1\nlinea2"');
  });

  it("renders null/undefined as an empty field, not the literal string", async () => {
    const textPromise = captureCsvBlobText();
    downloadCsv("clientes.csv", [{ name: "Ana", phone: null, note: undefined }]);
    const csv = await textPromise;

    const dataLine = csv.split("\n")[1];
    expect(dataLine).toBe("Ana,,");
  });

  it("uses explicit column labels/order when provided, instead of row key order", async () => {
    const textPromise = captureCsvBlobText();
    downloadCsv(
      "custom.csv",
      [{ a: 1, b: 2 }],
      [
        { key: "b", label: "Segunda" },
        { key: "a", label: "Primera" },
      ],
    );
    const csv = await textPromise;
    const lines = csv.replace("\ufeff", "").split("\n");

    expect(lines[0]).toBe("Segunda,Primera");
    expect(lines[1]).toBe("2,1");
  });

  it("is a no-op when window is undefined (SSR guard)", () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error -- simulating an SSR environment on purpose
    delete globalThis.window;
    expect(() => downloadCsv("x.csv", [{ a: 1 }])).not.toThrow();
    globalThis.window = originalWindow;
  });
});
