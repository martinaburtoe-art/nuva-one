import { CalendarClock, ExternalLink, Info, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

const labels: Record<string, { title: string; category: string; help: string }> = {
  ordinary_weekly_hours: { title: "Jornada ordinaria semanal", category: "Jornada laboral", help: "Límite semanal de jornada ordinaria usado por remuneraciones." },
  uf_value_clp: { title: "Valor de la UF", category: "UF y topes", help: "Valor de referencia para topes previsionales expresados en UF." },
  crp_rate: { title: "Cotización con Rentabilidad Protegida", category: "Previsión", help: "Cotización de cargo del empleador asociada al Seguro Social Previsional." },
  employer_ssp_rate: { title: "Aporte empleador al Seguro Social Previsional", category: "Previsión", help: "Porcentaje de cargo del empleador destinado al Seguro Social Previsional." },
  employer_individual_additional_rate: { title: "Aporte individual adicional del empleador", category: "Previsión", help: "Cotización adicional de cargo del empleador." },
  ssp_protected_return_rate: { title: "Cotización con rentabilidad protegida", category: "Previsión", help: "Tasa usada por el motor de remuneraciones." },
  minimum_monthly_wage: { title: "Ingreso mínimo mensual", category: "Remuneraciones", help: "Ingreso mínimo mensual usado como referencia legal." },
  minimum_monthly_wage_18_65: { title: "Ingreso mínimo mensual · 18 a 65 años", category: "Remuneraciones", help: "Ingreso mínimo mensual para trabajadores de 18 a 65 años." },
  minimum_monthly_wage_under18_over65: { title: "Ingreso mínimo · menores de 18 y mayores de 65", category: "Remuneraciones", help: "Ingreso mínimo mensual aplicable a este grupo." },
  sis_rate: { title: "Seguro de Invalidez y Sobrevivencia (SIS)", category: "Previsión", help: "Tasa SIS utilizada en las cotizaciones previsionales." },
  pension_income_cap_uf: { title: "Tope imponible de pensiones", category: "Topes previsionales", help: "Tope mensual imponible para pensiones, expresado en UF." },
  unemployment_income_cap_uf: { title: "Tope imponible seguro de cesantía", category: "Topes previsionales", help: "Tope mensual imponible para seguro de cesantía, en UF." },
  health_rate: { title: "Cotización legal de salud", category: "Salud", help: "Porcentaje legal de cotización destinado a salud." },
  overtime_surcharge: { title: "Recargo de horas extraordinarias", category: "Jornada laboral", help: "Recargo legal mínimo de las horas extraordinarias." },
};

function formatValue(key: string, value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "Sin dato";
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (key === "uf_value_clp" || key.includes("wage")) return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: key === "uf_value_clp" ? 2 : 0 }).format(n);
  if (key.endsWith("_rate") || ["crp_rate", "employer_ssp_rate", "employer_individual_additional_rate", "ssp_protected_return_rate", "overtime_surcharge", "health_rate"].includes(key)) return `${(n * 100).toLocaleString("es-CL", { maximumFractionDigits: 2 })}%`;
  if (key.includes("weekly_hours")) return `${n.toLocaleString("es-CL", { maximumFractionDigits: 2 })} h`;
  if (key.endsWith("_uf")) return `${n.toLocaleString("es-CL", { maximumFractionDigits: 2 })} UF`;
  return n.toLocaleString("es-CL", { maximumFractionDigits: 2 });
}

function formatDate(value: string) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

export function PeopleLegalParameters({ params }: { params: any[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const current = params.filter((p) => p.effective_from <= today && (!p.effective_to || p.effective_to >= today));
  const upcoming = params.filter((p) => p.effective_from > today);
  const currentByKey = new Map<string, any>();
  [...current].sort((a, b) => String(b.effective_from).localeCompare(String(a.effective_from))).forEach((p) => { if (!currentByKey.has(p.parameter_key)) currentByKey.set(p.parameter_key, p); });
  const visible = [...currentByKey.values(), ...upcoming].sort((a, b) => String(b.effective_from).localeCompare(String(a.effective_from)));

  return <Card className="mt-5 overflow-hidden rounded-2xl border-border/70 shadow-sm">
    <div className="border-b bg-muted/20 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="rounded-xl border bg-background p-2.5"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></div>
          <div><h2 className="font-semibold">Parámetros legales</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Valores que utiliza Nüva People para calcular remuneraciones, expresados en lenguaje de negocio y con su vigencia.</p></div>
        </div>
        <div className="flex gap-2 text-xs"><span className="rounded-full border bg-background px-3 py-1.5">{currentByKey.size} vigentes</span>{upcoming.length > 0 && <span className="rounded-full border bg-indigo-500/10 px-3 py-1.5">{upcoming.length} programados</span>}</div>
      </div>
    </div>
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-sm"><thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Parámetro</th><th className="px-5 py-3 font-medium">Valor</th><th className="px-5 py-3 font-medium">Vigencia</th><th className="px-5 py-3 font-medium">Fuente</th></tr></thead>
        <tbody className="divide-y">{visible.map((p) => { const meta = labels[p.parameter_key] ?? { title: p.parameter_key.replaceAll("_", " "), category: "Otros", help: "Parámetro utilizado por el motor de remuneraciones." }; const isUpcoming = p.effective_from > today; return <tr key={p.id} className="transition hover:bg-muted/20"><td className="px-5 py-4"><div className="flex items-start gap-3"><div className="mt-0.5 rounded-lg border bg-muted/30 p-1.5"><Info className="h-3.5 w-3.5" /></div><div><p className="font-medium">{meta.title}</p><p className="mt-0.5 text-xs text-muted-foreground">{meta.category} · {meta.help}</p></div></div></td><td className="whitespace-nowrap px-5 py-4 font-semibold">{formatValue(p.parameter_key, p.value_numeric ?? p.value_text)}</td><td className="whitespace-nowrap px-5 py-4"><div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-muted-foreground" /><div><p className="font-medium">{isUpcoming ? "Programado desde" : "Vigente desde"} {formatDate(p.effective_from)}</p>{p.effective_to && <p className="text-xs text-muted-foreground">Hasta {formatDate(p.effective_to)}</p>}</div></div></td><td className="px-5 py-4"><div className="max-w-[220px]"><p className="truncate text-xs text-muted-foreground">{p.source_reference || p.notes || "Fuente no especificada"}</p>{p.source_url && <a href={p.source_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-500 hover:underline">Ver fuente <ExternalLink className="h-3 w-3" /></a>}</div></td></tr>; })}</tbody>
      </table>
    </div>
    <div className="divide-y md:hidden">{visible.map((p) => { const meta = labels[p.parameter_key] ?? { title: p.parameter_key.replaceAll("_", " "), category: "Otros", help: "Parámetro utilizado por el motor de remuneraciones." }; return <div key={p.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{meta.title}</p><p className="mt-1 text-xs text-muted-foreground">{meta.category}</p></div><span className="font-semibold">{formatValue(p.parameter_key, p.value_numeric ?? p.value_text)}</span></div><p className="mt-3 text-xs text-muted-foreground">{meta.help}</p><p className="mt-3 text-xs text-muted-foreground">Vigencia: {formatDate(p.effective_from)}{p.effective_to ? ` → ${formatDate(p.effective_to)}` : ""}</p>{p.source_url && <a href={p.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-500">Ver fuente <ExternalLink className="h-3 w-3" /></a>}</div>; })}</div>
    <div className="border-t bg-muted/10 px-5 py-3 text-xs text-muted-foreground">Los identificadores técnicos se mantienen fuera de la vista operativa y quedan disponibles en el registro técnico.</div>
  </Card>;
}
