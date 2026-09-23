import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function PeopleBackLink() {
  return (
    <Link
      to="/people"
      aria-label="Volver al módulo principal de Nüva People"
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-border/70 bg-background px-3 text-sm font-medium text-foreground shadow-sm transition-[background-color,border-color,transform] duration-200 hover:-translate-y-px hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Volver a Nüva People
    </Link>
  );
}