import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/owner")({
  ssr: false,
  component: OwnerIndexRedirect,
});

function OwnerIndexRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate({ to: "/owner/control-tower", replace: true });
  }, [navigate]);

  return null;
}
