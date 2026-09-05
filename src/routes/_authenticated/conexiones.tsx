import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CreditCard, MessageCircle, Receipt, Sparkles, Workflow } from "lucide-react";
import { PageHeader } from "@/components/page-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/conexiones")({
  head: () => ({ meta: [{ title: "Conexiones e integraciones — Nüva One" }] }),
  component: Conexiones,
});

type Connection = {
  title: string;
  description: string;
  status: string;
  href: "/automations" | "/billing" | "/settings";
  icon: typeof MessageCircle;
};

const CONNECTIONS: Connection[] = [
  {
    title: "WhatsApp Business + IA",
    description:
      "Vincula el número de tu negocio para consultas automáticas de stock y precios, además de recordatorios y atención asistida por IA.",
    status: "Disponible",
    href: "/automations",
    icon: MessageCircle,
  },
  {
    title: "Automatizaciones",
    description:
      "Conecta eventos de tu operación con acciones automáticas y flujos de trabajo para reducir tareas repetitivas.",
    status: "Disponible",
    href: "/automations",
    icon: Workflow,
  },
  {
    title: "Facturación SII",
    description:
      "Accede al módulo de facturación electrónica y centraliza el flujo tributario de tu negocio dentro de Nüva One.",
    status: "Disponible",
    href: "/billing",
    icon: Receipt,
  },
  {
    title: "Cobros y suscripción",
    description:
      "Gestiona el plan y la facturación de Nüva One desde el espacio de billing de tu cuenta.",
    status: "Disponible",
    href: "/billing",
    icon: CreditCard,
  },
];

function Conexiones() {
  return (
    <div>
      <PageHeader
        title="Conexiones"
        description="Un solo lugar para gestionar las integraciones que conectan Nüva One con tu operación."
      />

      <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">Tu negocio, conectado</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Las conexiones no sustituyen los módulos existentes: los reúnen en un punto de entrada
              claro y mantienen sus permisos, configuración y flujos originales.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {CONNECTIONS.map((connection) => {
          const Icon = connection.icon;
          return (
            <Link key={connection.title} to={connection.href} className="group block">
              <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-elegant">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-lg">{connection.title}</CardTitle>
                    </div>
                    <Badge variant="secondary">{connection.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">{connection.description}</p>
                  <div className="mt-5 flex items-center gap-1 text-sm font-medium text-primary">
                    Abrir conexión <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
