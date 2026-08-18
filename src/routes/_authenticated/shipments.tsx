import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ShipmentsWorkspace } from "@/components/shipments/ShipmentsWorkspace";

export const Route = createFileRoute("/_authenticated/shipments")({ component: ShipmentsRoute });

function ShipmentsRoute() {
  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-4 pt-4 md:px-8">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver al dashboard
        </Link>
      </div>
      <ShipmentsWorkspace />
    </>
  );
}
