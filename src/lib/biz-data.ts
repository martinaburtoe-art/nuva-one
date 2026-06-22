import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness } from "./use-business";
import { toast } from "sonner";

export function useBizList<T = any>(table: string, opts?: { order?: string; ascending?: boolean }) {
  const { active } = useActiveBusiness();
  return useQuery({
    enabled: !!active?.id,
    queryKey: [table, active?.id],
    queryFn: async () => {
      const q = supabase.from(table as any).select("*").eq("business_id", active!.id);
      if (opts?.order) q.order(opts.order, { ascending: opts.ascending ?? false });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

export function useBizInsert(table: string) {
  const { active } = useActiveBusiness();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Record<string, any>) => {
      if (!active) throw new Error("Selecciona un negocio");
      const { error, data } = await supabase
        .from(table as any)
        .insert({ ...row, business_id: active.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table, active?.id] });
      toast.success("Guardado");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al guardar"),
  });
}

export function useBizDelete(table: string) {
  const { active } = useActiveBusiness();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table, active?.id] });
      toast.success("Eliminado");
    },
    onError: (e: any) => toast.error(e.message ?? "Error al eliminar"),
  });
}

export function useBizUpdate(table: string) {
  const { active } = useActiveBusiness();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, any> }) => {
      const { error } = await supabase.from(table as any).update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table, active?.id] });
      toast.success("Actualizado");
    },
    onError: (e: any) => toast.error(e.message ?? "Error"),
  });
}

export const fmtCLP = (n: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
