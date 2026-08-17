import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, Clock3, MapPin, Package, Truck } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/shipments')({
  component: ShipmentsPage,
})

type ShipmentStatus = 'Preparando' | 'En tránsito' | 'Entregado' | 'Atrasado'

const shipments: Array<{
  id: string
  customer: string
  order: string
  address: string
  carrier: string
  tracking: string
  eta: string
  status: ShipmentStatus
}> = [
  {
    id: 'ENV-001',
    customer: 'Cliente de ejemplo',
    order: '#1001',
    address: 'Dirección de entrega pendiente',
    carrier: 'Por asignar',
    tracking: '—',
    eta: 'Hoy',
    status: 'Preparando',
  },
  {
    id: 'ENV-002',
    customer: 'Cliente de ejemplo',
    order: '#1002',
    address: 'Dirección de entrega pendiente',
    carrier: 'Por asignar',
    tracking: '—',
    eta: 'Mañana',
    status: 'En tránsito',
  },
]

const statusStyles: Record<ShipmentStatus, string> = {
  Preparando: 'bg-amber-50 text-amber-700 border-amber-200',
  'En tránsito': 'bg-blue-50 text-blue-700 border-blue-200',
  Entregado: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Atrasado: 'bg-red-50 text-red-700 border-red-200',
}

function ShipmentsPage() {
  const summary = [
    { label: 'Por preparar', value: 1, icon: Package },
    { label: 'En tránsito', value: 1, icon: Truck },
    { label: 'Entregados', value: 0, icon: CheckCircle2 },
    { label: 'Atrasados', value: 0, icon: Clock3 },
  ]

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to="/dashboard" className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Volver al dashboard
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">Envíos & Entregas</h1>
          <p className="mt-1 text-muted-foreground">Gestiona el recorrido completo desde el pedido hasta la entrega.</p>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
          Flujo: Venta → Preparación → Despacho → En tránsito → Entrega
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{label}</span>
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-3 text-3xl font-semibold">{value}</div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border bg-card shadow-sm">
        <div className="border-b p-5">
          <h2 className="font-semibold">Operación de entregas</h2>
          <p className="mt-1 text-sm text-muted-foreground">Estados, trazabilidad y fechas comprometidas.</p>
        </div>
        <div className="divide-y">
          {shipments.map((shipment) => (
            <article key={shipment.id} className="grid gap-4 p-5 lg:grid-cols-[1.1fr_1fr_1.4fr_1fr_auto] lg:items-center">
              <div>
                <div className="font-medium">{shipment.id} · {shipment.order}</div>
                <div className="text-sm text-muted-foreground">{shipment.customer}</div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                {shipment.address}
              </div>
              <div className="text-sm">
                <div>{shipment.carrier}</div>
                <div className="text-muted-foreground">Seguimiento: {shipment.tracking}</div>
              </div>
              <div className="text-sm"><span className="text-muted-foreground">ETA:</span> {shipment.eta}</div>
              <span className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${statusStyles[shipment.status]}`}>{shipment.status}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
        <strong className="text-foreground">Siguiente conexión:</strong> esta vista queda preparada para enlazar cada envío con una venta, cliente, inventario y transportista reales. Los registros mostrados son demostrativos y no representan datos de clientes.
      </section>
    </main>
  )
}
