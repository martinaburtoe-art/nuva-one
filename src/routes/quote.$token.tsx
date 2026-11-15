import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, CheckCircle2, XCircle, Loader2, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtCLP } from "@/lib/biz-data";
import { calculateQuoteLineNetAmount } from "@/lib/quote-calculations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/quote/$token")({
  head: () => ({ meta: [{ title: "Revisar cotización — Nüva One" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: SharedQuotePage,
});

type SharedQuote = {
  quote_number: number;
  customer_name: string;
  customer_snapshot: Record<string, string | null>;
  subject: string | null;
  items: Array<{ name: string; description?: string; qty: number; price: number; unit?: string }>;
  subtotal: number;
  discount_pct: number;
  tax: number;
  total: number;
  tax_treatment: string;
  vat_rate: number;
  price_basis: string;
  valid_until: string | null;
  notes: string | null;
  terms: string | null;
  status: string;
  issuer: { name?: string; tax_id?: string; giro?: string; address?: string; comuna?: string; logo_url?: string; public_contact_email?: string; public_contact_phone?: string };
};

function SharedQuotePage() {
  const { token } = Route.useParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [responseResult, setResponseResult] = useState<"accepted" | "rejected" | null>(null);
  const { data: quote, isLoading, isError } = useQuery({
    queryKey: ["shared-quote", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_shared_quote" as any, { p_token: token } as any);
      if (error) throw error;
      return (data ?? null) as unknown as SharedQuote | null;
    },
    retry: false,
  });
  const respond = useMutation({
    mutationFn: async (action: "accepted" | "rejected") => {
      if (!consent) throw new Error("Debes confirmar que revisaste la cotización y su versión.");
      const { data, error } = await supabase.rpc("respond_to_shared_quote" as any, {
        p_token: token,
        p_action: action,
        p_name: name.trim(),
        p_email: email.trim(),
        p_consent_text: "Confirmo que revisé esta cotización y respondo sobre la versión presentada en este enlace.",
      } as any);
      if (error) throw error;
      return data as { status: string; quote_number: number };
    },
    onSuccess: (result) => {
      setResponseResult(result.status as "accepted" | "rejected");
      toast.success(result.status === "accepted" ? "Cotización aceptada." : "Respuesta registrada.");
    },
    onError: (error: any) => toast.error(error?.message ?? "No se pudo registrar la respuesta."),
  });

  if (responseResult) return <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center p-6"><Card className="w-full p-8 text-center"><CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" /><h1 className="text-xl font-semibold">{responseResult === "accepted" ? "Cotización aceptada" : "Respuesta registrada"}</h1><p className="mt-2 text-sm text-muted-foreground">Tu respuesta quedó registrada correctamente. Puedes cerrar esta página; el negocio recibirá el estado actualizado.</p></Card></main>;
  if (isLoading) return <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center p-6"><Loader2 className="h-6 w-6 animate-spin" /><span className="ml-2 text-sm text-muted-foreground">Cargando cotización segura…</span></main>;
  if (isError || !quote) return <main className="mx-auto flex min-h-screen max-w-2xl items-center justify-center p-6"><Card className="w-full p-8 text-center"><FileText className="mx-auto mb-3 h-9 w-9 text-muted-foreground" /><h1 className="text-xl font-semibold">Este enlace ya no está disponible</h1><p className="mt-2 text-sm text-muted-foreground">Puede haber vencido, haber sido revocado o la cotización ya recibió una respuesta. Solicita un enlace actualizado al negocio.</p></Card></main>;

  const money = (value: number) => fmtCLP(Number(value) || 0);
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8 print:bg-white print:px-0 print:py-0 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="flex items-center gap-3">
          {quote.issuer?.logo_url && <img src={quote.issuer.logo_url} alt="" className="max-h-12 max-w-32 object-contain" />}
          <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Propuesta comercial de</p><h1 className="text-lg font-semibold">{quote.issuer?.name || "Empresa"}</h1><p className="text-xs text-muted-foreground">{[quote.issuer?.tax_id ? `RUT ${quote.issuer.tax_id}` : null, quote.issuer?.giro, quote.issuer?.address, quote.issuer?.comuna].filter(Boolean).join(" · ")}</p></div>
        </header>
        <Card className="overflow-hidden">
          <div className="border-b bg-background p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cotización</p><h2 className="mt-1 text-2xl font-bold">COT-{String(quote.quote_number).padStart(4, "0")}</h2><p className="mt-1 text-sm text-muted-foreground">{quote.subject || "Propuesta comercial"}</p></div><div className="text-right text-sm"><p className="text-muted-foreground">Válida hasta</p><p className="font-semibold">{quote.valid_until ? new Date(quote.valid_until + "T12:00:00").toLocaleDateString("es-CL") : "Sin fecha"}</p><Button className="mt-3 print:hidden" size="sm" variant="outline" onClick={() => window.print()}><Download className="mr-2 h-4 w-4" /> Guardar PDF</Button></div></div>
            <div className="mt-6 rounded-xl bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Preparada para</p><p className="font-semibold">{quote.customer_name}</p>{quote.customer_snapshot?.tax_id && <p className="text-xs text-muted-foreground">RUT: {quote.customer_snapshot.tax_id}</p>}</div>
          </div>
          <div className="p-6 sm:p-8">
            <h3 className="mb-3 font-semibold">Detalle de productos y servicios</h3>
            <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="py-2">Descripción</th><th className="py-2 text-right">Cant.</th><th className="py-2 text-right">{quote.tax_treatment === "taxable" ? "Precio unit. neto" : "Precio unitario"}</th><th className="py-2 text-right">Total</th></tr></thead><tbody>{(quote.items || []).map((item, index) => <tr key={index} className="border-b"><td className="py-3"><p className="font-medium">{item.name}</p>{item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}</td><td className="py-3 text-right tabular-nums">{item.qty}</td><td className="py-3 text-right tabular-nums">{money(Math.round(calculateQuoteLineNetAmount(item, quote.tax_treatment as any, Number(quote.vat_rate) || 19, quote.price_basis as any) / Number(item.qty)))}</td><td className="py-3 text-right tabular-nums">{money(calculateQuoteLineNetAmount(item, quote.tax_treatment as any, Number(quote.vat_rate) || 19, quote.price_basis as any))}</td></tr>)}</tbody></table></div>
            <div className="ml-auto mt-5 max-w-xs space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Subtotal neto</span><span>{money(quote.subtotal)}</span></div>{Number(quote.discount_pct) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Descuento ({quote.discount_pct}%)</span><span>-{money(Number(quote.subtotal) * Number(quote.discount_pct) / 100)}</span></div>}<div className="flex justify-between"><span className="text-muted-foreground">{quote.tax_treatment === "taxable" ? `IVA (${quote.vat_rate}%)` : quote.tax_treatment === "exempt" ? "Exenta de IVA" : "No afecta a IVA"}</span><span>{money(quote.tax)}</span></div><div className="flex justify-between border-t pt-3 text-lg font-bold"><span>Total CLP</span><span>{money(quote.total)}</span></div></div>
            {quote.notes && <section className="mt-7"><h3 className="font-semibold">Alcance y notas</h3><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{quote.notes}</p></section>}
            {quote.terms && <section className="mt-5"><h3 className="font-semibold">Condiciones comerciales</h3><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{quote.terms}</p></section>}
          </div>
        </Card>
        <Card className="space-y-4 p-6 print:hidden">
          <div><h3 className="text-lg font-semibold">Responder a la cotización</h3><p className="text-sm text-muted-foreground">Tu respuesta quedará asociada a esta cotización y a la versión mostrada. Este registro es una aceptación comercial simple; no es una firma electrónica avanzada.</p></div>
          <div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="shared-name">Nombre completo</Label><Input id="shared-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={160} /></div><div><Label htmlFor="shared-email">Correo electrónico</Label><Input id="shared-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} /></div></div>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" /><span>Confirmo que revisé el contenido y las condiciones de esta cotización antes de responder.</span></label>
          <div className="flex flex-wrap gap-2"><Button disabled={respond.isPending || !name.trim() || !email.trim() || !consent} onClick={() => respond.mutate("accepted")}><CheckCircle2 className="mr-2 h-4 w-4" /> Aceptar cotización</Button><Button variant="outline" disabled={respond.isPending || !name.trim() || !email.trim() || !consent} onClick={() => respond.mutate("rejected")}><XCircle className="mr-2 h-4 w-4" /> Rechazar</Button></div>
          <p className="text-xs text-muted-foreground">Documento comercial. No constituye factura ni DTE emitido ante el SII.</p>
        </Card>
        <footer className="pb-6 text-center text-xs text-muted-foreground print:hidden">{quote.issuer?.public_contact_email || quote.issuer?.public_contact_phone || ""} · Nüva One</footer>
      </div>
    </main>
  );
}
