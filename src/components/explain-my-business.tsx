import { useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness } from "@/lib/use-business";
import { Sparkles, Loader2, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Insight = {
  signal: "critico" | "alerta" | "positivo" | "info";
  title: string;
  detail: string;
};

const signalDot: Record<Insight["signal"], string> = {
  critico: "bg-destructive",
  alerta: "bg-amber-500",
  positivo: "bg-success",
  info: "bg-blue-500",
};

export function ExplainMyBusiness() {
  const { active } = useActiveBusiness();

  const mutation = useMutation({
    mutationFn: async (): Promise<Insight[]> => {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token || !active?.id) throw new Error("Sesión o negocio no disponible");

      const res = await fetch("/api/business/explain", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-business-id": active.id,
        },
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Error al generar el resumen");
      return body.insights as Insight[];
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "No se pudo generar el resumen");
    },
  });

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            Explícame mi negocio
          </h3>
          <p className="text-xs text-muted-foreground">
            Lo más importante de esta semana, en 1 minuto
          </p>
        </div>
        {mutation.data && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            <RotateCw className={cn("h-3.5 w-3.5", mutation.isPending && "animate-spin")} />
          </Button>
        )}
      </div>

      {!mutation.data && !mutation.isPending && (
        <Button className="mt-4 w-full" onClick={() => mutation.mutate()}>
          <Sparkles className="mr-2 h-4 w-4" />
          Generar resumen
        </Button>
      )}

      {mutation.isPending && (
        <div className="mt-4 flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analizando tu negocio…
        </div>
      )}

      {mutation.data && (
        <ul className="mt-4 space-y-3">
          {mutation.data.map((insight, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span
                className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", signalDot[insight.signal])}
              />
              <div>
                <div className="text-sm font-medium">{insight.title}</div>
                <div className="text-xs text-muted-foreground">{insight.detail}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
