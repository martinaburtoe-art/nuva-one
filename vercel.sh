#!/bin/sh
set -eu

python3 <<'PY'
from pathlib import Path

path = Path('src/routes/index.tsx')
text = path.read_text(encoding='utf-8')

old_cta = '''            <a href="#how">
              <Button size="lg" variant="outline" className="h-12 px-6">
                Ver cómo funciona (2 min)
              </Button>
            </a>'''
new_cta = '''            <Link to="/demo">
              <Button size="lg" variant="outline" className="h-12 px-6 border-primary/30 bg-background/70 backdrop-blur">
                Ver demo interactiva <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>'''
text = text.replace(old_cta, new_cta, 1)

nav_marker = '''          <Link
            to="/foro"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Foro
          </Link>'''
nav_replacement = nav_marker + '''
          <Link
            to="/demo"
            className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            Visualizar Nüva
          </Link>'''
text = text.replace(nav_marker, nav_replacement, 1)

marker = 'function Pricing() {'
if 'function HomepageDemo()' not in text:
    block = r'''

function HomepageDemo() {
  return (
    <section className="border-y bg-secondary/20 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <Badge variant="secondary" className="mb-4 rounded-full border border-primary/20 bg-primary/5">
              Demo interactiva
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Mira Nüva One antes de crear tu cuenta.</h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Explora un negocio de ejemplo y descubre cómo se conectan ventas, inventario, finanzas, Nüva Score y la inteligencia artificial en una sola experiencia.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/demo"><Button size="lg" className="shadow-elegant">Explorar la demo <ArrowRight className="ml-1.5 h-4 w-4" /></Button></Link>
              <a href="#features"><Button size="lg" variant="outline">Ver funcionalidades</Button></a>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Datos ficticios</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Sin registro</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Navegación guiada</span>
            </div>
          </div>
          <Link to="/demo" className="group block">
            <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-2 shadow-elegant transition-transform duration-300 group-hover:-translate-y-1">
              <div className="overflow-hidden rounded-xl border bg-background">
                <div className="flex items-center gap-2 border-b bg-secondary/40 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
                  <div className="ml-2 flex-1 rounded-md border bg-background px-3 py-1 text-[10px] text-muted-foreground">nuva-one.vercel.app/demo</div>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between"><div><div className="text-[11px] text-muted-foreground">Resumen del negocio</div><div className="mt-1 text-lg font-semibold">Buenos días 👋</div></div><Badge variant="outline" className="border-success/30 text-success">Saludable</Badge></div>
                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[["Ingresos", "$4,82 M", "+18,4%"],["Flujo neto", "$1,36 M", "+9,2%"],["Inventario", "$2,14 M", "128 SKU"],["Nüva Score", "86/100", "+6 pts"]].map(([label, value, trend]) => (
                      <div key={label} className="rounded-xl border bg-card p-3"><div className="text-[10px] text-muted-foreground">{label}</div><div className="mt-1 text-sm font-semibold">{value}</div><div className="mt-1 text-[10px] text-success">{trend}</div></div>
                    ))}
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-[1.5fr_1fr]"><div className="rounded-xl border p-4"><div className="text-xs font-medium">Ingresos vs. gastos</div><div className="mt-4 flex h-24 items-end gap-1.5">{[35,48,43,62,57,73,68,86,78,95].map((h,i)=><div key={i} className="flex-1 rounded-t bg-gradient-primary opacity-80" style={{height:`${h}%`}} />)}</div></div><div className="rounded-xl border bg-primary/5 p-4"><div className="flex items-center gap-2 text-xs font-medium"><Sparkles className="h-3.5 w-3.5 text-primary" /> Nüva IA</div><p className="mt-3 text-[11px] leading-5 text-muted-foreground">Detecté 4 productos cerca de su punto de reposición.</p><div className="mt-3 rounded-lg bg-background/80 p-2 text-[10px]">Ver análisis →</div></div></div>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

function NuvaComparison() {
  const rows = [
    ["Ventas y clientes", "✓", "—", "Varias herramientas"],
    ["Inventario y stock", "✓", "Manual", "✓"],
    ["Finanzas y flujo", "✓", "Manual", "✓"],
    ["Cotizaciones", "✓", "Manual", "Parcial"],
    ["Nüva Score + indicadores", "✓", "—", "Parcial"],
    ["IA con datos del negocio", "✓", "—", "Depende del servicio"],
    ["Foro + red de contactos", "✓", "—", "—"],
    ["Todo conectado", "✓", "—", "—"],
  ];
  return (
    <section className="py-24" id="comparison">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center"><Badge variant="secondary" className="mb-4">Todo en uno</Badge><h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Menos herramientas. Más control.</h2><p className="mt-4 text-muted-foreground">La propuesta de Nüva One es simple: concentrar la operación de tu PYME y convertir sus datos en decisiones.</p></div>
        <div className="mt-12 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-elegant"><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead><tr className="border-b bg-secondary/40"><th className="px-5 py-4 text-left font-semibold">Lo que necesitas</th><th className="px-5 py-4 text-center font-semibold text-primary">Nüva One</th><th className="px-5 py-4 text-center font-semibold">Planillas</th><th className="px-5 py-4 text-center font-semibold">Herramientas separadas</th></tr></thead><tbody>{rows.map(([feature,nuva,sheets,tools],index)=><tr key={feature} className={index%2===0?"bg-background/60":"bg-card"}><td className="px-5 py-4 font-medium">{feature}</td><td className="px-5 py-4 text-center font-semibold text-primary">{nuva}</td><td className="px-5 py-4 text-center text-muted-foreground">{sheets}</td><td className="px-5 py-4 text-center text-muted-foreground">{tools}</td></tr>)}</tbody></table></div><div className="flex flex-col items-center justify-between gap-4 border-t bg-primary/5 px-5 py-5 sm:flex-row"><div><div className="font-semibold">¿Quieres verlo funcionando?</div><div className="text-sm text-muted-foreground">Entra a la demo con datos ficticios, sin crear una cuenta.</div></div><Link to="/demo"><Button className="shrink-0">Ver demo interactiva <ArrowRight className="ml-1.5 h-4 w-4" /></Button></Link></div></div>
      </div>
    </section>
  );
}
'''
    text = text.replace(marker, block + '\n' + marker, 1)

if 'function ConnectionsPreview()' not in text:
    connections = r'''

function ConnectionsPreview() {
  const connections = [
    { icon: MessageSquare, name: "WhatsApp", desc: "Asistente IA y atención basada en los datos de tu negocio." },
    { icon: Megaphone, name: "Meta Business", desc: "Conecta Instagram y Facebook para organizar tu presencia comercial." },
    { icon: CreditCard, name: "Stripe", desc: "Pagos y suscripciones integrados para la operación de Nüva One." },
    { icon: Workflow, name: "Automatizaciones", desc: "Conecta procesos y flujos para reducir tareas repetitivas." },
  ];
  return (
    <section className="border-y bg-secondary/20 py-20" id="connections">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-3">Conexiones</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Tu negocio no vive en una sola herramienta.</h2>
          <p className="mt-4 text-muted-foreground">Nüva One reúne los canales y procesos clave para que la información deje de estar dispersa.</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {connections.map((item) => (
            <Card key={item.name} className="border-border/60 p-6 transition-all hover:-translate-y-1 hover:shadow-elegant">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground"><item.icon className="h-5 w-5" /></div>
              <h3 className="mt-4 font-semibold">{item.name}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.desc}</p>
            </Card>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border bg-card p-5 sm:flex-row">
          <div><div className="font-semibold">Una operación conectada, no otra colección de apps.</div><p className="mt-1 text-sm text-muted-foreground">Explora el producto y revisa qué conexiones están disponibles para tu negocio.</p></div>
          <Link to="/demo"><Button variant="outline" className="shrink-0">Visualizar Nüva <ArrowRight className="ml-1.5 h-4 w-4" /></Button></Link>
        </div>
      </div>
    </section>
  );
}

function PymeNewsPreview() {
  const news = [
    { source: "Sercotec", date: "26 ago 2026", title: "Programa Hazlo con IA llega a Sercotec para acercar el uso de la Inteligencia Artificial a las pymes", url: "https://www.sercotec.cl/noticias/" },
    { source: "Sercotec", date: "24 ago 2026", title: "Gobierno lanza nuevo fondo concursable de $2.500 millones para impulsar la empleabilidad", url: "https://www.sercotec.cl/noticias/" },
    { source: "SII", date: "1 sep 2026", title: "Nueva Declaración Jurada N°1965 para creadores y empresas de contenido digital desde Operación Renta 2027", url: "https://www.sii.cl/noticias/2026/010926noti02pcr.htm" },
  ];
  return (
    <section className="py-20" id="news">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="secondary" className="mb-3">Actualidad PYME</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Lo que está pasando también importa.</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">Noticias y cambios oficiales que pueden afectar la operación, digitalización y crecimiento de una PYME en Chile.</p>
          </div>
          <a href="https://www.sercotec.cl/noticias/" target="_blank" rel="noreferrer"><Button variant="outline">Ver más noticias <ArrowRight className="ml-1.5 h-4 w-4" /></Button></a>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {news.map((item) => (
            <a key={item.title} href={item.url} target="_blank" rel="noreferrer" className="group block rounded-2xl border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-elegant">
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground"><span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">{item.source}</span><span>{item.date}</span></div>
              <h3 className="mt-5 line-clamp-3 text-base font-semibold leading-6 transition-colors group-hover:text-primary">{item.title}</h3>
              <div className="mt-6 flex items-center text-sm font-medium text-primary">Leer noticia <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1" /></div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
'''
    text = text.replace('function Pricing() {', connections + '\nfunction Pricing() {', 1)

text = text.replace('<BusinessNetworkPreview />', '<BusinessNetworkPreview />\n        <ConnectionsPreview />\n        <PymeNewsPreview />', 1)
text = text.replace('<ProductShowcase />', '<ProductShowcase />\n      <HomepageDemo />', 1)
text = text.replace('<Pricing />', '<NuvaComparison />\n      <Pricing />', 1)
path.write_text(text, encoding='utf-8')
PY

npx prettier --write src/routes/index.tsx
npm run build
