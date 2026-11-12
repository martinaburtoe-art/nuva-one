/**
 * Tests unitarios del cliente Banco Central (arsenal lote 1).
 *
 * REGLA DEL LOTE: fetch 100% mockeado — cero llamadas de red, cero tokens
 * reales (la integración real está BLOCKED hasta que el usuario genere su
 * token BDE). Se ejercita: construcción de URL, normalización de fechas
 * DD-MM-YYYY→ISO, parsing de valores (punto/coma decimal), omisión de NA,
 * errores HTTP y de la API (`Codigo != 0`), timeout y fallback de token por
 * env.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BCENTRAL_SERIES,
  BcentralError,
  createBcentralClient,
  type BcentralFetchLike,
} from "./bcentral";

function mockResponse(body: unknown, init?: { ok?: boolean; status?: number }) {
  const ok = init?.ok ?? true;
  const status = init?.status ?? 200;
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

/** Respuesta oficial (formato documentación BDE REST). */
function bcentralBody(observations: Array<Record<string, unknown>>) {
  return {
    Codigo: 0,
    Descripcion: "Success",
    Series: {
      descripEsp: "Unidad de fomento (UF)",
      descripIng: "Unidad de fomento (UF)",
      seriesId: BCENTRAL_SERIES.uf,
      Obs: observations,
    },
  };
}

const bcentralObs = (
  indexDateString: string,
  value: string,
  statusCode = "OK",
) => ({ indexDateString, value, statusCode });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("bcentral — cliente REST Banco Central (fetch mockeado)", () => {
  it("construye la URL oficial con token, GetSeries, código de serie y rango ISO", async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        mockResponse(bcentralBody([])),
    );
    const client = createBcentralClient({
      token: "test-token-123",
      fetchImpl: fetchMock,
    });

    await client.getSeries("uf", {
      firstDate: new Date(Date.UTC(2026, 9, 1)),
      lastDate: new Date(Date.UTC(2026, 9, 15)),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://si3.bcentral.cl/SieteRestWS/SieteRestWS.ashx",
    );
    expect(parsed.searchParams.get("token")).toBe("test-token-123");
    expect(parsed.searchParams.get("function")).toBe("GetSeries");
    expect(parsed.searchParams.get("timeseries")).toBe("F073.UFF.PRE.Z.D");
    expect(parsed.searchParams.get("firstdate")).toBe("2026-10-01");
    expect(parsed.searchParams.get("lastdate")).toBe("2026-10-15");
  });

  it("normaliza fechas DD-MM-YYYY a ISO y convierte valores string a número", async () => {
    const fetchMock = vi.fn(
      async () =>
        mockResponse(
          bcentralBody([
            bcentralObs("01-10-2026", "38500,55"),
            bcentralObs("02-10-2026", "38501.25"),
          ]),
        ),
    );
    const client = createBcentralClient({
      token: "t",
      fetchImpl: fetchMock as unknown as BcentralFetchLike,
    });

    const observations = await client.getSeries("uf");

    expect(observations).toEqual([
      { date: "2026-10-01", value: 38500.55, statusCode: "OK" },
      { date: "2026-10-02", value: 38501.25, statusCode: "OK" },
    ]);
  });

  it("omite observaciones sin valor numérico (fines de semana / NA) sin fallar", async () => {
    const fetchMock = vi.fn(
      async () =>
        mockResponse(
          bcentralBody([
            bcentralObs("02-10-2026", "958.90"),
            bcentralObs("03-10-2026", "NA"),
            bcentralObs("04-10-2026", ""),
          ]),
        ),
    );
    const client = createBcentralClient({
      token: "t",
      fetchImpl: fetchMock as unknown as BcentralFetchLike,
    });

    const observations = await client.getSeries("usd");
    expect(observations).toHaveLength(1);
    expect(observations[0]).toEqual({
      date: "2026-10-02",
      value: 958.9,
      statusCode: "OK",
    });
  });

  it("lanza BcentralError cuando la API rechaza (Codigo != 0)", async () => {
    const fetchMock = vi.fn(
      async () =>
        mockResponse({ Codigo: 3, Descripcion: "Invalid token" }),
    );
    const client = createBcentralClient({
      token: "bad",
      fetchImpl: fetchMock as unknown as BcentralFetchLike,
    });

    await expect(client.getSeries("uf")).rejects.toMatchObject({
      name: "BcentralError",
      message: expect.stringContaining("Codigo=3"),
    });
  });

  it("lanza BcentralError con status HTTP cuando la respuesta no es ok", async () => {
    const fetchMock = vi.fn(
      async () => mockResponse({}, { ok: false, status: 503 }),
    );
    const client = createBcentralClient({
      token: "t",
      fetchImpl: fetchMock as unknown as BcentralFetchLike,
    });

    await expect(client.getSeries("uf")).rejects.toMatchObject({
      name: "BcentralError",
      status: 503,
    });
  });

  it("lanza BcentralError cuando falta el token (options y env ausentes)", async () => {
    vi.stubEnv("BCENTRAL_TOKEN", "");
    const client = createBcentralClient({
      fetchImpl: vi.fn() as unknown as BcentralFetchLike,
    });
    await expect(client.getSeries("uf")).rejects.toBeInstanceOf(BcentralError);
  });

  it("usa el token de env BCENTRAL_TOKEN cuando no viene por options", async () => {
    vi.stubEnv("BCENTRAL_TOKEN", "env-token-xyz");
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        mockResponse(bcentralBody([])),
    );
    const client = createBcentralClient({ fetchImpl: fetchMock });

    await client.getSeries("utm");
    const [url] = fetchMock.mock.calls[0];
    expect(new URL(url).searchParams.get("token")).toBe("env-token-xyz");
  });

  it("pasa un AbortSignal de timeout al fetch", async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        mockResponse(bcentralBody([])),
    );
    const client = createBcentralClient({
      token: "t",
      timeoutMs: 5_000,
      fetchImpl: fetchMock,
    });

    await client.getSeries("uf");
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect((init?.signal as AbortSignal).aborted).toBe(false);
  });

  it("getLatest devuelve la última observación de la ventana consultada", async () => {
    const fetchMock = vi.fn(
      async () =>
        mockResponse(
          bcentralBody([
            bcentralObs("01-09-2026", "66500"),
            bcentralObs("01-10-2026", "67000"),
          ]),
        ),
    );
    const client = createBcentralClient({
      token: "t",
      fetchImpl: fetchMock as unknown as BcentralFetchLike,
    });

    const latest = await client.getLatest("utm");
    expect(latest).toEqual({
      date: "2026-10-01",
      value: 67000,
      statusCode: "OK",
    });
  });
});
