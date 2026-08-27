import { Search, Command } from "lucide-react";
import { type ComponentType, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export function ModuleSearch({ items }: { items: readonly NavItem[] }) {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLocaleLowerCase("es-CL");
  const matches = useMemo(
    () =>
      normalized
        ? items.filter((item) => item.label.toLocaleLowerCase("es-CL").includes(normalized))
        : [],
    [items, normalized],
  );

  return (
    <div className="relative px-2 pb-2 pt-2">
      <Search
        className="pointer-events-none absolute left-4 top-5 h-3.5 w-3.5 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar módulo..."
        aria-label="Buscar módulo"
        className="h-9 w-full rounded-lg border border-sidebar-border bg-background/60 pl-8 pr-8 text-xs outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/30"
      />
      {!query && (
        <span className="pointer-events-none absolute right-4 top-[18px] hidden items-center gap-1 text-[9px] text-muted-foreground lg:flex">
          <Command className="h-3 w-3" /> K
        </span>
      )}
      {query && (
        <div className="absolute left-2 right-2 top-12 z-50 overflow-hidden rounded-xl border border-border bg-background p-1.5 shadow-xl">
          {matches.length > 0 ? (
            matches.slice(0, 8).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setQuery("")}
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-foreground transition-colors hover:bg-accent"
              >
                <item.icon className="h-3.5 w-3.5 text-primary" />
                <span>{item.label}</span>
              </Link>
            ))
          ) : (
            <div className="px-3 py-3 text-xs text-muted-foreground">No encontré ese módulo.</div>
          )}
        </div>
      )}
    </div>
  );
}
