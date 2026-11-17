import { supabase } from "@/integrations/supabase/client";

export type MobileScannerSession = {
  sessionId: string;
  businessId: string;
  pairCode?: string;
  expiresAt: string;
  activeModule?: string;
  operationId?: string | null;
  deviceName?: string;
};

export type MobileScannerEvent = {
  id: string;
  session_id: string;
  business_id: string;
  code: string;
  normalized_code: string;
  input_type: "camera" | "native" | "hid";
  client_event_id: string;
  created_at: string;
  module?: string;
  operation_id?: string | null;
};

export async function createMobileScannerSession(
  businessId: string,
): Promise<MobileScannerSession> {
  const { data, error } = await supabase.rpc("create_mobile_scanner_session", {
    p_business_id: businessId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.session_id || !row?.pair_code)
    throw new Error("No se pudo crear la sesión del escáner móvil");
  return {
    sessionId: row.session_id,
    businessId,
    pairCode: row.pair_code,
    expiresAt: row.expires_at,
  };
}

export async function pairMobileScanner(pairCode: string): Promise<MobileScannerSession> {
  const { data, error } = await supabase.rpc("pair_mobile_scanner", {
    p_pair_code: pairCode.trim(),
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.session_id || !row?.business_id)
    throw new Error("Código de vinculación inválido o vencido");
  const { data: context } = await (supabase as any)
    .from("mobile_scanner_sessions")
    .select("active_module,active_operation_id,device_name")
    .eq("id", row.session_id)
    .single();
  return {
    sessionId: row.session_id,
    businessId: row.business_id,
    expiresAt: row.expires_at,
    activeModule: context?.active_module ?? "pos",
    operationId: context?.active_operation_id ?? null,
    deviceName: context?.device_name ?? "Nüva Mobile",
  };
}

export async function submitMobileScannerEvent(
  sessionId: string,
  code: string,
  inputType: MobileScannerEvent["input_type"] = "camera",
  clientEventId = crypto.randomUUID(),
) {
  const { data, error } = await supabase.rpc("submit_mobile_scanner_event", {
    p_session_id: sessionId,
    p_code: code,
    p_client_event_id: clientEventId,
    p_input_type: inputType,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as MobileScannerEvent;
}

type PendingMobileScannerEvent = {
  clientEventId: string;
  sessionId: string;
  code: string;
  inputType: MobileScannerEvent["input_type"];
  queuedAt: string;
};

const MOBILE_SCANNER_OUTBOX_DB = "nuva-mobile-scanner-outbox";
const MOBILE_SCANNER_OUTBOX_STORE = "pending-events";

function openMobileScannerOutbox(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("Este navegador no permite guardar lecturas sin conexión."));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MOBILE_SCANNER_OUTBOX_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(MOBILE_SCANNER_OUTBOX_STORE)) {
        const store = db.createObjectStore(MOBILE_SCANNER_OUTBOX_STORE, { keyPath: "clientEventId" });
        store.createIndex("sessionId", "sessionId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("No se pudo abrir la bandeja local."));
    request.onblocked = () => reject(new Error("La bandeja local está ocupada por otra pestaña."));
  });
}

async function writeOutboxEvent(event: PendingMobileScannerEvent): Promise<void> {
  const db = await openMobileScannerOutbox();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(MOBILE_SCANNER_OUTBOX_STORE, "readwrite");
      transaction.objectStore(MOBILE_SCANNER_OUTBOX_STORE).put(event);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("No se pudo guardar la lectura local."));
      transaction.onabort = () => reject(transaction.error ?? new Error("Se canceló el guardado local."));
    });
  } finally {
    db.close();
  }
}

async function readOutboxEvents(sessionId: string): Promise<PendingMobileScannerEvent[]> {
  const db = await openMobileScannerOutbox();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(MOBILE_SCANNER_OUTBOX_STORE, "readonly");
      const request = transaction.objectStore(MOBILE_SCANNER_OUTBOX_STORE)
        .index("sessionId").getAll(IDBKeyRange.only(sessionId));
      request.onsuccess = () => resolve((request.result ?? []) as PendingMobileScannerEvent[]);
      request.onerror = () => reject(request.error ?? new Error("No se pudo leer la bandeja local."));
      transaction.onabort = () => reject(transaction.error ?? new Error("No se pudo leer la bandeja local."));
    });
  } finally {
    db.close();
  }
}

async function removeOutboxEvent(clientEventId: string): Promise<void> {
  const db = await openMobileScannerOutbox();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(MOBILE_SCANNER_OUTBOX_STORE, "readwrite");
      transaction.objectStore(MOBILE_SCANNER_OUTBOX_STORE).delete(clientEventId);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("No se pudo confirmar la lectura local."));
      transaction.onabort = () => reject(transaction.error ?? new Error("No se pudo confirmar la lectura local."));
    });
  } finally {
    db.close();
  }
}

export async function enqueueMobileScannerEvent(
  sessionId: string,
  code: string,
  inputType: MobileScannerEvent["input_type"] = "camera",
  clientEventId = crypto.randomUUID(),
): Promise<PendingMobileScannerEvent> {
  const event: PendingMobileScannerEvent = {
    clientEventId,
    sessionId,
    code: code.trim(),
    inputType,
    queuedAt: new Date().toISOString(),
  };
  if (!event.code) throw new Error("No se puede guardar una lectura vacía.");
  await writeOutboxEvent(event);
  return event;
}

export async function countPendingMobileScannerEvents(sessionId: string): Promise<number> {
  return (await readOutboxEvents(sessionId)).length;
}

/**
 * Delivers queued scans in FIFO order. The original clientEventId is reused so
 * a response lost after a successful server commit cannot increment inventory twice.
 * A failed event remains in IndexedDB and blocks later events from overtaking it.
 */
export async function flushMobileScannerOutbox(sessionId: string): Promise<number> {
  const pending = (await readOutboxEvents(sessionId))
    .sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
  let delivered = 0;
  for (const event of pending) {
    await submitMobileScannerEvent(
      event.sessionId,
      event.code,
      event.inputType,
      event.clientEventId,
    );
    await removeOutboxEvent(event.clientEventId);
    delivered += 1;
  }
  return delivered;
}

export function subscribeToMobileScanner(
  sessionId: string,
  onEvent: (event: MobileScannerEvent) => void,
) {
  const channel = supabase
    .channel(`mobile-scanner:${sessionId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "mobile_scanner_events",
        filter: `session_id=eq.${sessionId}`,
      },
      (payload) => onEvent(payload.new as MobileScannerEvent),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export async function revokeMobileScannerSession(sessionId: string) {
  const { error } = await supabase.rpc("revoke_mobile_scanner_session", {
    p_session_id: sessionId,
  });
  if (error) throw error;
}


export async function createMobileScannerSessionForOperation(
  businessId: string,
  module: "pos" | "inventory" | "receiving" | "picking" | "dispatch" | "returns" | "transfers",
  operationId: string,
): Promise<MobileScannerSession> {
  const { data, error } = await (supabase as any).rpc("create_mobile_scanner_session_for_operation", {
    p_business_id: businessId,
    p_module: module,
    p_operation_id: operationId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.session_id || !row?.pair_code) throw new Error("No se pudo generar el código de vinculación");
  return {
    sessionId: row.session_id,
    businessId,
    pairCode: row.pair_code,
    expiresAt: row.expires_at,
    activeModule: module,
    operationId,
  };
}

export async function setMobileScannerContext(
  sessionId: string,
  module: "pos" | "inventory" | "receiving" | "picking" | "dispatch" | "returns" | "transfers",
  operationId: string | null,
  deviceName?: string,
) {
  const { error } = await (supabase as any).rpc("set_mobile_scanner_context", {
    p_session_id: sessionId,
    p_module: module,
    p_operation_id: operationId,
    p_device_name: deviceName ?? null,
  });
  if (error) throw error;
}

export async function heartbeatMobileScannerSession(sessionId: string) {
  const { data, error } = await (supabase as any).rpc("heartbeat_mobile_scanner_session", {
    p_session_id: sessionId,
  });
  if (error) throw error;
  return data as string;
}

export function subscribeToMobileScannerOperation(
  operationId: string,
  module: string,
  onEvent: (event: MobileScannerEvent) => void,
) {
  const channel = supabase
    .channel(`mobile-operation:${module}:${operationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "mobile_scanner_events",
        filter: `operation_id=eq.${operationId}`,
      },
      (payload) => {
        const event = payload.new as MobileScannerEvent;
        if (event.module === module && event.operation_id === operationId) onEvent(event);
      },
    )
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}

/**
 * Replays inventory scanner events that were persisted by the phone but have not
 * yet been accepted into the stocktake ledger. The ledger's client_event_id is
 * the durable acknowledgement; Realtime is only a low-latency notification.
 */
export async function loadUnprocessedInventoryScannerEvents(
  stocktakeId: string,
): Promise<MobileScannerEvent[]> {
  const client = supabase as any;
  const [eventResult, ledgerResult] = await Promise.all([
    client.from("mobile_scanner_events")
      .select("id,session_id,business_id,code,normalized_code,input_type,client_event_id,created_at,module,operation_id")
      .eq("module", "inventory")
      .eq("operation_id", stocktakeId)
      .order("created_at", { ascending: true }),
    client.from("inventory_stocktake_scan_events")
      .select("client_event_id")
      .eq("stocktake_id", stocktakeId),
  ]);
  if (eventResult.error) throw eventResult.error;
  if (ledgerResult.error) throw ledgerResult.error;
  const accepted = new Set<string>((ledgerResult.data ?? []).map((row: { client_event_id: string }) => row.client_event_id));
  return ((eventResult.data ?? []) as MobileScannerEvent[])
    .filter(event => !accepted.has(event.client_event_id));
}
