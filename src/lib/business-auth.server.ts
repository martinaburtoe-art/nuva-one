import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Verifies that the authenticated user belongs to the requested business
 * before any service-role operation is performed for that tenant.
 */
export async function isBusinessMember(
  supabase: SupabaseClient<Database>,
  businessId: string,
  userId: string,
): Promise<boolean> {
  if (!businessId || !userId) return false;

  const { data, error } = await supabase
    .from("business_members")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();

  return !error && !!data;
}
