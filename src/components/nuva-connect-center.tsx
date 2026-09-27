import { useMemo, useState } from "react";
import { ArrowUpRight, CheckCircle2, ChevronRight, CircleDot, ExternalLink, Link2, RefreshCw, ShieldCheck, Webhook } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NUVA_CONNECT_CATEGORIES, NUVA_CONNECT_INTEGRATIONS, getNuvaIntegrationStatusLabel, getNuvaIntegrationStatusTone, type NuvaIntegration } from "@/lib/nuva-connect-ecosystem";

function statusIcon(status: NuvaIntegration["status"]) {
  if (status === "base_ready") return <CheckCircle2 className="h-4 w-4" />;
  if (status === "configuration_required") return <CircleDot className="h-4 w-4" />;
  return <ChevronRight className="h-4 w-4" />;
}

function IntegrationCard({ integration }: { integration: NuvaIntegration }) {
  const [showDetails, setShowDetails] = useState(false);
  return (
    <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-elegant">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Link2 className="h-4 w-4" /></div>
              <CardTitle className="text-base">{integration.name}</CardTitle>
            </div>
            <CardDescription className="leading-5">{integration.description}</CardDescription>
          </div>
          <Badge variant={getNuvaIntegrationStatusTone(integration.status)} className="shrink-0 gap-1">
            {statusIcon(integration.status)} {getNuvaIntegrationStatusLabel(integration.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1.5">{integration.syncs.map((item) => <Badge key={item} variant="outline" className="font-normal">{item}</Badge>)}</div>
        {showDetails && (
          <div className="mt-4 space-y-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            <div><span className="font-medium text-foreground">Dirección:</span> {integration.direction === "bidirectional" ? "entrada y salida" : integration.direction === "in" ? "entrada" : "salida"}</div>
            <div><span className="font-medium text-foreground">Autenticación:</span> {integration.modes.join(" · ")}</div>
            <div><span className="font-medium text-foreground">Prioridad:</span> {integration.priority === "core" ? "núcleo" : integration.priority === "regional" ? "Chile / regional" : "ecosistema extendido"}</div>
          </div>
        )}
        <div className="mt-5 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowDetails((value) => !value)}>{showDetails ? "Ocultar detalle" : "Ver detalle"}</Button>
          <a href={integration.officialUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">Documentación <ExternalLink className="h-3 w-3" /></a>
        </div>
      </CardContent>
    </Card>
  );
}

export function NuvaConnectCenter() {
  const [category, setCategory] = useState<"all" | NuvaIntegration["category"]>("all");
  const filtered = useMemo(() => category === "all" ? NUVA_CONNECT_INTEGRATIONS : NUVA_CONNECT_INTEGRATIONS.filter((item) => item.category === category), [category]);
  const baseReady = NUVA_CONNECT_INTEGRATIONS.filter((item) => item.status === "base_ready").length;
  const needsConfig = NUVA_CONNECT_INTEGRATIONS.filter((item) => item.status === "configuration_required").length;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
        <CardContent className="p-6 md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr] lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/70 px-3 py-1 text-xs font-medium text-primary"><ShieldCheck className="h-3.5 w-3.5" /> Nüva Connect</div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Nüva One se conecta con el ecosistema del negocio.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Las aplicaciones externas no reemplazan los módulos de Nüva: alimentan una única operación. Productos, pedidos, clientes, caja, finanzas y logística convergen en Nüva Intelligence y en el Agent Council.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-background/70 p-4"><div className="text-2xl font-semibold">{NUVA_CONNECT_INTEGRATIONS.length}</div><div className="text-xs text-muted-foreground">conectores definidos</div></div>
              <div className="rounded-xl border bg-background/70 p-4"><div className="text-2xl font-semibold">{baseReady}</div><div className="text-xs text-muted-foreground">base lista</div></div>
              <div className="rounded-xl border bg-background/70 p-4"><div className="text-2xl font-semibold">{needsConfig}</div><div className="text-xs text-muted-foreground">requieren credenciales</div></div>
              <div className="rounded-xl border bg-background/70 p-4"><div className="text-2xl font-semibold">1</div><div className="text-xs text-muted-foreground">modelo de conexión</div></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex items-start gap-3"><Webhook className="mt-0.5 h-4 w-4 text-primary" /><div><p className="text-sm font-medium">Eventos</p><p className="text-xs text-muted-foreground">Webhooks entran a Nüva y se convierten en eventos normalizados.</p></div></div>
            <div className="flex items-start gap-3"><RefreshCw className="mt-0.5 h-4 w-4 text-primary" /><div><p className="text-sm font-medium">Sincronización</p><p className="text-xs text-muted-foreground">Nüva evita duplicar catálogos, clientes e inventario.</p></div></div>
            <div className="flex items-start gap-3"><ArrowUpRight className="mt-0.5 h-4 w-4 text-primary" /><div><p className="text-sm font-medium">Acción</p><p className="text-xs text-muted-foreground">Los resultados vuelven a la operación y quedan disponibles para inteligencia.</p></div></div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={category} onValueChange={(value) => setCategory(value as typeof category)}>
        <TabsList className="h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="all">Todas</TabsTrigger>
          {NUVA_CONNECT_CATEGORIES.map((item) => <TabsTrigger key={item.id} value={item.id}>{item.label}</TabsTrigger>)}
        </TabsList>
        <TabsContent value={category} className="mt-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((integration) => <IntegrationCard key={integration.id} integration={integration} />)}</div>
        </TabsContent>
      </Tabs>

      <div className="rounded-xl border border-dashed p-5">
        <p className="text-sm font-medium">Modelo de seguridad</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">Los secretos de terceros no se guardan en el navegador ni en las tablas operativas. La conexión definitiva se ejecutará server-side, con scopes mínimos, aislamiento por negocio, auditoría y revocación independiente por proveedor.</p>
        <div className="mt-3 flex flex-wrap gap-2"><Badge variant="outline">tenant-scoped</Badge><Badge variant="outline">server-side</Badge><Badge variant="outline">least privilege</Badge><Badge variant="outline">audit trail</Badge></div>
      </div>
    </div>
  );
}
