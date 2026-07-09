import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// TOTP two-factor enrollment using Supabase Auth's built-in MFA. Renders the
// QR code that Supabase returns as an SVG string, then verifies the 6-digit
// code the user reads from their authenticator app. Existing verified factors
// can be unenrolled from here as well.
type Factor = { id: string; friendly_name: string | null; status: string };

export function MfaSetup() {
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(
    null,
  );
  const [code, setCode] = useState("");

  async function refresh() {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) return;
    setFactors((data.totp ?? []) as Factor[]);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function startEnroll() {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Nüva One ${new Date().toLocaleDateString("es-CL")}`,
    });
    setLoading(false);
    if (error || !data) {
      toast.error(error?.message || "No se pudo iniciar el registro");
      return;
    }
    setEnrolling({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function verify() {
    if (!enrolling) return;
    setLoading(true);
    const challenge = await supabase.auth.mfa.challenge({ factorId: enrolling.id });
    if (challenge.error || !challenge.data) {
      setLoading(false);
      toast.error(challenge.error?.message || "Error al desafiar el código");
      return;
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId: enrolling.id,
      challengeId: challenge.data.id,
      code,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Código incorrecto");
      return;
    }
    toast.success("2FA activado");
    setEnrolling(null);
    setCode("");
    refresh();
  }

  async function unenroll(id: string) {
    if (!confirm("¿Desactivar 2FA?")) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    if (error) toast.error(error.message);
    else {
      toast.success("2FA desactivado");
      refresh();
    }
  }

  const verified = (factors ?? []).filter((f) => f.status === "verified");
  const hasActive = verified.length > 0;

  return (
    <div className="space-y-4">
      {hasActive ? (
        <div className="space-y-2">
          {verified.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between rounded-md border border-border/60 bg-secondary/40 p-3 text-sm"
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {f.friendly_name || "Autenticador TOTP"} — Activo
              </span>
              <Button variant="ghost" size="sm" onClick={() => unenroll(f.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : enrolling ? (
        <div className="space-y-3">
          <div className="rounded-md border bg-white p-4">
            <div
              className="mx-auto h-44 w-44"
              // Supabase returns a full <svg>...</svg> string; render it directly
              dangerouslySetInnerHTML={{ __html: enrolling.qr }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Escanea con Google Authenticator, 1Password o Authy. También puedes ingresar la clave
            manualmente:{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{enrolling.secret}</code>
          </p>
          <div>
            <Label htmlFor="mfa-code">Código de 6 dígitos</Label>
            <Input
              id="mfa-code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={verify} disabled={loading || code.length !== 6}>
              {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Verificar y activar
            </Button>
            <Button variant="ghost" onClick={() => setEnrolling(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={startEnroll} disabled={loading}>
          {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          Activar 2FA
        </Button>
      )}
    </div>
  );
}
