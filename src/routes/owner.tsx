import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Bell, FileText, Gauge, Radio } from "lucide-react";

/**
 * Layout de la Owner Console — evolución de la zona /owner que ya existía.
 * La Torre de Agency se conserva como una sección más del mismo espacio;
 * cada ruta hija conserva su guard beforeLoad (sesión + platform_role=owner).
 */
export const Route = createFileRoute("/owner")({
  ssr: false,
  component: OwnerLayout,
});

const NAV = [
  { to: "/owner/console", label: "Centro de mando", icon: Gauge },
  { to: "/owner/console/alerts", label: "Alertas", icon: Bell },
  { to: "/owner/console/content", label: "Contenido", icon: FileText },
  { to: "/owner/control-tower", label: "Torre Agency", icon: Radio },
] as const;

function OwnerLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/owner") {
      void navigate({ to: "/owner/console", replace: true });
    }
  }, [location.pathname, navigate]);

  return (
    <div className="min-h-screen bg-[#07070c] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07070c]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-2 px-4 py-3 sm:px-8">
          <span className="mr-4 text-[13px] font-bold tracking-[0.22em] text-white/80">OWNER CONSOLE</span>
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-white text-black"
                    : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </div>
      </header>
      <Outlet />
    </div>
  );
}
