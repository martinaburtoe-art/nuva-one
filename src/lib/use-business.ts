import { useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const KEY = "novaflow.active_business_id";

export type Business = {
  id: string;
  name: string;
  industry: string;
  logo_url: string | null;
  owner_id: string;
};

export function useBusinesses() {
  return useQuery({
    queryKey: ["businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, industry, logo_url, owner_id")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Business[];
    },
  });
}

export function useActiveBusinessId() {
  const [id, setIdState] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem(KEY)
  );

  const setId = useCallback((newId: string | null) => {
    if (typeof window !== "undefined") {
      if (newId) localStorage.setItem(KEY, newId);
      else localStorage.removeItem(KEY);
    }
    setIdState(newId);
  }, []);

  useEffect(() => {
    const onStorage = () => setIdState(localStorage.getItem(KEY));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return [id, setId] as const;
}

export function useActiveBusiness() {
  const [activeId, setActiveId] = useActiveBusinessId();
  const { data: businesses, isLoading } = useBusinesses();
  const active = businesses?.find((b) => b.id === activeId) ?? businesses?.[0] ?? null;

  // Auto-select first if none chosen
  useEffect(() => {
    if (!activeId && businesses && businesses.length > 0) {
      setActiveId(businesses[0].id);
    }
  }, [activeId, businesses, setActiveId]);

  return { active, businesses: businesses ?? [], setActiveId, isLoading };
}
