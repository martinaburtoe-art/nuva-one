import { withSupabase } from "npm:@supabase/server@^1";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const ownerId = ctx.userClaims?.id ?? ctx.jwtClaims?.sub;
    if (!ownerId) return json({ error: "Unauthorized" }, 401);
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const { data: owner, error: ownerError } = await ctx.supabaseAdmin.auth.admin.getUserById(ownerId);
    if (ownerError || owner?.user?.app_metadata?.platform_role !== "owner") return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => null) as { email?: string; full_name?: string; business_name?: string; note?: string; expires_at?: string | null } | null;
    const email = body?.email?.trim().toLowerCase();
    const fullName = body?.full_name?.trim();
    const businessName = body?.business_name?.trim();
    const expiresAt = body?.expires_at ?? null;
    if (!email || !fullName || !businessName) return json({ error: "Completa email, nombre y negocio." }, 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "El email no es válido." }, 400);
    if (expiresAt !== null && (!Number.isFinite(Date.parse(expiresAt)) || new Date(expiresAt).getTime() <= Date.now())) return json({ error: "La vigencia debe ser una fecha futura válida." }, 400);

    const { data: existing, error: existingError } = await ctx.supabaseAdmin.auth.admin.getUserByEmail(email);
    if (existingError && existingError.message && !/not found|user not found/i.test(existingError.message)) {
      console.error("owner-create existing-user lookup error", existingError);
      return json({ error: "No se pudo verificar si el email ya existe." }, 500);
    }
    if (existing?.user) return json({ error: "Ya existe una cuenta con ese email." }, 409);

    const randomPassword = `${crypto.randomUUID()}-N!${crypto.randomUUID().slice(0, 8)}`;
    const { data: created, error: createError } = await ctx.supabaseAdmin.auth.admin.createUser({
      email,
      password: randomPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName, created_by_owner: true },
      app_metadata: { account_type: "owner_complimentary", provisioned_by: ownerId },
    });
    if (createError || !created.user) {
      console.error("owner-create account auth error", createError);
      return json({ error: "No se pudo crear la cuenta." }, 500);
    }

    const userId = created.user.id;
    const { data: business, error: businessError } = await ctx.supabaseAdmin.from("businesses").insert({
      name: businessName,
      owner_id: userId,
      plan: "pro",
      subscription_status: "active",
      owner_granted_access: true,
      owner_grant_note: body?.note?.trim() || "Cuenta de cortesía creada desde Private Owner Console",
      owner_grant_expires_at: expiresAt,
    }).select("id,name").single();

    if (businessError || !business) {
      await ctx.supabaseAdmin.auth.admin.deleteUser(userId);
      console.error("owner-create business error", businessError);
      return json({ error: "No se pudo crear el espacio de negocio." }, 500);
    }

    const { error: memberError } = await ctx.supabaseAdmin.from("business_members").insert({ business_id: business.id, user_id: userId, role: "owner", permissions: {} });
    if (memberError) {
      await ctx.supabaseAdmin.from("businesses").delete().eq("id", business.id);
      await ctx.supabaseAdmin.auth.admin.deleteUser(userId);
      console.error("owner-create membership error", memberError);
      return json({ error: "No se pudo completar la membresía del negocio." }, 500);
    }

    const { error: grantError } = await ctx.supabaseAdmin.from("owner_account_grants").insert({ business_id: business.id, user_id: userId, granted_by: ownerId, access_level: "unlimited", note: body?.note?.trim() || "Cuenta de cortesía", expires_at: expiresAt });
    if (grantError) {
      await ctx.supabaseAdmin.from("businesses").delete().eq("id", business.id);
      await ctx.supabaseAdmin.auth.admin.deleteUser(userId);
      console.error("owner-create grant error", grantError);
      return json({ error: "No se pudo activar el acceso de cortesía." }, 500);
    }

    const { data: link, error: linkError } = await ctx.supabaseAdmin.auth.admin.generateLink({ type: "recovery", email });
    if (linkError) console.error("owner-create recovery link error", linkError);

    return json({ ok: true, user_id: userId, business_id: business.id, business_name: business.name, access: "unlimited", setup_link: link?.properties?.action_link ?? null });
  }),
};
