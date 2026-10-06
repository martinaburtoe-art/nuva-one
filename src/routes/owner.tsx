import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/owner")({
  ssr: false,
  component: OwnerLayout,
});

function OwnerLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/owner") {
      void navigate({ to: "/owner/control-tower", replace: true });
    }
  }, [location.pathname, navigate]);

  return <Outlet />;
}
