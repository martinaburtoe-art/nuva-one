import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness } from "./use-business";
import { toast } from "sonner";

function requireInsertedRowId<T>(data: T): T & { id: string } {
  if (!data || typeof data !== "object" || !("id" in data) || typeof data.id !== "string") {
    throw new Error("La operación no devolvió un registro con id válido");
  }
  return data as T & { id: string };
}

export function useBizList<T = any>(
  table: string,
  opts?: { order?: string; ascending?: boolean; enabled?: boolean; select?: string },
) {
  const { active } = useActiveBusiness();
  return useQuery({
    enabled: !!active?.id && (opts?.enabled ?? true),
    queryKey: [table, active?.id, opts?.select ?? "*", opts?.order ?? null, opts?.ascending ?? false],
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const q = supabase.from(table as any).select(opts?.select ?? "*").eq("business_id", active!.id);
      if (opts?.order) q.order(opts.order, { ascending: opts.ascending ?? false });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

export function useBizPage<T = any>(
  table: string,
  opts?: {
    page?: number;
    pageSize?: number;
    order?: string;
    ascending?: boolean;
    enabled?: boolean;
    select?: string;
    eq?: Record<string, string | number | boolean>;
    or?: string;
  },
) {
  const { active } = useActiveBusiness();
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts?.pageSize ?? 50));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return useQuery({
    enabled: !!active?.id && (opts?.enabled ?? true),
    queryKey: [
      table,
      active?.id,
      "page",
      page,
      pageSize,
      opts?.select ?? "*",
      opts?.order ?? null,
      opts?.ascending ?? false,
      opts?.eq ?? null,
      opts?.or ?? null,
    ],
    placeholderData: (previous) => previous,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const q = supabase
        .from(table as any)
        .select(opts?.select ?? "*", { count: "exact" })
        .eq("business_id", active!.id)
        .range(from, to);

      Object.entries(opts?.eq ?? {}).forEach(([key, value]) => q.eq(key, value));
      if (opts?.or) q.or(opts.or);

      if (opts?.order) q.order(opts.order, { ascending: opts.ascending ?? false });

      const { data, error, count } = await q;
      if (error) throw error;

      return {
        rows: (data ?? []) as T[],
        total: count ?? 0,
        page,
        pageSize,
        pageCount: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
      };
    },
  });
}

export function useBizCount(
  table: string,
  opts?: {
    enabled?: boolean;
    eq?: Record<string, string | number | boolean>;
    or?: string;
  },
) {
  const { active } = useActiveBusiness();
  return useQuery({
    enabled: !!active?.id && (opts?.enabled ?? true),
    queryKey: [table, active?.id, "count", opts?.eq ?? null, opts?.or ?? null],
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const q = supabase.from(table as any).select("id", { count: "exact", head: true }).eq("business_id", active!.id);
      Object.entries(opts?.eq ?? {}).forEach(([key, value]) => q.eq(key, value));
      if (opts?.or) q.or(opts.or);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useBizInsert(table: string) {
  const { active } = useActiveBusiness();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Record<string, any>) => {
      if (!active) throw new Error("Selecciona un negocio");
      const { error, data } = await supabase.from(table as any).insert({ ...row, business_id: active.id }).select().single();
      if (error) throw error;
      return requireInsertedRowId(data);
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

export const fmtCLP = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
