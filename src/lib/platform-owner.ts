import type { User } from "@supabase/supabase-js";

/**
 * Rol de plataforma: claim de servidor (app_metadata), nunca editable por el
 * cliente. El rol 'owner' de PLATAFORMA es distinto del member_role 'owner'
 * de un negocio cliente.
 */
export type PlatformOwnerClaim = { platform_role?: unknown };

export function isPlatformOwner(
  user: Pick<User, "app_metadata"> | { app_metadata?: PlatformOwnerClaim | null } | null | undefined,
): boolean {
  return (user?.app_metadata as PlatformOwnerClaim | null | undefined)?.platform_role === "owner";
}
