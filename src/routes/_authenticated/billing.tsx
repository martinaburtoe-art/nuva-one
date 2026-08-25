import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModuleGuard } from "@/components/module-guard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Receipt,
  Download,
  Copy,
  ExternalLink,
  ClipboardCheck,
  FileCheck2,
  FileDown,
  Package,
  FileText,
} from "lucide-react";
import { useBizList, fmtCLP } from "@/lib/biz-data";
import { useActiveBusiness } from "@/lib/use-business";
import { formatRut, rutForSii } from "@/lib/rut";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  generateSiiDeclarationPdf,
  type PendingSaleForDeclaration,
} from "@/lib/sii-declaration-pdf";
import { downloadSiiReadyPack } from "@/lib/sii-pack";
import { downloadOfficialSiiPdf, downloadSiiDocumentBackup } from "@/lib/sii-document-pdf";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ title: "Facturación SII — Nüva One" }] }),
  component: BillingSii,
});

const tipoLabel: Record<number, string> = {
  39: "Boleta electrónica",
  41: "Boleta exenta",
  33: "Factura electrónica",
  34: "Factura exenta",
};
const REQUIRE_RECEPTOR = new Set(["33", "34"]);

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

function InfoCard() {
  return (
    <Card className="mb-6 flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
          <Receipt className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-medium">Modo asistido — gratis y legal</p>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground">
            Nüva One arma el resumen de tu venta con los datos exactos que pide el{" "}
            <strong>Portal MiPyme del SII</strong> (100% gratuito). Tú lo pegas y emites ahí tu
            boleta o factura, y luego registras el folio real aquí para mantener tu historial
            completo.
          </p>
        </div>
      </div>
      <a
        href="https://www.sii.cl/servicios_online/1039-1183.html"
        target="_blank"
        rel="noreferrer"
        className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
      >
        Abrir Portal SII <ExternalLink className="h-3 w-3" />
      </a>
    </Card>
  );
}

function PendingDeclarationCard() {
  const { active } = useActiveBusiness();
  const qc = useQueryClient();
  const { data: sales } = useBizList<any>("sales", { order: "sale_date" });
  const { data: docs } = useBizList<any>("billing_documents", { order: "created_at" });
  const [downloading, setDownloading] = useState(false);
  const [packDownloading, setPackDownloading] = useState(false);
  const [declaring, setDeclaring] = useState(false);
  const declaredSaleIds = useMemo(
    () => new Set((docs ?? []).map((d: any) => d.sale_id).filter(Boolean)),
    [docs],
  );
  const pending = useMemo<PendingSaleForDeclaration[]>(
    () =>
      (sales ?? [])
        .filter((s: any) => s.status === "paid" && !declaredSaleIds.has(s.id))
        .map((s: any) => ({
          id: s.id,
          sale_date: s.sale_date,
          customer_name: s.customer_name,
          total: Number(s.total),
        })),
    [sales, declaredSaleIds],
  );
  const pendingTotal = pending.reduce((sum, s) => sum + s.total, 0);
  async function handleDownload() {
    if (!active || !pending.length) return;
    setDownloading(true);
    try {
      const base64 = await generateSiiDeclarationPdf(pending, active);
      const raw = atob(base64);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expediente-sii-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error("No se pudo generar el documento");
    } finally {
      setDownloading(false);
    }
  }
  async function handlePackDownload() {
    if (!active || !pending.length) return;
    setPackDownloading(true);
    try {
      await downloadSiiReadyPack(pending, active);
      toast.success("Pack SII Ready descargado", {
        description: "Incluye expediente PDF, CSV estructurado, checklist y guía de control.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo generar el pack SII Ready");
    } finally {
      setPackDownloading(false);
    }
  }
  async function handleDeclare() {
    if (!active || !pending.length) return;
    const ok = window.confirm(
      `Vas a marcar ${pending.length} venta(s) por ${fmtCLP(pendingTotal)} como declaradas en el SII. Hazlo solo después de emitir cada boleta/factura en el Portal MiPyme.`,
    );
    if (!ok) return;
    setDeclaring(true);
    const { error } = await supabase.from("billing_documents" as any).insert(
      pending.map((s) => ({
        business_id: active.id,
        sale_id: s.id,
        tipo_dte: 39,
        environment: "prod",
        status: "emitted",
        emission_mode: "manual",
        total: s.total,
        net_amount: Math.round(s.total / 1.19),
        iva_amount: s.total - Math.round(s.total / 1.19),
      })),
    );
    setDeclaring(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Lote declarado — las ventas ya no aparecerán como pendientes");
    qc.invalidateQueries({ queryKey: ["billing_documents", active.id] });
  }
  if (!pending.length) return null;
  return (
    <Card className="mb-6 p-5">
      <div>
        <p className="text-sm font-medium">Pendientes por declarar en el SII</p>
        <p className="text-xs text-muted-foreground">
          {pending.length} venta(s) pagada(s) sin documento registrado · {fmtCLP(pendingTotal)} en
          total. Prepara el expediente, decláralas en el Portal MiPyme y luego registra el folio
          real.
        </p>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Button variant="outline" onClick={handlePackDownload} disabled={packDownloading}>
          <Package className="mr-1.5 h-4 w-4" />
          {packDownloading ? "Preparando pack..." : "Descargar Pack SII Ready"}
        </Button>
        <Button variant="outline" onClick={handleDownload} disabled={downloading}>
          <FileDown className="mr-1.5 h-4 w-4" />
          {downloading ? "Generando..." : "Solo PDF"}
        </Button>
        <Button onClick={handleDeclare} disabled={declaring}>
          <FileCheck2 className="mr-1.5 h-4 w-4" />
          {declaring ? "Guardando..." : "Ya lo declaré ✓"}
        </Button>
      </div>
      <div className="mt-3 rounded-xl border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <strong className="text-foreground">Pack SII Ready:</strong> expediente PDF profesional +
        CSV estructurado + checklist de revisión + guía de control. No es un DTE emitido ni una
        validación oficial del SII.
      </div>
    </Card>
  );
}

type Step = "prepare" | "register";
function SiiAssistDialog() {
  const { active } = useActiveBusiness();
  const qc = useQueryClient();
  const { data: sales } = useBizList<any>("sales", { order: "sale_date" });
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("prepare");
  const [saleId, setSaleId] = useState("");
  const [tipoDte, setTipoDte] = useState("39");
  const [rut, setRut] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [giro, setGiro] = useState("");
  const [folio, setFolio] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const sale = useMemo(() => (sales ?? []).find((s: any) => s.id === saleId), [sales, saleId]);
  const requiresReceptor = REQUIRE_RECEPTOR.has(tipoDte);
  const items = useMemo(() => (Array.isArray(sale?.items) ? sale.items : []), [sale]);
  const grossTotal = sale ? Number(sale.total) : 0;
  const netAmount = Math.round(grossTotal / 1.19);
  const ivaAmount = grossTotal - netAmount;
  function resetAndClose() {
    setOpen(false);
    setStep("prepare");
    setSaleId("");
    setTipoDte("39");
    setRut("");
    setRazonSocial("");
    setGiro("");
    setFolio("");
    setPdfFile(null);
  }
  function buildSummaryText() {
    return [
      `Tipo de documento: ${tipoLabel[Number(tipoDte)]}`,
      requiresReceptor ? `RUT receptor: ${rut || "—"}` : null,
      requiresReceptor ? `Razón social receptor: ${razonSocial || "—"}` : null,
      requiresReceptor ? `Giro receptor: ${giro || "—"}` : null,
      "",
      "Ítems:",
      ...items.map(
        (it: any) =>
          `- ${it.name} · Cantidad: ${it.qty} · Precio unit.: ${fmtCLP(Number(it.price))}`,
      ),
      "",
      `Monto neto: ${fmtCLP(netAmount)}`,
      `IVA (19%): ${fmtCLP(ivaAmount)}`,
      `Monto total: ${fmtCLP(grossTotal)}`,
    ]
      .filter((l): l is string => l !== null)
      .join("\n");
  }
  async function copySummary() {
    try {
      await navigator.clipboard.writeText(buildSummaryText());
      toast.success("Resumen copiado — pégalo en el Portal MiPyme del SII");
    } catch {
      toast.error("No se pudo copiar. Selecciona y copia el texto manualmente.");
    }
  }
  function goToRegister() {
    if (!sale) {
      toast.error("Selecciona una venta");
      return;
    }
    if (requiresReceptor && (!rut.trim() || !razonSocial.trim())) {
      toast.error("La factura requiere RUT y razón social del receptor");
      return;
    }
    setStep("register");
  }
  async function registerFolio() {
    if (!active || !sale) return;
    if (!folio.trim() || Number.isNaN(Number(folio))) {
      toast.error("Ingresa el folio que te entregó el SII");
      return;
    }
    setSaving(true);
    let pdf_base64: string | null = null;
    if (pdfFile) {
      try {
        pdf_base64 = await fileToBase64(pdfFile);
      } catch {
        toast.error("No se pudo leer el PDF, se guardará sin él");
      }
    }
    const { error } = await supabase.from("billing_documents" as any).insert({
      business_id: active.id,
      sale_id: sale.id,
      customer_id: sale.customer_id ?? null,
      tipo_dte: Number(tipoDte),
      folio: Number(folio),
      environment: "prod",
      status: "emitted",
      emission_mode: "manual",
      receptor_rut: requiresReceptor ? rutForSii(rut) : null,
      receptor_name: requiresReceptor ? razonSocial.trim() : null,
      net_amount: netAmount,
      iva_amount: ivaAmount,
      total: grossTotal,
      pdf_base64,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Folio registrado — venta marcada como facturada");
    qc.invalidateQueries({ queryKey: ["billing_documents", active.id] });
    resetAndClose();
  }
  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : resetAndClose())}>
      <DialogTrigger asChild>
        <Button>
          <Receipt className="mr-1.5 h-4 w-4" /> Facturar venta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === "prepare" ? "1. Preparar para el Portal SII" : "2. Registrar folio emitido"}
          </DialogTitle>
        </DialogHeader>
        {step === "prepare" ? (
          <div className="space-y-4">
            <div>
              <Label>Tipo de documento</Label>
              <Select value={tipoDte} onValueChange={setTipoDte}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="39">Boleta electrónica</SelectItem>
                  <SelectItem value="41">Boleta exenta</SelectItem>
                  <SelectItem value="33">Factura electrónica</SelectItem>
                  <SelectItem value="34">Factura exenta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Venta</Label>
              <Select value={saleId} onValueChange={setSaleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una venta" />
                </SelectTrigger>
                <SelectContent>
                  {(sales ?? []).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {new Date(s.sale_date).toLocaleDateString("es-CL")} ·{" "}
                      {s.customer_name || "Sin cliente"} · {fmtCLP(Number(s.total))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {requiresReceptor && (
              <>
                <div>
                  <Label htmlFor="rut">RUT del receptor</Label>
                  <Input
                    id="rut"
                    value={rut}
                    onChange={(e) => setRut(formatRut(e.target.value))}
                    placeholder="76.123.456-7"
                    maxLength={12}
                  />
                </div>
                <div>
                  <Label htmlFor="rs">Razón social</Label>
                  <Input
                    id="rs"
                    value={razonSocial}
                    onChange={(e) => setRazonSocial(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="giro">Giro</Label>
                  <Input id="giro" value={giro} onChange={(e) => setGiro(e.target.value)} />
                </div>
              </>
            )}
            {sale && (
              <div className="space-y-2">
                <Label>Resumen para pegar en el Portal MiPyme</Label>
                <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-xs">
                  {buildSummaryText()}
                </pre>
                <Button variant="outline" className="w-full" onClick={copySummary}>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copiar resumen
                </Button>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Abre el Portal MiPyme del SII en otra pestaña, pega estos datos y emite tu documento.
              Cuando el SII te entregue el folio, vuelve aquí y presiona "Ya lo emití".
            </p>
            <Button className="w-full" onClick={goToRegister} disabled={!sale}>
              Ya lo emití en el SII →
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Ingresa el folio que te entregó el Portal MiPyme del SII para dejar esta venta marcada
              como facturada en tu historial.
            </p>
            <div>
              <Label htmlFor="folio">Folio SII</Label>
              <Input
                id="folio"
                type="number"
                value={folio}
                onChange={(e) => setFolio(e.target.value)}
                placeholder="Ej: 1254"
              />
            </div>
            <div>
              <Label htmlFor="pdf">PDF oficial del documento (opcional)</Label>
              <Input
                id="pdf"
                type="file"
                accept="application/pdf"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Si adjuntas el PDF emitido por el SII, Nüva lo conservará como documento oficial
                adjunto.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("prepare")}>
                ← Volver
              </Button>
              <Button className="flex-1" onClick={registerFolio} disabled={saving}>
                <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
                {saving ? "Guardando..." : "Guardar folio"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BillingSii() {
  const { data: docs, isLoading } = useBizList<any>("billing_documents", { order: "created_at" });
  const { active } = useActiveBusiness();
  const { data: sales } = useBizList<any>("sales", { order: "sale_date" });
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const saleById = useMemo(() => new Map((sales ?? []).map((s: any) => [s.id, s])), [sales]);
  async function handleBackup(d: any) {
    if (!active) return;
    setDownloadingId(d.id);
    try {
      await downloadSiiDocumentBackup(d, saleById.get(d.sale_id), active);
      toast.success("Respaldo PDF profesional descargado", {
        description:
          "Es una representación interna de respaldo; el DTE oficial es el PDF emitido por el SII.",
      });
    } catch {
      toast.error("No se pudo generar el respaldo PDF");
    } finally {
      setDownloadingId(null);
    }
  }
  return (
    <ModuleGuard module="billing">
      <div className="p-4 md:p-6">
        <PageHeader
          title="Facturación SII"
          description="Emite boletas y facturas gratis en el Portal MiPyme del SII y lleva tu historial aquí."
          action={<SiiAssistDialog />}
        />
        <InfoCard />
        <PendingDeclarationCard />
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !docs || docs.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Sin documentos registrados"
            description='Presiona "Facturar venta" para preparar tu primer documento y registrar el folio.'
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="border-b bg-muted/20 px-5 py-4">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Documentos tributarios registrados</p>
                  <p className="text-xs text-muted-foreground">
                    Cada documento tiene descarga directa. Si no se adjuntó el PDF oficial del SII,
                    puedes generar un respaldo interno claramente identificado.
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Folio</TableHead>
                    <TableHead>Receptor</TableHead>
                    <TableHead className="text-right">Neto</TableHead>
                    <TableHead className="text-right">IVA</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Documento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-sm">
                        {new Date(d.created_at).toLocaleDateString("es-CL")}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {tipoLabel[d.tipo_dte] ?? d.tipo_dte}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">{d.folio ?? "—"}</TableCell>
                      <TableCell className="text-sm">
                        {d.receptor_name || "Consumidor final"}
                        {d.receptor_rut && (
                          <div className="text-[11px] text-muted-foreground">{d.receptor_rut}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtCLP(Number(d.net_amount ?? 0))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtCLP(Number(d.iva_amount ?? 0))}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {fmtCLP(Number(d.total ?? 0))}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {d.pdf_base64 ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadOfficialSiiPdf(d.pdf_base64, d)}
                              title="Descargar PDF oficial adjunto"
                            >
                              <Download className="mr-1 h-3.5 w-3.5" />
                              PDF oficial
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleBackup(d)}
                              disabled={downloadingId === d.id}
                              title="Generar respaldo PDF profesional"
                            >
                              <FileDown className="mr-1 h-3.5 w-3.5" />
                              {downloadingId === d.id ? "Generando..." : "Descargar respaldo"}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="border-t bg-muted/20 px-5 py-3 text-[11px] text-muted-foreground">
              Los documentos con <strong>PDF oficial</strong> contienen el archivo adjunto que fue
              emitido por el SII. Los <strong>respaldos</strong> son representaciones internas
              generadas por Nüva One y no reemplazan el DTE oficial, su timbre electrónico ni la
              validación del SII.
            </div>
          </Card>
        )}
      </div>
    </ModuleGuard>
  );
}
