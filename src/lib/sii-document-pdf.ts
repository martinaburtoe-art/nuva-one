import { generateSiiDeclarationPdf, type PendingSaleForDeclaration } from "@/lib/sii-declaration-pdf";

type Business = { name?: string | null; logo_url?: string | null; tax_id?: string | null };

type SiiDocument = {
  id: string;
  tipo_dte?: number | null;
  folio?: number | null;
  receptor_rut?: string | null;
  receptor_name?: string | null;
  net_amount?: number | null;
  iva_amount?: number | null;
  total?: number | null;
  created_at?: string | null;
};

const labels: Record<number, string> = { 33: "Factura electrónica", 34: "Factura exenta", 39: "Boleta electrónica", 41: "Boleta exenta" };

function downloadBase64(base64: string, filename: string) {
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Generates a clearly-labelled internal backup when the official SII PDF was not attached. */
export async function downloadSiiDocumentBackup(document: SiiDocument, sale: any | undefined, business: Business) {
  const total = Number(document.total ?? sale?.total ?? 0);
  const payload: PendingSaleForDeclaration = {
    id: document.folio ? `Folio ${document.folio}` : document.id,
    sale_date: document.created_at ?? sale?.sale_date ?? new Date().toISOString(),
    customer_name: document.receptor_name ?? sale?.customer_name ?? "Consumidor final",
    total,
  };
  const base64 = await generateSiiDeclarationPdf([payload], business);
  const type = labels[Number(document.tipo_dte)] ?? "Documento tributario";
  const folio = document.folio ? String(document.folio) : document.id.slice(0, 8);
  downloadBase64(base64, `respaldo-${type.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-folio-${folio}.pdf`);
}

export function downloadOfficialSiiPdf(base64: string, document: SiiDocument) {
  const type = labels[Number(document.tipo_dte)] ?? "documento-tributario";
  const folio = document.folio ? String(document.folio) : document.id.slice(0, 8);
  downloadBase64(base64, `${type.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}-folio-${folio}-sii.pdf`);
}
