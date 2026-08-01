import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { useMyMembership, hasModulePermission, type ModuleKey } from "@/lib/use-business";

/**
 * Envuelve el contenido de una pantalla y muestra un aviso de "sin acceso" si
 * el miembro actual no tiene permiso para ese módulo. Esto complementa (no
 * reemplaza) el filtrado del menú lateral: alguien podría llegar a la URL
 * directamente aunque no vea el ítem en la navegación.
 */
export function ModuleGuard({ module, children }: { module: ModuleKey; children: ReactNode }) {
  const { data: membership, isLoading } = useMyMembership();

  if (isLoading) return null;

  const allowed = hasModulePermission(membership?.role ?? null, membership?.permissions, module);
  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <ShieldAlert className="h-10 w-10" />
        <p className="font-medium text-foreground">No tienes acceso a esta sección</p>
        <p className="max-w-sm text-sm">
          El dueño o un administrador del negocio puede habilitarte este módulo desde
          Configuración → Equipo.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
