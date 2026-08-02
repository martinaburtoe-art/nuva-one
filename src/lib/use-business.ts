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

/**
 * Mirrors the RLS policy on operational tables (sales, customers, products,
 * purchases, quotes, suppliers, transactions, automations, marketing_posts,
 * audit_log): owner/admin/staff can write, viewer is read-only. UI-only
 * convenience -- RLS is still the real enforcement boundary.
 */
export function canWriteOperations(role: MemberRole | null | undefined): boolean {
  return role === "owner" || role === "admin" || role === "staff";
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

// --- Módulos y permisos por miembro ---------------------------------------

/** Cada módulo visible en la barra lateral. Se usa tanto para el checklist de
 * permisos al invitar/editar a un miembro como para filtrar la navegación. */
export const MODULES = [
  { key: "dashboard", label: "Resumen" },
  { key: "pos", label: "Caja (POS)" },
  { key: "sales", label: "Ventas" },
  { key: "purchases", label: "Compras" },
  { key: "inventory", label: "Inventario" },
  { key: "finance", label: "Finanzas" },
  { key: "analytics", label: "Indicadores" },
  { key: "quotes", label: "Cotizaciones" },
  { key: "automations", label: "Vinculación WhatsApp" },
  { key: "ai", label: "Asistente IA" },
] as const;

export type ModuleKey = (typeof MODULES)[number]["key"];
export type ModulePermissions = Partial<Record<ModuleKey, boolean>>;

/** Permisos por defecto al invitar a alguien: todo activado salvo que el
 * dueño/admin decida restringir algo puntual (ej. "solo Caja"). */
export function defaultPermissionsForRole(role: MemberRole): ModulePermissions {
  if (role === "viewer") return Object.fromEntries(MODULES.map((m) => [m.key, true]));
  return Object.fromEntries(MODULES.map((m) => [m.key, true]));
}

/**
 * Un miembro puede ver/usar un módulo si:
 * - es owner o admin (siempre tienen acceso completo), o
 * - su rol permite escribir/ver y no se le restringió explícitamente ese módulo.
 * Esta es una capa de VISIBILIDAD en la interfaz (qué se muestra en el menú y
 * qué pantallas se pueden abrir). La barrera de seguridad real para escribir
 * datos sigue siendo el rol vía RLS -- varias pantallas comparten las mismas
 * tablas (ej. Caja y Ventas ambas escriben en "sales"), por lo que no es
 * posible separar ese permiso a nivel de fila sin romper una de las dos.
 */
export function hasModulePermission(
  role: MemberRole | null | undefined,
  permissions: ModulePermissions | null | undefined,
  moduleKey: ModuleKey,
): boolean {
  if (role === "owner" || role === "admin") return true;
  if (!role) return false;
  const explicit = permissions?.[moduleKey];
  return explicit !== false; // ausencia de la clave = permitido por defecto
}

export type MyMembership = {
  role: MemberRole;
  position: string | null;
  permissions: ModulePermissions;
} | null;

/** Igual que useMyRole pero además trae el puesto y el mapa de permisos por
 * módulo del miembro actual, para gatear la navegación y las pantallas. */
export function useMyMembership() {
  const { active } = useActiveBusiness();
  return useQuery({
    enabled: !!active?.id,
    queryKey: ["my-membership", active?.id],
    queryFn: async (): Promise<MyMembership> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || !active) return null;
      const { data, error } = await supabase
        .from("business_members")
        .select("role, position, permissions")
        .eq("business_id", active.id)
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        role: data.role as MemberRole,
        position: (data as any).position ?? null,
        permissions: ((data as any).permissions ?? {}) as ModulePermissions,
      };
    },
  });
}
