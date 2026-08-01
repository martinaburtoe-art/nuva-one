import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Mail, Pencil, Trash2, UserPlus, Clock, Lock } from "lucide-react";
import {
  MODULES,
  defaultPermissionsForRole,
  type ModulePermissions,
  type MemberRole,
} from "@/lib/use-business";

const ROLE_LABEL: Record<MemberRole, string> = {
  owner: "Propietario",
  admin: "Administrador",
  staff: "Staff",
  viewer: "Solo lectura",
};

// El rol de propietario no se asigna desde acá — la transferencia de
// titularidad del negocio es una acción distinta y más sensible.
const ASSIGNABLE_ROLES: MemberRole[] = ["admin", "staff", "viewer"];

type Member = {
  user_id: string;
  email: string;
  full_name: string | null;
  role: MemberRole;
  position: string | null;
  permissions: ModulePermissions;
  joined_at: string;
};

type Invite = {
  id: string;
  email: string;
  role: MemberRole;
  position: string | null;
  permissions: ModulePermissions;
  status: string;
  created_at: string;
  expires_at: string;
};

function PermissionChecklist({
  role,
  value,
  onChange,
}: {
  role: MemberRole;
  value: ModulePermissions;
  onChange: (v: ModulePermissions) => void;
}) {
  if (role === "admin") {
    return (
      <p className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" /> Los administradores tienen acceso completo a todos los
        módulos.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border p-3">
      {MODULES.map((m) => {
        const checked = value[m.key] !== false;
        return (
          <label key={m.key} className="flex items-center justify-between gap-2 text-sm">
            <span>{m.label}</span>
            <Switch
              checked={checked}
              onCheckedChange={(v) => onChange({ ...value, [m.key]: v })}
            />
          </label>
        );
      })}
    </div>
  );
}

export function TeamManagement({
  businessId,
  canManage,
}: {
  businessId: string;
  canManage: boolean;
}) {
  const qc = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ["business-members", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_business_members", {
        p_business_id: businessId,
      });
      if (error) throw error;
      return (data ?? []) as unknown as Member[];
    },
  });

  const { data: invites } = useQuery({
    queryKey: ["business-invites", businessId],
    enabled: canManage,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_invites")
        .select("id, email, role, position, permissions, status, created_at, expires_at")
        .eq("business_id", businessId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Invite[];
    },
  });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePosition, setInvitePosition] = useState("");
  const [inviteRole, setInviteRole] = useState<MemberRole>("staff");
  const [invitePerms, setInvitePerms] = useState<ModulePermissions>(
    defaultPermissionsForRole("staff"),
  );
  const [inviting, setInviting] = useState(false);

  const [editing, setEditing] = useState<Member | null>(null);
  const [editRole, setEditRole] = useState<MemberRole>("staff");
  const [editPosition, setEditPosition] = useState("");
  const [editPerms, setEditPerms] = useState<ModulePermissions>({});
  const [saving, setSaving] = useState(false);

  function refreshAll() {
    qc.invalidateQueries({ queryKey: ["business-members", businessId] });
    qc.invalidateQueries({ queryKey: ["business-invites", businessId] });
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const { data, error } = await supabase.rpc("invite_team_member", {
        _business_id: businessId,
        _email: inviteEmail.trim(),
        _role: inviteRole,
        _position: invitePosition.trim(),
        _permissions: invitePerms,
      });
      if (error) throw error;
      const status = (data as any)?.status;
      toast.success(
        status === "added"
          ? "Persona vinculada al negocio"
          : "Invitación creada — se vinculará automáticamente cuando inicie sesión con ese correo",
      );
      setInviteOpen(false);
      setInviteEmail("");
      setInvitePosition("");
      setInviteRole("staff");
      setInvitePerms(defaultPermissionsForRole("staff"));
      refreshAll();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo invitar");
    } finally {
      setInviting(false);
    }
  }

  function openEdit(m: Member) {
    setEditing(m);
    setEditRole(m.role);
    setEditPosition(m.position ?? "");
    setEditPerms(m.permissions ?? {});
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("business_members")
        .update({ role: editRole, position: editPosition.trim() || null, permissions: editPerms })
        .eq("business_id", businessId)
        .eq("user_id", editing.user_id);
      if (error) throw error;
      toast.success("Miembro actualizado");
      setEditing(null);
      refreshAll();
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo actualizar");
    } finally {
      setSaving(false);
    }
  }

  async function removeMember(m: Member) {
    if (!confirm(`¿Quitar a ${m.full_name ?? m.email} del negocio?`)) return;
    const { error } = await supabase
      .from("business_members")
      .delete()
      .eq("business_id", businessId)
      .eq("user_id", m.user_id);
    if (error) toast.error(error.message);
    else {
      toast.success("Miembro eliminado");
      refreshAll();
    }
  }

  async function revokeInvite(inv: Invite) {
    const { error } = await supabase.from("business_invites").delete().eq("id", inv.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Invitación cancelada");
      refreshAll();
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Miembros del equipo</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Invita personas, asigna un puesto y controla a qué módulos tiene acceso cada una.
          </p>
        </div>
        {canManage && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="mr-1.5 h-4 w-4" /> Invitar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Invitar a una persona</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Correo electrónico</Label>
                  <Input
                    type="email"
                    placeholder="jonny@ejemplo.cl"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Si ya tiene cuenta en Nüva One, queda vinculado de inmediato. Si no, se
                    vinculará automáticamente apenas inicie sesión con este correo.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Puesto</Label>
                    <Input
                      placeholder="Ej: Cajero, Vendedor..."
                      value={invitePosition}
                      onChange={(e) => setInvitePosition(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Rol</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(v) => {
                        const role = v as MemberRole;
                        setInviteRole(role);
                        setInvitePerms(defaultPermissionsForRole(role));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSIGNABLE_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">Permisos por módulo</Label>
                  <PermissionChecklist role={inviteRole} value={invitePerms} onChange={setInvitePerms} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={sendInvite} disabled={inviting || !inviteEmail.trim()}>
                  {inviting ? "Invitando…" : "Invitar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mt-5 space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Cargando…</p>}
        {(members ?? []).map((m) => (
          <div
            key={m.user_id}
            className="flex items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{m.full_name ?? m.email}</span>
                <Badge variant="outline">{ROLE_LABEL[m.role]}</Badge>
                {m.position && <Badge variant="secondary">{m.position}</Badge>}
              </div>
              <p className="truncate text-xs text-muted-foreground">{m.email}</p>
            </div>
            {canManage && m.role !== "owner" && (
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => removeMember(m)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          </div>
        ))}
        {!isLoading && (members ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía no hay miembros.</p>
        )}
      </div>

      {canManage && (invites ?? []).length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-muted-foreground">Invitaciones pendientes</h4>
          <div className="mt-2 space-y-2">
            {invites!.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-3"
              >
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{inv.email}</span>
                  <Badge variant="outline">{ROLE_LABEL[inv.role]}</Badge>
                  {inv.position && <Badge variant="secondary">{inv.position}</Badge>}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" /> pendiente
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => revokeInvite(inv)}>
                  Cancelar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar a {editing?.full_name ?? editing?.email}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Puesto</Label>
                  <Input value={editPosition} onChange={(e) => setEditPosition(e.target.value)} />
                </div>
                <div>
                  <Label>Rol</Label>
                  <Select value={editRole} onValueChange={(v) => setEditRole(v as MemberRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Permisos por módulo</Label>
                <PermissionChecklist role={editRole} value={editPerms} onChange={setEditPerms} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
