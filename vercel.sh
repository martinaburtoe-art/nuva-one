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

if 'from "@/components/landing-motion"' not in text:
    import_marker = 'import { PublicAiChatWidget } from "@/components/public-ai-chat-widget";'
    text = text.replace(import_marker, import_marker + '\nimport { LandingMotion } from "@/components/landing-motion";', 1)

if '<LandingMotion />' not in text:
    text = text.replace('      <Nav />\n      <main>', '      <Nav />\n      <LandingMotion />\n      <main>', 1)

marker = 'function Pricing() {'
if 'function HomepageDemo()' not in text:
    block = r'''

function HomepageDemo() {
  return (
    <section className="border-y bg-secondary/20 py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <Badge variant="secondary" className="mb-4 rounded-full border border-primary/20 bg-primary/5">Demo interactiva</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Mira Nüva One antes de crear tu cuenta.</h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">Explora un negocio de ejemplo y descubre cómo se conectan ventas, inventario, finanzas, Nüva Score y la inteligencia artificial en una sola experiencia.</p>
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
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" /><span className="h-2.5 w-2.5 rounded-full bg-warning/60" /><span className="h-2.5 w-2.5 rounded-full bg-success/60" />
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

text = text.replace('<ProductShowcase />', '<ProductShowcase />\n      <HomepageDemo />', 1)
text = text.replace('<Pricing />', '<NuvaComparison />\n      <Pricing />', 1)
path.write_text(text, encoding='utf-8')
PY

npx prettier --write src/routes/index.tsx src/components/landing-motion.tsx
npm run build
