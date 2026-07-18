import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { DashboardShell } from "@/components/dashboard-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // Owners hold full control over a business's money, customers, and every
    // other member's access -- that's the one role where 2FA isn't optional.
    // Skip the check for the enrollment page itself to avoid a redirect loop.
    if (location.pathname !== "/mfa-required") {
      const { data: owned } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", data.user.id)
        .limit(1)
        .maybeSingle();

      if (owned) {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const hasVerified = (factors?.totp ?? []).some((f) => f.status === "verified");
        if (!hasVerified) throw redirect({ to: "/mfa-required" });
      }
    }

    return { user: data.user };
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  );
}
