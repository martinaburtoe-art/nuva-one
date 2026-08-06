-- Reemplaza el flujo de facturación SII basado en API Key de un proveedor
-- pagado (OpenFactura/LibreDTE) por un modo "asistido" gratuito: Nüva One
-- arma el resumen de la venta con los datos exactos que pide el Portal
-- MiPyme del SII, el dueño del negocio emite ahí mismo (gratis, sin API),
-- y luego registra el folio real de vuelta en Nüva One para mantener su
-- historial de ventas facturadas completo y trazable.

ALTER TABLE public.billing_documents
  ADD COLUMN IF NOT EXISTS emission_mode TEXT NOT NULL DEFAULT 'manual'
    CHECK (emission_mode IN ('manual', 'api'));

COMMENT ON COLUMN public.billing_documents.emission_mode IS
  'manual = emitido a mano en el Portal MiPyme del SII y registrado aquí; api = emitido automáticamente vía un proveedor certificado (OpenFactura/LibreDTE).';

COMMENT ON COLUMN public.billing_documents.folio IS
  'Folio real entregado por el SII al emitir el documento (en modo manual, el que el usuario copia del portal MiPyme).';
