type BillingBusiness = {
  id: string;
  name: string;
  owner_id: string | null;
  subscription_status: string | null;
  billing_provider: string | null;
  mercadopago_preapproval_id: string | null;
};

type BillingManagerResult =
  | { ok: true; business: BillingBusiness; user: { id: string; email?: string | null } }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Billing mutations are owner/admin-only. UI gating is not authorization:
 * validate the caller against the business owner and membership on the server.
 */
export async function requireBusinessBillingManager(
  client: any,
  businessId: string,
): Promise<BillingManagerResult> {
  const { data: userData, error: userError } = await client.auth.getUser();
  const user = userData?.user;
  if (userError || !user?.id) {
    return { ok: false, status: 401, error: "Sesión no válida" };
  }

  const { data: business, error: businessError } = await client
    .from("businesses")
    .select("id, name, owner_id, subscription_status, billing_provider, mercadopago_preapproval_id")
    .eq("id", businessId)
    .maybeSingle();

  if (businessError || !business) {
    return { ok: false, status: 403, error: "Negocio no encontrado o sin acceso" };
  }

  if (business.owner_id !== user.id) {
    const { data: membership, error: membershipError } = await client
      .from("business_members")
      .select("role")
      .eq("business_id", businessId)
      .eq("user_id", user.id)
      .maybeSingle();

    const role = String(membership?.role ?? "").toLowerCase();
    if (membershipError || (role !== "owner" && role !== "admin")) {
      return { ok: false, status: 403, error: "Solo el propietario o un administrador puede gestionar la suscripción" };
    }
  }

  return {
    ok: true,
    business: business as BillingBusiness,
    user: { id: user.id, email: user.email },
  };
}
