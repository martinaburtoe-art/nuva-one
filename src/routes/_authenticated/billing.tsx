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
import { Receipt, Link2, Unlink, Download, Plus } from "lucide-react";
import { useBizList, fmtCLP } from "@/lib/biz-data";
import { useActiveBusiness, useMyRole, canWriteOperations } from "@/lib/use-business";
import { formatRut } from "@/lib/rut";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ title: "Facturación SII — Nüva One" }] }),
  component: BillingSii,
});

const DEMO_API_KEY = "928e15a2d14d4a6292345f04960f4bd3";

const tipoLabel: Record<number, string> = {
  39: "Boleta electrónica",
  41: "Boleta exenta",
  33: "Factura electrónica",
  34: "Factura exenta",
};

type Integration = {
  status: string;
  provider: string;
  environment: "dev" | "prod";
  rut: string | null;
  razon_social: string | null;
};

const FISCAL_PROVIDERS = [
  { value: "openfactura", label: "OpenFactura (Haulmer)" },
  { value: "libredte", label: "LibreDTE" },
] as const;

function ConnectionCard() {
  const { active } = useActiveBusiness();
  const { data: myRole } = useMyRole();
  const canWrite = canWriteOperations(myRole);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [provider, setProvider] = useState<string>("openfactura");
  const [apiKey, setApiKey] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [environment, setEnvironment] = useState<"dev" | "prod">("dev");

  const { data: integ, isLoading } = useQuery({
    enabled: !!active?.id,
    queryKey: ["billing_integrations", active?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_integrations" as any)
        .select("status, provider, environment, rut, razon_social")
        .eq("business_id", active!.id)
        .eq("type", "fiscal")
        .eq("status", "connected")
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Integration | null;
    },
  });
  const isConnected = integ?.status === "connected";

  async function connect() {
    if (!active || !apiKey.trim()) {
      toast.error("Pega tu API Key del proveedor elegido");
      return;
    }
    if (provider === "libredte" && !apiUrl.trim()) {
      toast.error("LibreDTE requiere la URL de tu API");
      return;
    }
    setSaving(true);
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    const res = await fetch("/api/billing/sii/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        business_id: active.id,
        provider,
        api_key: apiKey.trim(),
        api_url: apiUrl.trim() || undefined,
        environment,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      toast.error(json.error || "No se pudo conectar");
      return;
    }
    toast.success(`Conectado: ${json.razon_social ?? ""}`);
    qc.invalidateQueries({ queryKey: ["billing_integrations", active.id] });
    setOpen(false);
    setApiKey("");
    setApiUrl("");
  }

  async function disconnect() {
    if (!active || !integ) return;
    const { error } = await supabase
      .from("billing_integrations" as any)
      .update({ status: "disconnected", api_key: null })
      .eq("business_id", active.id)
      .eq("provider", integ.provider);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Cuenta desconectada");
    qc.invalidateQueries({ queryKey: ["billing_integrations", active.id] });
  }

  if (isLoading) return <Skeleton className="mb-6 h-24 w-full" />;

  return (
    <Card className="mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-primary/10 p-2 text-primary">
          <Receipt className="h-4 w-4" />
        </div>
        <div>
          {isConnected ? (
            <>
              <p className="text-sm font-medium">{integ?.razon_social ?? "Cuenta conectada"}</p>
              <p className="text-xs text-muted-foreground">
                RUT {formatRut(integ?.rut ?? "")} · Ambiente{" "}
                {integ?.environment === "prod" ? "Producción" : "Prueba"}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">Conecta tu proveedor de facturación electrónica</p>
              <p className="text-xs text-muted-foreground">
                Elige OpenFactura o LibreDTE y pega tu API Key (ya con tu certificado digital
                configurado ante el SII). Nüva One nunca ve ni guarda tu certificado, solo usa esta
                clave para emitir documentos en tu nombre.
              </p>
            </>
          )}
        </div>
      </div>
      {!canWrite ? null : isConnected ? (
        <Button variant="outline" size="sm" onClick={disconnect}>
          <Unlink className="mr-1.5 h-3.5 w-3.5" /> Desconectar
        </Button>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Link2 className="mr-1.5 h-3.5 w-3.5" /> Conectar facturación
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conectar proveedor de facturación</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="provider">Proveedor</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger id="provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FISCAL_PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="api_key">API Key</Label>
                <Input
                  id="api_key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Tu API Key"
                />
                {provider === "openfactura" && (
                  <button
                    type="button"
                    className="mt-1 text-xs text-primary underline"
                    onClick={() => {
                      setApiKey(DEMO_API_KEY);
                      setEnvironment("dev");
                    }}
                  >
                    Usar clave pública de prueba (CAF simulado, solo para probar)
                  </button>
                )}
              </div>
              {provider === "libredte" && (
                <div>
                  <Label htmlFor="api_url">URL de tu API LibreDTE</Label>
                  <Input
                    id="api_url"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    placeholder="https://tu-instancia.libredte.cl/api"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="environment">Ambiente</Label>
                <Select value={environment} onValueChange={(v: any) => setEnvironment(v)}>
                  <SelectTrigger id="environment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dev">Prueba (desarrollo)</SelectItem>
                    <SelectItem value="prod">Producción</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Nüva One no es asesor legal ni tributario: valida con tu contador los montos antes
                de emitir documentos reales en producción.
              </p>
              <Button className="w-full" onClick={connect} disabled={saving}>
                {saving ? "Conectando..." : "Conectar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

function EmitDialog({ integration }: { integration: Integration | null | undefined }) {
  const { active } = useActiveBusiness();
  const qc = useQueryClient();
  const { data: sales } = useBizList<any>("sales", { order: "sale_date" });
  const [open, setOpen] = useState(false);
  const [saleId, setSaleId] = useState<string>("");
  const [tipoDte, setTipoDte] = useState("39");
  const [rut, setRut] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [giro, setGiro] = useState("");
  const [emitting, setEmitting] = useState(false);

  const sale = useMemo(() => (sales ?? []).find((s) => s.id === saleId), [sales, saleId]);
  const requiresReceptor = tipoDte === "33" || tipoDte === "34";

  async function emit() {
    if (!active || !sale) {
      toast.error("Selecciona una venta");
      return;
    }
    const items = (Array.isArray(sale.items) ? sale.items : []).map((it: any) => ({
      name: it.name,
      qty: it.qty,
      price: it.price,
    }));
    if (items.length === 0) {
      toast.error("Esa venta no tiene ítems");
      return;
    }
    if (requiresReceptor && (!rut.trim() || !razonSocial.trim())) {
      toast.error("La factura requiere RUT y razón social del receptor");
      return;
    }
    setEmitting(true);
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    const res = await fetch("/api/billing/sii/emit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        business_id: active.id,
        tipo_dte: Number(tipoDte),
        sale_id: sale.id,
        customer_id: sale.customer_id ?? null,
        items,
        receptor: requiresReceptor
          ? { rut: rut.trim(), name: razonSocial.trim(), giro: giro.trim() }
          : undefined,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setEmitting(false);
    if (!res.ok && res.status !== 207) {
      toast.error(json.error || "No se pudo emitir");
      return;
    }
    if (json.error) {
      toast.error(json.error);
    } else {
      toast.success("Documento emitido");
      setOpen(false);
    }
    qc.invalidateQueries({ queryKey: ["billing_documents", active.id] });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={integration?.status !== "connected"}>
          <Plus className="mr-1.5 h-4 w-4" /> Emitir documento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Emitir boleta o factura</DialogTitle>
        </DialogHeader>
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
                    {new Date(s.sale_date).toLocaleDateString("es-CL")} · {s.customer_name || "Sin cliente"} ·{" "}
                    {fmtCLP(Number(s.total))}
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
                <Input id="rs" value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="giro">Giro</Label>
                <Input id="giro" value={giro} onChange={(e) => setGiro(e.target.value)} />
              </div>
            </>
          )}
          <Button className="w-full" onClick={emit} disabled={emitting}>
            {emitting ? "Emitiendo..." : "Emitir"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function downloadPdf(base64: string, filename: string) {
  const byteChars = atob(base64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function BillingSii() {
  const { active } = useActiveBusiness();
  const { data: integ } = useQuery({
    enabled: !!active?.id,
    queryKey: ["billing_integrations", active?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_integrations" as any)
        .select("status, provider, environment, rut, razon_social")
        .eq("business_id", active!.id)
        .eq("type", "fiscal")
        .eq("status", "connected")
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Integration | null;
    },
  });
  const { data: docs, isLoading } = useBizList<any>("billing_documents", { order: "created_at" });

  return (
    <ModuleGuard module="billing">
      <div className="p-4 md:p-6">
        <PageHeader
          title="Facturación SII"
          description="Emite boletas y facturas electrónicas reales vía OpenFactura."
          action={<EmitDialog integration={integ} />}
        />

        <ConnectionCard />

        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : !docs || docs.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="Sin documentos emitidos"
            description="Conecta tu cuenta de OpenFactura y emite tu primera boleta o factura desde una venta."
          />
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Folio</TableHead>
                  <TableHead>Receptor</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-sm">
                      {new Date(d.created_at).toLocaleDateString("es-CL")}
                    </TableCell>
                    <TableCell className="text-sm">{tipoLabel[d.tipo_dte] ?? d.tipo_dte}</TableCell>
                    <TableCell className="text-sm">{d.folio ?? "—"}</TableCell>
                    <TableCell className="text-sm">{d.receptor_name || "Consumidor final"}</TableCell>
                    <TableCell className="text-right">{fmtCLP(Number(d.total))}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          d.status === "emitted"
                            ? "bg-success/15 text-success"
                            : "bg-destructive/15 text-destructive"
                        }`}
                      >
                        {d.status === "emitted" ? "Emitido" : "Error"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {d.pdf_base64 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => downloadPdf(d.pdf_base64, `documento-${d.folio ?? d.id}.pdf`)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </ModuleGuard>
  );
}
