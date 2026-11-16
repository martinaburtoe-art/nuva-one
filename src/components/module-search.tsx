import { Search, X } from "lucide-react";
import { type ComponentType, useMemo, useState } from "react";

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export function normalizeModuleSearch(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es-CL").trim();
}

export function searchModules<T extends NavItem>(items: readonly T[], query: string): T[] {
  const normalized = normalizeModuleSearch(query);
  if (!normalized) return [];
  return items.filter((item) => normalizeModuleSearch(item.label).includes(normalized));
}

export function ModuleSearch({ items, onSelect }: { items: readonly NavItem[]; onSelect?: (to: string) => void }) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => searchModules(items, query), [items, query]);

  return (
    <div className="relative px-2 pb-3 pt-2">
      <label className="sr-only" htmlFor="nuva-module-search">Buscar módulo</label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id="nuva-module-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setQuery("");
            if (event.key === "Enter" && matches.length === 1) {
              setQuery("");
              onSelect?.(matches[0].to);
            }
          }}
          placeholder="Buscar una función…"
          aria-label="Buscar módulo"
          aria-controls="nuva-module-search-results"
          aria-expanded={Boolean(query)}
          autoComplete="off"
          className="h-10 w-full rounded-xl border border-sidebar-border/80 bg-background/75 pl-10 pr-9 text-[13px] text-foreground outline-none transition-[border-color,box-shadow,background-color] placeholder:text-muted-foreground/80 focus:border-primary/60 focus:bg-background focus:ring-4 focus:ring-primary/10"
        />
        {query && (
          <button
            type="button"
            aria-label="Limpiar búsqueda"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {query && (
        <div
          id="nuva-module-search-results"
          className="absolute left-2 right-2 top-[3.35rem] z-50 overflow-hidden rounded-xl border border-border/80 bg-popover p-1.5 shadow-xl shadow-black/10"
        >
          <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground" aria-live="polite">
            {matches.length ? `${matches.length} funciones encontradas` : "Sin coincidencias"}
          </p>
          {matches.length > 0 ? (
            matches.slice(0, 8).map((item) => (
              <button
                key={item.to}
                type="button"
                onClick={() => { setQuery(""); onSelect?.(item.to); }}
                className="group flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/8 text-primary transition-colors group-hover:bg-primary/12">
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <span className="text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">Abrir</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              Prueba con otro nombre, por ejemplo “ventas” o “inventario”.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
