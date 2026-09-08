import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Cloud,
  CreditCard,
  MessageCircle,
  Palette,
  Receipt,
  Sparkles,
  Workflow,
} from "lucide-react";
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
  status: "Disponible" | "Próximamente";
  href?: "/automations" | "/billing" | "/analytics" | "/settings";
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
      "Accede al flujo tributario integrado en Finanzas sin separar la facturación del resto de la gestión financiera.",
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
  {
    title: "Cal.com",
    description:
      "Agenda reuniones y citas dentro del flujo comercial: disponibilidad, reservas, confirmaciones y seguimiento.",
    status: "Próximamente",
    icon: CalendarDays,
  },
  {
    title: "n8n",
    description:
      "Orquesta automatizaciones avanzadas entre Nüva One y servicios externos mediante eventos y webhooks seguros.",
    status: "Próximamente",
    icon: Workflow,
  },
  {
    title: "Chatwoot",
    description:
      "Centraliza conversaciones y soporte, conectando contactos, conversaciones y eventos con el CRM de Nüva One.",
    status: "Próximamente",
    icon: MessageCircle,
  },
  {
    title: "PostHog",
    description:
      "Mide adopción, embudos, experiencia y errores con analítica de producto orientada a mejorar Nüva One.",
    status: "Próximamente",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    title: "Nextcloud",
    description:
      "Conecta documentos y archivos empresariales para que cotizaciones, comprobantes y respaldos permanezcan organizados.",
    status: "Próximamente",
    icon: Cloud,
  },
  {
    title: "Penpot",
    description:
      "Integra diseño y colaboración visual para campañas, marca y material comercial de las PYMEs.",
    status: "Próximamente",
    icon: Palette,
  },
];

function ConnectionCard({ connection }: { connection: Connection }) {
  const Icon = connection.icon;
  const content = (
    <Card
      className={`h-full transition-all ${
        connection.href ? "group-hover:-translate-y-0.5 group-hover:shadow-elegant" : "opacity-90"
      }`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg">{connection.title}</CardTitle>
          </div>
          <Badge variant={connection.status === "Disponible" ? "secondary" : "outline"}>
            {connection.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted-foreground">{connection.description}</p>
        {connection.href ? (
          <div className="mt-5 flex items-center gap-1 text-sm font-medium text-primary">
            Abrir conexión <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        ) : (
          <div className="mt-5 text-sm font-medium text-muted-foreground">Integración planificada</div>
        )}
      </CardContent>
    </Card>
  );

  return connection.href ? (
    <Link to={connection.href} className="group block">
      {content}
    </Link>
  ) : (
    <div className="block">{content}</div>
  );
}

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
              Las conexiones amplían los módulos existentes sin reemplazarlos. Cada integración futura
              deberá respetar permisos por negocio, autenticación server-side, trazabilidad y aislamiento de datos.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {CONNECTIONS.map((connection) => (
          <ConnectionCard key={connection.title} connection={connection} />
        ))}
      </div>
    </div>
  );
}
