import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { MfaSetup } from "@/components/mfa-setup";
import { ShieldAlert } from "lucide-react";

// Reached only when _authenticated's beforeLoad detects the signed-in user
// owns at least one business and has no verified TOTP factor yet. The owner
// role has full control over a business's money and data (billing, deleting
// the business, managing every other member's access), so it's the one role
// where 2FA isn't optional. Everything else in the app is unreachable from
// here until enrollment succeeds.
export const Route = createFileRoute("/_authenticated/mfa-required")({
  ssr: false,
  component: MfaRequiredPage,
});

function MfaRequiredPage() {
  const navigate = useNavigate();

  // Poll factor status after each verify inside MfaSetup by re-checking on an
  // interval is unnecessary -- MfaSetup already calls its own refresh() after
  // a successful verify. We just need to know when to leave this page: check
  // right after mount and whenever the tab regains focus (covers the common
  // case of switching to an authenticator app and back).
  useEffect(() => {
    async function checkAndLeave() {
      const { data } = await supabase.auth.mfa.listFactors();
      const hasVerified = (data?.totp ?? []).some((f) => f.status === "verified");
      if (hasVerified) {
        navigate({ to: "/", replace: true });
      }
    }
    window.addEventListener("focus", checkAndLeave);
    return () => window.removeEventListener("focus", checkAndLeave);
  }, [navigate]);

  return (
    <div className="mx-auto max-w-md space-y-6 py-12">
      <div className="space-y-2 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-primary" />
        <h1 className="text-xl font-semibold">Activa la verificación en dos pasos</h1>
        <p className="text-sm text-muted-foreground">
          Como dueño del negocio tienes acceso a toda la información financiera y de clientes. Por
          tu seguridad, necesitamos que actives 2FA antes de continuar.
        </p>
      </div>
      <MfaSetup
        onVerified={() => {
          navigate({ to: "/", replace: true });
        }}
      />
    </div>
  );
}
