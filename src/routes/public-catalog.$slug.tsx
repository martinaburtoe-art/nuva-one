import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Package, Phone, Mail, MessageCircle, Search } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/public-catalog/$slug")({
  loader: async ({ params }) => {
    const { data, error } = await supabase.rpc("get_public_catalog", { p_slug: params.slug });
    if (error) throw error;
    return data ?? [];
  },
  component: PublicCatalog,
});

function PublicCatalog() {
  const rows = Route.useLoaderData() as any[];
  const [query, setQuery] = useState("");
  const business = rows[0];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((p) => `${p.product_name ?? ""} ${p.product_sku ?? ""} ${p.product_category ?? ""}`.toLowerCase().includes(q));
  }, [rows, query]);

  if (!business) return <main className="grid min-h-screen place-items-center p-6"><Card className="max-w-md p-8 text-center"><h1 className="text-xl font-semibold">Catálogo no disponible</h1><p className="mt-2 text-sm text-muted-foreground">Este catálogo no existe o no está publicado.</p></Card></main>;

  const whatsapp = business.business_phone ? `https://wa.me/${String(business.business_phone).replace(/\D/g, "")}` : null;

  return <main className="min-h-screen bg-background"><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <header className="mb-8 flex flex-col gap-5 rounded-3xl border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">{business.business_logo_url ? <img src={business.business_logo_url} alt={business.business_name} className="h-16 w-16 rounded-2xl object-cover" /> : <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary"><Package className="h-7 w-7" /></div>}<div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Catálogo Nüva</p><h1 className="text-2xl font-bold">{business.business_name}</h1>{business.business_description && <p className="mt-1 max-w-xl text-sm text-muted-foreground">{business.business_description}</p>}</div></div>
      <div className="flex flex-wrap gap-2">{whatsapp && <a href={whatsapp} target="_blank" rel="noreferrer"><Button><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</Button></a>}{business.business_phone && <a href={`tel:${business.business_phone}`}><Button variant="outline"><Phone className="mr-2 h-4 w-4" />Llamar</Button></a>}{business.business_email && <a href={`mailto:${business.business_email}`}><Button variant="outline"><Mail className="mr-2 h-4 w-4" />Email</Button></a>}</div>
    </header>
    <div className="mb-6 flex items-center gap-2"><Search className="h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar productos…" className="max-w-md" /><Badge variant="outline">{filtered.length} productos</Badge></div>
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filtered.map((p) => <Card key={p.product_id} className="overflow-hidden"><div className="aspect-square bg-muted/30">{p.product_image_url ? <img src={p.product_image_url} alt={p.product_name} className="h-full w-full object-cover" loading="lazy" /> : <div className="grid h-full place-items-center text-muted-foreground"><Package className="h-10 w-10" /></div>}</div><div className="space-y-2 p-4">{p.product_category && <Badge variant="secondary">{p.product_category}</Badge>}<h2 className="font-semibold">{p.product_name}</h2><p className="text-lg font-bold">{new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(Number(p.product_price ?? 0))}</p><p className="text-xs text-muted-foreground">{p.available_stock} disponibles{p.product_sku ? ` · SKU ${p.product_sku}` : ""}</p></div></Card>)}</div>
  </div></main>;
}
