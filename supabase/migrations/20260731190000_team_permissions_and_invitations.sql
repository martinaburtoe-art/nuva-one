-- =====================================================================
-- Permisos granulares por módulo + invitaciones de equipo por correo
-- + método de pago en ventas (para filtros de reportes)
--
-- Nota: business_invites y get_business_members ya existían en la base de
-- producción (aplicados antes de que este repo tuviera control de migraciones
-- sobre ellos). Esta migración los deja definidos aquí con IF NOT EXISTS /
-- CREATE OR REPLACE para que un despliegue desde cero reproduzca el mismo
-- estado, y les añade las columnas/funciones nuevas de este cambio.
-- =====================================================================

-- 1) Puesto y permisos por módulo en business_members
ALTER TABLE public.business_members
  ADD COLUMN IF NOT EXISTS position TEXT,
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.business_members.permissions IS
  'Mapa módulo -> boolean (ej: {"pos": true, "sales": false}). La ausencia de una
   clave se interpreta como acceso permitido (owner/admin/staff) o denegado
   (viewer). Esta es una capa de VISIBILIDAD a nivel de módulo en la interfaz;
   la barrera de seguridad real sigue siendo el rol vía RLS, ya que varias
   pantallas comparten las mismas tablas (ej. Caja y Ventas escriben en "sales").';

-- 2) Método de pago en ventas
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- 3) Tabla de invitaciones por correo (token + expiración), con puesto y permisos
CREATE TABLE IF NOT EXISTS public.business_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.member_role NOT NULL DEFAULT 'staff',
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

ALTER TABLE public.business_invites
  ADD COLUMN IF NOT EXISTS position TEXT,
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS business_invites_pending_unique
  ON public.business_invites (business_id, lower(email))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS business_invites_business_idx ON public.business_invites (business_id);

ALTER TABLE public.business_invites ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_invites TO authenticated;

DROP POLICY IF EXISTS "Invitee can view own invite" ON public.business_invites;
CREATE POLICY "Invitee can view own invite" ON public.business_invites
  FOR SELECT USING (lower(email) = lower(COALESCE(auth.jwt() ->> 'email', '')));

DROP POLICY IF EXISTS "Owner/admin manage business invites" ON public.business_invites;
CREATE POLICY "Owner/admin manage business invites" ON public.business_invites
  FOR ALL
  USING (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin']::member_role[]))
  WITH CHECK (private.has_business_role(business_id, auth.uid(), ARRAY['owner','admin']::member_role[]));

-- 4) Listar miembros del equipo con email/nombre (para la pantalla de Equipo)
CREATE OR REPLACE FUNCTION public.get_business_members(p_business_id UUID)
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  full_name TEXT,
  role public.member_role,
  "position" TEXT,
  permissions JSONB,
  joined_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT bm.user_id, u.email::text, p.full_name, bm.role, bm."position", bm.permissions, bm.created_at
  FROM public.business_members bm
  JOIN auth.users u ON u.id = bm.user_id
  LEFT JOIN public.profiles p ON p.id = bm.user_id
  WHERE bm.business_id = p_business_id
    AND private.has_business_role(p_business_id, auth.uid(), ARRAY['owner','admin','staff','viewer']::member_role[])
  ORDER BY bm.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_business_members(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_business_members(UUID) TO authenticated;

-- 5) Invitar (o vincular directamente si ya tiene cuenta) -- SECURITY DEFINER
-- porque necesita revisar auth.users por email, algo que un cliente normal no puede hacer.
CREATE OR REPLACE FUNCTION private.invite_team_member(
  _business_id UUID,
  _email TEXT,
  _role public.member_role,
  _position TEXT,
  _permissions JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _target_user UUID;
  _norm_email TEXT := lower(trim(_email));
BEGIN
  IF NOT private.has_business_role(_business_id, auth.uid(), ARRAY['owner','admin']::member_role[]) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF _role = 'owner' THEN
    RAISE EXCEPTION 'No se puede asignar el rol de propietario por esta vía';
  END IF;

  SELECT id INTO _target_user FROM auth.users WHERE lower(email) = _norm_email LIMIT 1;

  IF _target_user IS NOT NULL THEN
    INSERT INTO public.business_members (business_id, user_id, role, position, permissions)
    VALUES (_business_id, _target_user, _role, _position, COALESCE(_permissions, '{}'::jsonb))
    ON CONFLICT (business_id, user_id)
    DO UPDATE SET role = EXCLUDED.role, position = EXCLUDED.position, permissions = EXCLUDED.permissions;

    UPDATE public.business_invites
      SET status = 'accepted'
      WHERE business_id = _business_id AND lower(email) = _norm_email AND status = 'pending';

    RETURN jsonb_build_object('status', 'added');
  ELSE
    INSERT INTO public.business_invites (business_id, email, role, position, permissions, invited_by)
    VALUES (_business_id, _norm_email, _role, _position, COALESCE(_permissions, '{}'::jsonb), auth.uid())
    ON CONFLICT (business_id, lower(email)) WHERE status = 'pending'
    DO UPDATE SET role = EXCLUDED.role, position = EXCLUDED.position, permissions = EXCLUDED.permissions,
                  expires_at = now() + interval '7 days';

    RETURN jsonb_build_object('status', 'pending');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.invite_team_member(UUID, TEXT, public.member_role, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.invite_team_member(UUID, TEXT, public.member_role, TEXT, JSONB) TO authenticated;

-- 6) Reclamar invitaciones pendientes al iniciar sesión (auto-vinculación, ya
-- que no hay envío de correo de invitación configurado en la plataforma)
CREATE OR REPLACE FUNCTION private.claim_pending_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  _email TEXT;
  _claimed INTEGER := 0;
  inv RECORD;
BEGIN
  SELECT lower(email) INTO _email FROM auth.users WHERE id = auth.uid();
  IF _email IS NULL THEN
    RETURN 0;
  END IF;

  FOR inv IN
    SELECT * FROM public.business_invites
    WHERE lower(email) = _email AND status = 'pending' AND expires_at > now()
  LOOP
    INSERT INTO public.business_members (business_id, user_id, role, position, permissions)
    VALUES (inv.business_id, auth.uid(), inv.role, inv.position, inv.permissions)
    ON CONFLICT (business_id, user_id)
    DO UPDATE SET role = EXCLUDED.role, position = EXCLUDED.position, permissions = EXCLUDED.permissions;

    UPDATE public.business_invites SET status = 'accepted' WHERE id = inv.id;
    _claimed := _claimed + 1;
  END LOOP;

  RETURN _claimed;
END;
$$;

REVOKE ALL ON FUNCTION private.claim_pending_invitations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.claim_pending_invitations() TO authenticated;

-- 7) Wrappers en "public" -- PostgREST (y por lo tanto supabase.rpc() desde el
-- cliente) solo puede invocar funciones del esquema "public", no de "private".
CREATE OR REPLACE FUNCTION public.invite_team_member(
  _business_id UUID,
  _email TEXT,
  _role public.member_role,
  _position TEXT,
  _permissions JSONB
) RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT private.invite_team_member(_business_id, _email, _role, _position, _permissions);
$$;

REVOKE ALL ON FUNCTION public.invite_team_member(UUID, TEXT, public.member_role, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invite_team_member(UUID, TEXT, public.member_role, TEXT, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_pending_invitations()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT private.claim_pending_invitations();
$$;

REVOKE ALL ON FUNCTION public.claim_pending_invitations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_pending_invitations() TO authenticated;
