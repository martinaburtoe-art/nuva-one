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
  webhook_url: string | null;
};

export function useBusinesses() {
  return useQuery({
    queryKey: ["businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("id, name, industry, logo_url, owner_id, webhook_url")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Business[];
    },
  });
}

export function useActiveBusinessId() {
  const [id, setIdState] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem(KEY),
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

export type MemberRole = "owner" | "admin" | "staff" | "viewer";

/**
 * Centralizes the "can this role manage the business" rule instead of
 * repeating `role === 'owner' || role === 'admin'` inline at every call
 * site (it was duplicated twice in settings.tsx before this). This is a
 * UI-only convenience, same as useMyRole's own doc comment says -- RLS is
 * still the real enforcement boundary, this only decides what buttons to
 * show.
 */
export function canManageBusiness(role: MemberRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

/** Only the owner can do owner-only things: delete the business, transfer ownership, etc. */
export function isBusinessOwner(role: MemberRole | null | undefined): boolean {
  return role === "owner";
}

// Returns the current user's role within the active business, so the UI can
// hide/disable actions (e.g. deleting the business, managing members) that
// the database would reject anyway. RLS remains the real security boundary;
// this is purely so the interface doesn't show buttons that will just fail.
export function useMyRole() {
  const { active } = useActiveBusiness();
  return useQuery({
    enabled: !!active?.id,
    queryKey: ["my-role", active?.id],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || !active) return null;
      const { data, error } = await supabase
        .from("business_members")
        .select("role")
        .eq("business_id", active.id)
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.role ?? null) as MemberRole | null;
    },
  });
}
