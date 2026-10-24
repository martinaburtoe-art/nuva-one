/**
 * Cliente mínimo REST para la API de la Base de Datos Estadísticos (BDE) del
 * Banco Central de Chile — arsenal lote 1 (2026-10-24), decisión ADOPTAR #21
 * del TECH_RADAR.
 *
 * Endpoint oficial (documentación BDE, consultada 2026-10-24):
 *   https://si3.bcentral.cl/SieteRestWS/SieteRestWS.ashx
 *     ?token=<API_KEY_TOKEN>&function=GetSeries
 *     &timeseries=<código>&firstdate=YYYY-MM-DD&lastdate=YYYY-MM-DD
 * Respuesta (JSON): { Codigo, Descripcion, Series: { Obs: [
 *   { indexDateString: "DD-MM-YYYY", value: "<número>", statusCode: "OK" } ] } }
 * GetSeries admite UNA serie por llamada.
 *
 * RESTRICCIÓN DE USO: solo server-side. El token (env `BCENTRAL_TOKEN`) no
 * debe llegar jamás a código de navegador; este módulo importa `node:process`
 * de forma explícita, así que un bundle de cliente falla en build (fails
 * closed) en vez de exponer la credencial.
 *
 * ⛔ BLOCKED (integración real): requiere cuenta BDE del Banco Central y token
 * API generado por el usuario en "Mi Cuenta" (si3.bcentral.cl → Web Services
 * → Ayuda y soporte). Sin ese token no se puede validar contra el servicio
 * real; la suite `bcentral.test.ts` usa fetch 100% mockeado (sin red, sin
 * token). Próximo paso al desbloquear: función server-side que cachee
 * UF/UTM/USD en Supabase (ver docs/arsenal/2026-10-24-batch1.md §6).
 */
import { env } from "node:process";

export const BCENTRAL_SERIES = {
  /** Unidad de Fomento (diaria). */
  uf: "F073.UFF.PRE.Z.D",
  /** Unidad Tributaria Mensual (mensual). */
  utm: "F073.UTR.PRE.Z.M",
  /** Dólar observado (diaria). */
  usd: "F073.TCO.PRE.Z.D",
} as const;

export type BcentralSeriesKey = keyof typeof BCENTRAL_SERIES;

export type BcentralObservation = {
  /** Fecha ISO `YYYY-MM-DD` (normalizada desde `DD-MM-YYYY` del BCCh). */
  date: string;
  value: number;
  statusCode: string;
};

export class BcentralError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "BcentralError";
    this.status = status;
  }
}

/** `fetch` inyectable: la suite de tests pasa un mock; producción usa el global. */
export type BcentralFetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

export type BcentralClientOptions = {
  /** Por defecto, `env.BCENTRAL_TOKEN`. */
  token?: string;
  /** Para tests o proxies; por defecto, el endpoint oficial del BCCh. */
  baseUrl?: string;
  /** Timeout en ms (por defecto 8000). `<= 0` desactiva el timeout. */
  timeoutMs?: number;
  /** Por defecto, el `fetch` global. */
  fetchImpl?: BcentralFetchLike;
};

export type BcentralRange = {
  firstDate?: Date;
  lastDate?: Date;
};

export type BcentralClient = {
  getSeries(
    series: BcentralSeriesKey,
    range?: BcentralRange,
  ): Promise<BcentralObservation[]>;
  /** Última observación disponible en una ventana de ~35 días (cubre series mensuales como UTM). */
  getLatest(
    series: BcentralSeriesKey,
  ): Promise<BcentralObservation | null>;
};

const DEFAULT_BASE_URL = "https://si3.bcentral.cl/SieteRestWS/SieteRestWS.ashx";
const DEFAULT_TIMEOUT_MS = 8_000;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** `indexDateString` del BCCh es `DD-MM-YYYY` → ISO `YYYY-MM-DD`. */
function normalizeDate(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(raw);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : raw;
}

/**
 * El BCCh entrega `value` como string. Ejemplos oficiales usan punto decimal
 * ("1.5"), pero los formatos chilenos usan coma decimal ("37.658,71").
 * Heurística: coma → formato chileno (quitar miles, coma→punto); solo punto →
 * decimal. Valores no numéricos ("NA") → NaN (omitidos por el cliente).
 */
function parseValue(raw: unknown): number {
  if (typeof raw === "number") return raw;
  if (typeof raw !== "string") return Number.NaN;
  const trimmed = raw.trim();
  // Number("") === 0: el vacío debe ser inválido, no un 0 silencioso.
  if (trimmed === "") return Number.NaN;
  if (trimmed.includes(",")) return Number(trimmed.replace(/\./g, "").replace(",", "."));
  return Number(trimmed);
}

type BcentralRawObservation = {
  indexDateString?: unknown;
  value?: unknown;
  statusCode?: unknown;
};

type BcentralRawResponse = {
  Codigo?: unknown;
  Descripcion?: unknown;
  Series?: {
    Obs?: BcentralRawObservation[];
    obs?: BcentralRawObservation[];
  };
};

export function createBcentralClient(
  options: BcentralClientOptions = {},
): BcentralClient {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl: BcentralFetchLike = options.fetchImpl ?? fetch;

  async function getSeries(
    series: BcentralSeriesKey,
    range?: BcentralRange,
  ): Promise<BcentralObservation[]> {
    const token = options.token ?? env.BCENTRAL_TOKEN;
    if (!token) {
      throw new BcentralError(
        "Falta el token del Banco Central: define env BCENTRAL_TOKEN (cuenta BDE requerida — integración real BLOCKED)",
      );
    }

    const url = new URL(baseUrl);
    url.searchParams.set("token", token);
    url.searchParams.set("function", "GetSeries");
    url.searchParams.set("timeseries", BCENTRAL_SERIES[series]);
    if (range?.firstDate) {
      url.searchParams.set("firstdate", toIsoDate(range.firstDate));
    }
    if (range?.lastDate) {
      url.searchParams.set("lastdate", toIsoDate(range.lastDate));
    }

    let response: Response;
    try {
      response = await fetchImpl(url.toString(), {
        signal: timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : undefined,
      });
    } catch (error) {
      if (error instanceof BcentralError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new BcentralError(
        `Fallo de red contra el Banco Central (${timeoutMs}ms de timeout): ${message}`,
      );
    }

    if (!response.ok) {
      throw new BcentralError(
        `Banco Central respondió HTTP ${response.status}`,
        response.status,
      );
    }

    const body = (await response.json()) as BcentralRawResponse;
    if (body.Codigo !== 0) {
      throw new BcentralError(
        `Banco Central rechazó la consulta: Codigo=${String(body.Codigo)} Descripcion=${String(body.Descripcion)}`,
      );
    }

    const observations = body.Series?.Obs ?? body.Series?.obs ?? [];
    return observations
      .map((observation) => ({
        date: normalizeDate(observation.indexDateString),
        value: parseValue(observation.value),
        statusCode:
          typeof observation.statusCode === "string" ? observation.statusCode : "",
      }))
      .filter((observation) => Number.isFinite(observation.value));
  }

  async function getLatest(
    series: BcentralSeriesKey,
  ): Promise<BcentralObservation | null> {
    const lastDate = new Date();
    const firstDate = new Date(lastDate.getTime() - 35 * 24 * 60 * 60 * 1000);
    const observations = await getSeries(series, { firstDate, lastDate });
    return observations.length > 0
      ? observations[observations.length - 1]
      : null;
  }

  return { getSeries, getLatest };
}
