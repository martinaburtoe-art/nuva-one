import { jsPDF } from "jspdf";

export type ShippingLabelData = {
  businessName: string;
  businessTaxId?: string | null;
  businessAddress?: string | null;
  businessComuna?: string | null;
  businessPhone?: string | null;
  businessEmail?: string | null;
  carrier?: string | null;
  serviceType?: string | null;
  trackingNumber?: string | null;
  referenceCode?: string | null;
  recipientName: string;
  recipientRut?: string | null;
  recipientPhone?: string | null;
  recipientEmail?: string | null;
  recipientContact?: string | null;
  destinationAddress?: string | null;
  destinationComuna?: string | null;
  destinationCity?: string | null;
  destinationRegion?: string | null;
  destinationPostalCode?: string | null;
  destinationCountry?: string | null;
  packageCount?: number | null;
  weightKg?: number | null;
  contentDescription?: string | null;
  declaredValue?: number | null;
  paymentType?: string | null;
  notes?: string | null;
};

const clean = (value?: string | number | null) => String(value ?? "").trim();
const money = (value?: number | null) =>
  value == null || Number.isNaN(Number(value))
    ? ""
    : new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(value));

function wrap(doc: jsPDF, text: string, width: number, fontSize = 9) {
  doc.setFontSize(fontSize);
  return doc.splitTextToSize(text || "—", width) as string[];
}

function field(doc: jsPDF, title: string, value: string, x: number, y: number, width: number, height: number, size = 9) {
  doc.setDrawColor(220, 224, 230);
  doc.setFillColor(248, 249, 251);
  doc.roundedRect(x, y, width, height, 2.5, 2.5, "FD");
  doc.setTextColor(105, 112, 122);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text(title.toUpperCase(), x + 4, y + 5);
  doc.setTextColor(25, 29, 35);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(size);
  doc.text(wrap(doc, value || "—", width - 8, size).slice(0, 3), x + 4, y + 12, { lineHeightFactor: 1.15 });
}

export function generateShippingLabelPdf(data: ShippingLabelData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [105, 148] });
  const W = 105;
  const M = 6;
  const inner = W - M * 2;

  doc.setFillColor(18, 22, 28);
  doc.rect(0, 0, W, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("NÜVA ONE · ETIQUETA LOGÍSTICA", M, 7);
  doc.setFontSize(14);
  doc.text(clean(data.businessName) || "Empresa", M, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const meta = [data.businessTaxId && `RUT ${data.businessTaxId}`, data.businessComuna, data.businessPhone].filter(Boolean).join(" · ");
  doc.text(meta.slice(0, 88), M, 20);

  doc.setTextColor(25, 29, 35);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text((clean(data.carrier) || "ENVÍO NACIONAL").toUpperCase(), M, 31);
  doc.setFontSize(18);
  doc.text("DESTINO", M, 39);
  doc.setFontSize(12);
  doc.text(wrap(doc, clean(data.recipientName) || "Destinatario pendiente", inner - 42, 12).slice(0, 2), M, 47, { lineHeightFactor: 1.05 });

  const payment = clean(data.paymentType) === "collect" ? "POR PAGAR" : "PAGADO";
  doc.setFillColor(18, 22, 28);
  doc.roundedRect(76, 29, 23, 12, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6);
  doc.text(payment, 87.5, 36, { align: "center" });
  doc.setTextColor(25, 29, 35);

  const address = [data.destinationAddress, data.destinationComuna, data.destinationCity, data.destinationRegion, data.destinationPostalCode && `CP ${data.destinationPostalCode}`].filter(Boolean).join(", ");
  field(doc, "Dirección de entrega", address, M, 55, inner, 25, 10);

  field(doc, "Teléfono", clean(data.recipientPhone), M, 84, 30, 17, 9);
  field(doc, "RUT", clean(data.recipientRut), M + 33, 84, 30, 17, 9);
  field(doc, "Comuna", clean(data.destinationComuna), M + 66, 84, 33, 17, 9);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(105, 112, 122);
  doc.text("DATOS DE CONTROL", M, 107);
  doc.setTextColor(25, 29, 35);
  doc.setFontSize(8.5);
  const control = [
    data.trackingNumber && `TRACKING / OT: ${data.trackingNumber}`,
    data.referenceCode && `REFERENCIA: ${data.referenceCode}`,
    data.serviceType && `SERVICIO: ${data.serviceType}`,
    data.packageCount && `BULTOS: ${data.packageCount}`,
    data.weightKg != null && `PESO: ${data.weightKg} kg`,
  ].filter(Boolean);
  doc.text(control.slice(0, 4).join("   ·   ").slice(0, 92), M, 113);

  doc.setDrawColor(210, 214, 220);
  doc.line(M, 118, W - M, 118);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(105, 112, 122);
  const footer = [data.contentDescription && `Contenido: ${data.contentDescription}`, data.declaredValue != null && `Valor declarado: ${money(data.declaredValue)}`, data.notes && `Obs.: ${data.notes}`].filter(Boolean).join(" · ");
  doc.text(wrap(doc, footer || "Etiqueta de identificación logística", inner, 6.5).slice(0, 2), M, 123, { lineHeightFactor: 1.1 });
  doc.setFontSize(5.5);
  doc.text("Etiqueta auxiliar Nüva One. La OT/etiqueta oficial del transportista prevalece cuando corresponda.", M, 142);

  const fileBase = (clean(data.recipientName) || "destinatario").replace(/[^a-z0-9áéíóúñü -]/gi, "").trim().replace(/\s+/g, "-").toLowerCase();
  doc.save(`nuva-one-etiqueta-${fileBase || "envio"}.pdf`);
}
