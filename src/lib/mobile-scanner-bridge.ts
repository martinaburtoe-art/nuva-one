import { supabase } from '@/integrations/supabase/client';

export type MobileScannerSession = {
  sessionId: string;
  businessId: string;
  pairCode?: string;
  expiresAt: string;
};

export type MobileScannerEvent = {
  id: string;
  session_id: string;
  business_id: string;
  code: string;
  normalized_code: string;
  input_type: 'camera' | 'native' | 'hid';
  client_event_id: string;
  created_at: string;
};

export async function createMobileScannerSession(businessId: string): Promise<MobileScannerSession> {
  const { data, error } = await supabase.rpc('create_mobile_scanner_session', { p_business_id: businessId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.session_id || !row?.pair_code) throw new Error('No se pudo crear la sesión del escáner móvil');
  return { sessionId: row.session_id, businessId, pairCode: row.pair_code, expiresAt: row.expires_at };
}

export async function pairMobileScanner(pairCode: string): Promise<MobileScannerSession> {
  const { data, error } = await supabase.rpc('pair_mobile_scanner', { p_pair_code: pairCode.trim() });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.session_id || !row?.business_id) throw new Error('Código de vinculación inválido o vencido');
  return { sessionId: row.session_id, businessId: row.business_id, expiresAt: row.expires_at };
}

export async function submitMobileScannerEvent(sessionId: string, code: string, inputType: MobileScannerEvent['input_type'] = 'camera') {
  const clientEventId = crypto.randomUUID();
  const { data, error } = await supabase.rpc('submit_mobile_scanner_event', {
    p_session_id: sessionId,
    p_code: code,
    p_client_event_id: clientEventId,
    p_input_type: inputType,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as MobileScannerEvent;
}

export function subscribeToMobileScanner(sessionId: string, onEvent: (event: MobileScannerEvent) => void) {
  const channel = supabase
    .channel(`mobile-scanner:${sessionId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'mobile_scanner_events',
      filter: `session_id=eq.${sessionId}`,
    }, (payload) => onEvent(payload.new as MobileScannerEvent))
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}

export async function revokeMobileScannerSession(sessionId: string) {
  const { error } = await supabase.rpc('revoke_mobile_scanner_session', { p_session_id: sessionId });
  if (error) throw error;
}
