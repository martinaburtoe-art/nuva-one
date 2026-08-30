import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { PageHeader } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ModuleGuard } from "@/components/module-guard";
import { useActiveBusiness, useMyRole, canWriteOperations } from "@/lib/use-business";
import { fmtCLP } from "@/lib/biz-data";
import { toast } from "sonner";
import {
  Banknote,
  ArrowDownToLine,
  ArrowUpFromLine,
  LockKeyhole,
  WalletCards,
  RefreshCw,
  History,
  CircleDollarSign,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/caja-control")({
  head: () => ({ meta: [{ title: "Gestión de Caja — Nüva One" }] }),
  component: CashControl,
});

type Register = Database["public"]["Tables"]["cash_registers"]["Row"];
type Movement = Database["public"]["Tables"]["cash_register_movements"]["Row"];
type Summary = Database["public"]["Functions"]["get_cash_register_summary"]["Returns"][number];
type MovementType = "deposit" | "withdrawal";

function CashControl() {
  const { active } = useActiveBusiness();
  const { data: role } = useMyRole();
  const canWrite = canWriteOperations(role);
  const qc = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [movementDialog, setMovementDialog] = useState<MovementType | null>(null);
  const [closeDialog, setCloseDialog] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("0");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [busy, setBusy] = useState(false);

  const registerQuery = useQuery({
    queryKey: ["cash-register-open", active?.id],
    enabled: !!active?.id,
    queryFn: async (): Promise<Register | null> => {
      const { data, error } = await supabase
        .from("cash_registers")
        .select("id,business_id,opening_amount,counted_cash,status,opened_at,closed_at,closed_by,closing_note,created_at,opened_by")
        .eq("business_id", active!.id)
        .eq("status", "open")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const summaryQuery = useQuery({
    queryKey: ["cash-register-summary", registerQuery.data?.id],
    enabled: !!registerQuery.data?.id,
    queryFn: async (): Promise<Summary | null> => {
      const { data, error } = await supabase.rpc("get_cash_register_summary", {
        p_cash_register_id: registerQuery.data!.id,
      });
      if (error) throw error;
      return data[0] ?? null;
    },
  });

  const movementsQuery = useQuery({
    queryKey: ["cash-register-movements", registerQuery.data?.id],
    enabled: !!registerQuery.data?.id,
    queryFn: async (): Promise<Movement[]> => {
      const { data, error } = await supabase
        .from("cash_register_movements")
        .select("id,business_id,cash_register_id,created_at,created_by,movement_type,amount,reason")
        .eq("cash_register_id", registerQuery.data!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const historyQuery = useQuery({
    queryKey: ["cash-register-history", active?.id],
    enabled: !!active?.id,
    queryFn: async (): Promise<Register[]> => {
      const { data, error } = await supabase
        .from("cash_registers")
        .select("id,business_id,opening_amount,counted_cash,status,opened_at,closed_at,closed_by,closing_note,created_at,opened_by")
        .eq("business_id", active!.id)
        .eq("status", "closed")
        .order("closed_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const s = summaryQuery.data;
  const expected = Number(s?.expected_cash ?? 0);
  const counted = countedCash === "" ? null : Number(countedCash);
  const difference = counted === null ? null : counted - expected;

  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["cash-register-open", active?.id] }),
      qc.invalidateQueries({ queryKey: ["cash-register-history", active?.id] }),
      qc.invalidateQueries({ queryKey: ["cash-register-summary", registerQuery.data?.id] }),
      qc.invalidateQueries({ queryKey: ["cash-register-movements", registerQuery.data?.id] }),
    ]);
  }

  async function openRegister() {
    if (!active || !canWrite) return;
    const amount = Number(openingAmount);
    if (!Number.isFinite(amount) || amount < 0) return toast.error("Ingresa un fondo inicial válido");
    setBusy(true);
    try {
      const { error } = await supabase.rpc("open_cash_register", {
        p_business_id: active.id,
        p_opening_amount: amount,
      });
      if (error) throw error;
      toast.success("Caja abierta");
      setOpenDialog(false);
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message.includes("CASH_REGISTER_ALREADY_OPEN") ? "Ya existe una caja abierta para este negocio" : "No se pudo abrir la caja");
    } finally {
      setBusy(false);
    }
  }

  async function addMovement() {
    if (!registerQuery.data || !movementDialog || !canWrite) return;
    const amount = Number(movementAmount);
    const reason = movementReason.trim();
    if (!Number.isFinite(amount) || amount <= 0 || !reason) return toast.error("Ingresa monto y motivo");
    setBusy(true);
    try {
      const { error } = await supabase.rpc("record_cash_register_movement", {
        p_cash_register_id: registerQuery.data.id,
        p_movement_type: movementDialog,
        p_amount: amount,
        p_reason: reason,
      });
      if (error) throw error;
      toast.success(movementDialog === "deposit" ? "Ingreso registrado" : "Retiro registrado");
      setMovementDialog(null);
      setMovementAmount("");
      setMovementReason("");
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message.includes("INSUFFICIENT_EXPECTED_CASH") ? "El retiro supera el efectivo esperado" : "No se pudo registrar el movimiento");
    } finally {
      setBusy(false);
    }
  }

  async function closeRegister() {
    if (!registerQuery.data || !canWrite) return;
    const amount = Number(countedCash);
    if (!Number.isFinite(amount) || amount < 0) return toast.error("Ingresa el efectivo contado");
    setBusy(true);
    try {
      const { error } = await supabase.rpc("close_cash_register", {
        p_cash_register_id: registerQuery.data.id,
        p_counted_cash: amount,
      });
      if (error) throw error;
      toast.success("Caja cerrada correctamente");
      setCloseDialog(false);
      setCountedCash("");
      await refresh();
    } catch {
      toast.error("No se pudo cerrar la caja");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModuleGuard module="pos">
      <div className="space-y-6">
        <PageHeader
          title="Gestión de Caja"
          description="Apertura, control de efectivo, movimientos, arqueo e historial de jornadas"
          action={
            <div className="flex items-center gap-2">
              <Badge variant={registerQuery.data ? "default" : "secondary"}>{registerQuery.data ? "Caja abierta" : "Caja cerrada"}</Badge>
              <Button variant="ghost" size="icon" onClick={refresh} aria-label="Actualizar"><RefreshCw className="h-4 w-4" /></Button>
            </div>
          }
        />
        {registerQuery.isLoading ? (
          <Card className="p-6">Cargando estado de caja…</Card>
        ) : !registerQuery.data ? (
          <Card className="border-dashed p-8 text-center">
            <WalletCards className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Inicia la jornada</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Define el fondo inicial para comenzar a controlar el efectivo de esta jornada.</p>
            <Button className="mt-5" disabled={!canWrite} onClick={() => setOpenDialog(true)}><Banknote className="mr-2 h-4 w-4" />Abrir caja</Button>
          </Card>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Metric title="Fondo inicial" value={fmtCLP(Number(s?.opening_amount ?? registerQuery.data.opening_amount))} icon={<WalletCards className="h-4 w-4" />} />
              <Metric title="Ventas efectivo" value={fmtCLP(Number(s?.cash_sales ?? 0))} icon={<Banknote className="h-4 w-4" />} />
              <Metric title="Ingresos" value={fmtCLP(Number(s?.cash_income ?? 0))} icon={<ArrowDownToLine className="h-4 w-4" />} />
              <Metric title="Retiros" value={fmtCLP(Number(s?.cash_withdrawals ?? 0))} icon={<ArrowUpFromLine className="h-4 w-4" />} />
              <Metric title="Efectivo esperado" value={fmtCLP(expected)} icon={<CircleDollarSign className="h-4 w-4" />} />
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><h2 className="text-lg font-semibold">Control de jornada</h2><p className="text-sm text-muted-foreground">El resumen usa exclusivamente el contrato real de get_cash_register_summary.</p></div>
                  <div className="flex gap-2">
                    <Button variant="outline" disabled={!canWrite || busy} onClick={() => setMovementDialog("deposit")}><ArrowDownToLine className="mr-2 h-4 w-4" />Ingreso</Button>
                    <Button variant="outline" disabled={!canWrite || busy} onClick={() => setMovementDialog("withdrawal")}><ArrowUpFromLine className="mr-2 h-4 w-4" />Retiro</Button>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Summary label="Movimientos" value={String(s?.movement_count ?? 0)} />
                  <Summary label="Ventas efectivo" value={fmtCLP(Number(s?.cash_sales ?? 0))} />
                  <Summary label="Ingresos manuales" value={fmtCLP(Number(s?.cash_income ?? 0))} />
                  <Summary label="Retiros" value={fmtCLP(Number(s?.cash_withdrawals ?? 0))} />
                </div>
                <div className="mt-5 rounded-xl border p-4">
                  <div className="text-sm font-medium">Desglose de efectivo</div>
                  <div className="mt-3 space-y-2 text-sm">
                    <Row label="Fondo inicial" value={fmtCLP(Number(s?.opening_amount ?? 0))} />
                    <Row label="Ventas efectivo" value={fmtCLP(Number(s?.cash_sales ?? 0))} />
                    <Row label="Ingresos" value={fmtCLP(Number(s?.cash_income ?? 0))} />
                    <Row label="Retiros" value={fmtCLP(Number(s?.cash_withdrawals ?? 0))} />
                    <Row label="Devoluciones" value={fmtCLP(Number(s?.cash_refunds ?? 0))} />
                    <div className="border-t pt-2"><Row label="Efectivo esperado" value={fmtCLP(expected)} strong /></div>
                  </div>
                </div>
                <div className="mt-5">
                  <div className="flex items-center gap-2 text-sm font-medium"><History className="h-4 w-4" />Movimientos de caja</div>
                  <div className="mt-2 space-y-2">
                    {(movementsQuery.data ?? []).map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                        <div><div className="font-medium">{m.reason}</div><div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString("es-CL")}</div></div>
                        <span className={m.movement_type.toLowerCase() === "deposit" || m.movement_type.toLowerCase() === "income" ? "font-semibold text-emerald-600" : "font-semibold text-destructive"}>{m.movement_type.toLowerCase() === "deposit" || m.movement_type.toLowerCase() === "income" ? "+" : "-"}{fmtCLP(Number(m.amount))}</span>
                      </div>
                    ))}
                    {(movementsQuery.data ?? []).length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Sin movimientos manuales.</p>}
                  </div>
                </div>
              </Card>
              <Card className="p-5">
                <h2 className="text-lg font-semibold">Arqueo</h2>
                <p className="text-sm text-muted-foreground">Compara el efectivo físico con el esperado por el sistema.</p>
                <div className="mt-5 rounded-xl border p-4">
                  <Row label="Efectivo esperado" value={fmtCLP(expected)} strong />
                  <Row label="Contado" value={counted === null ? "—" : fmtCLP(counted)} />
                  <Row label="Diferencia" value={difference === null ? "—" : fmtCLP(difference)} strong />
                </div>
                <Button className="mt-4 w-full" disabled={!canWrite || busy} onClick={() => setCloseDialog(true)}><LockKeyhole className="mr-2 h-4 w-4" />Cerrar y arquear caja</Button>
              </Card>
            </div>
          </>
        )}
        <Card className="p-5">
          <div className="flex items-center gap-2"><History className="h-5 w-5" /><div><h2 className="text-lg font-semibold">Historial de cierres</h2><p className="text-sm text-muted-foreground">Consulta las últimas jornadas y sus arqueos.</p></div></div>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="px-3 py-2">Apertura</th><th className="px-3 py-2">Cierre</th><th className="px-3 py-2 text-right">Fondo</th><th className="px-3 py-2 text-right">Contado</th><th className="px-3 py-2">Estado</th></tr></thead><tbody>{(historyQuery.data ?? []).map((r) => <tr key={r.id} className="border-t"><td className="px-3 py-3">{new Date(r.opened_at).toLocaleString("es-CL")}</td><td className="px-3 py-3">{r.closed_at ? new Date(r.closed_at).toLocaleString("es-CL") : "—"}</td><td className="px-3 py-3 text-right">{fmtCLP(Number(r.opening_amount))}</td><td className="px-3 py-3 text-right">{r.counted_cash == null ? "—" : fmtCLP(Number(r.counted_cash))}</td><td className="px-3 py-3"><Badge variant="secondary">Cerrada</Badge></td></tr>)}</tbody></table>{(historyQuery.data ?? []).length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Todavía no hay jornadas cerradas.</p>}</div>
        </Card>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}><DialogContent><DialogHeader><DialogTitle>Abrir caja</DialogTitle></DialogHeader><div className="space-y-4"><Label>Fondo inicial</Label><Input type="number" min="0" value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} /><Button className="w-full" disabled={busy} onClick={openRegister}>Confirmar apertura</Button></div></DialogContent></Dialog>
        <Dialog open={movementDialog !== null} onOpenChange={(open) => !open && setMovementDialog(null)}><DialogContent><DialogHeader><DialogTitle>{movementDialog === "deposit" ? "Registrar ingreso" : "Registrar retiro"}</DialogTitle></DialogHeader><div className="space-y-4"><div><Label>Monto</Label><Input type="number" min="0.01" value={movementAmount} onChange={(e) => setMovementAmount(e.target.value)} /></div><div><Label>Motivo</Label><Input value={movementReason} onChange={(e) => setMovementReason(e.target.value)} placeholder="Ej. depósito bancario" /></div><Button className="w-full" disabled={busy} onClick={addMovement}>Registrar movimiento</Button></div></DialogContent></Dialog>
        <Dialog open={closeDialog} onOpenChange={setCloseDialog}><DialogContent><DialogHeader><DialogTitle>Cierre y arqueo</DialogTitle></DialogHeader><div className="space-y-4"><div className="rounded-lg border p-3 text-sm">Efectivo esperado: <strong>{fmtCLP(expected)}</strong></div><div><Label>Efectivo contado</Label><Input type="number" min="0" value={countedCash} onChange={(e) => setCountedCash(e.target.value)} /></div>{counted !== null && <div className="rounded-lg border p-3 text-sm">Diferencia: <strong>{fmtCLP(difference ?? 0)}</strong></div>}<Button className="w-full" disabled={busy} onClick={closeRegister}>Confirmar cierre</Button></div></DialogContent></Dialog>
      </div>
    </ModuleGuard>
  );
}

function Metric({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return <Card className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{title}</div><div className="mt-2 text-xl font-bold tabular-nums">{value}</div></Card>;
}
function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 font-semibold tabular-nums">{value}</div></div>;
}
function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex justify-between gap-4 py-1"><span className={strong ? "font-medium" : "text-muted-foreground"}>{label}</span><span className={strong ? "font-semibold tabular-nums" : "tabular-nums"}>{value}</span></div>;
}
