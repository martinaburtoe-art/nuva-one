import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ModuleGuard } from "@/components/module-guard";
import { useActiveBusiness, useMyRole, canWriteOperations } from "@/lib/use-business";
import { useBizList, fmtCLP } from "@/lib/biz-data";
import { toast } from "sonner";
import { Banknote, ArrowDownToLine, ArrowUpFromLine, LockKeyhole, WalletCards, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/caja-control")({
  head: () => ({ meta: [{ title: "Gestión de Caja — Nüva One" }] }),
  component: CashControl,
});

type CashRegister = { id: string; opening_amount: number; counted_cash: number | null; status: "open" | "closed"; opened_at: string };
type CashMovement = { id: string; movement_type: "deposit" | "withdrawal"; amount: number; reason: string; created_at: string };

function CashControl() {
  const { active } = useActiveBusiness();
  const { data: role } = useMyRole();
  const canWrite = canWriteOperations(role);
  const queryClient = useQueryClient();
  const { data: sales = [] } = useBizList<any>("sales", { order: "created_at" });
  const [openDialog, setOpenDialog] = useState(false);
  const [movementDialog, setMovementDialog] = useState<"deposit" | "withdrawal" | null>(null);
  const [closeDialog, setCloseDialog] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("0");
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [busy, setBusy] = useState(false);
  const registerQuery = useQuery({ queryKey: ["cash-register-open", active?.id], enabled: !!active?.id, queryFn: async () => { const { data, error } = await supabase.from("cash_registers" as any).select("id, opening_amount, counted_cash, status, opened_at").eq("business_id", active!.id).eq("status", "open").maybeSingle(); if (error) throw error; return data as CashRegister | null; } });
  const movementsQuery = useQuery({ queryKey: ["cash-register-movements", registerQuery.data?.id], enabled: !!registerQuery.data?.id, queryFn: async () => { const { data, error } = await supabase.from("cash_register_movements" as any).select("id, movement_type, amount, reason, created_at").eq("cash_register_id", registerQuery.data!.id).order("created_at", { ascending: false }); if (error) throw error; return (data ?? []) as CashMovement[]; } });
  const today = new Date().toISOString().slice(0, 10);
  const todaySales = useMemo(() => sales.filter((s: any) => (s.sale_date ?? s.created_at?.slice(0, 10)) === today && s.status === "paid"), [sales, today]);
  const cashSales = todaySales.filter((s: any) => s.payment_method === "efectivo").reduce((sum: number, s: any) => sum + Number(s.total || 0), 0);
  const cardSales = todaySales.filter((s: any) => s.payment_method === "tarjeta").reduce((sum: number, s: any) => sum + Number(s.total || 0), 0);
  const transferSales = todaySales.filter((s: any) => s.payment_method === "transferencia").reduce((sum: number, s: any) => sum + Number(s.total || 0), 0);
  const deposits = (movementsQuery.data ?? []).filter((m) => m.movement_type === "deposit").reduce((sum, m) => sum + Number(m.amount), 0);
  const withdrawals = (movementsQuery.data ?? []).filter((m) => m.movement_type === "withdrawal").reduce((sum, m) => sum + Number(m.amount), 0);
  const expectedCash = registerQuery.data ? Number(registerQuery.data.opening_amount) + cashSales + deposits - withdrawals : 0;
  const difference = countedCash === "" ? null : Number(countedCash) - expectedCash;

  async function openRegister() {
    if (!active || !canWrite) return;
    const amount = Number(openingAmount);
    if (!Number.isFinite(amount) || amount < 0) return toast.error("Ingresa un fondo inicial válido");
    setBusy(true);
    try {
      const { error } = await supabase.rpc("open_cash_register", { p_business_id: active.id, p_opening_amount: amount });
      if (error) throw error;
      toast.success("Caja abierta");
      setOpenDialog(false);
      await queryClient.invalidateQueries({ queryKey: ["cash-register-open", active.id] });
    } catch (error: any) {
      const message = error?.message || "";
      toast.error(message.includes("CASH_REGISTER_ALREADY_OPEN") ? "Ya existe una caja abierta para este negocio" : "No se pudo abrir la caja");
    } finally { setBusy(false); }
  }

  async function addMovement() {
    if (!registerQuery.data || !movementDialog || !canWrite) return;
    const amount = Number(movementAmount);
    const reason = movementReason.trim();
    if (!Number.isFinite(amount) || amount <= 0 || !reason) return toast.error("Ingresa monto y motivo");
    setBusy(true);
    try {
      const { error } = await supabase.rpc("record_cash_register_movement", { p_cash_register_id: registerQuery.data.id, p_movement_type: movementDialog, p_amount: amount, p_reason: reason });
      if (error) throw error;
      toast.success(movementDialog === "deposit" ? "Ingreso registrado" : "Retiro registrado");
      setMovementDialog(null); setMovementAmount(""); setMovementReason("");
      await queryClient.invalidateQueries({ queryKey: ["cash-register-movements", registerQuery.data.id] });
    } catch (error: any) {
      const message = error?.message || "";
      toast.error(message.includes("INSUFFICIENT_EXPECTED_CASH") ? "El retiro supera el efectivo esperado" : "No se pudo registrar el movimiento");
    } finally { setBusy(false); }
  }

  async function closeRegister() {
    if (!registerQuery.data || !canWrite) return;
    const counted = Number(countedCash);
    if (!Number.isFinite(counted) || counted < 0) return toast.error("Ingresa el efectivo contado");
    setBusy(true);
    try {
      const { error } = await supabase.rpc("close_cash_register", { p_cash_register_id: registerQuery.data.id, p_counted_cash: counted });
      if (error) throw error;
      toast.success("Caja cerrada correctamente");
      setCloseDialog(false); setCountedCash("");
      await queryClient.invalidateQueries({ queryKey: ["cash-register-open", active?.id] });
    } catch { toast.error("No se pudo cerrar la caja"); }
    finally { setBusy(false); }
  }

  const loading = registerQuery.isLoading;
  return <ModuleGuard module="pos"><div className="space-y-6"><PageHeader title="Gestión de Caja" description="Apertura, control de efectivo, movimientos y arqueo" action={<div className="flex items-center gap-2"><Badge variant={registerQuery.data ? "default" : "secondary"}>{registerQuery.data ? "Caja abierta" : "Caja cerrada"}</Badge><Button variant="ghost" size="icon" onClick={() => queryClient.invalidateQueries()} aria-label="Actualizar"><RefreshCw className="h-4 w-4" /></Button></div>} />{loading ? <Card className="p-6">Cargando estado de caja…</Card> : !registerQuery.data ? <Card className="border-dashed p-8 text-center"><WalletCards className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><h2 className="text-xl font-semibold">Inicia la jornada</h2><p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Define el fondo inicial para comenzar a controlar el efectivo de esta jornada.</p><Button className="mt-5" disabled={!canWrite} onClick={() => setOpenDialog(true)}><Banknote className="mr-2 h-4 w-4" /> Abrir caja</Button></Card> : <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric title="Fondo inicial" value={fmtCLP(Number(registerQuery.data.opening_amount))} icon={<WalletCards className="h-4 w-4" />} /><Metric title="Ventas efectivo" value={fmtCLP(cashSales)} icon={<Banknote className="h-4 w-4" />} /><Metric title="Efectivo esperado" value={fmtCLP(expectedCash)} icon={<ArrowDownToLine className="h-4 w-4" />} /><Metric title="Ventas no efectivo" value={fmtCLP(cardSales + transferSales)} icon={<WalletCards className="h-4 w-4" />} /></div><div className="grid gap-4 lg:grid-cols-[1fr_380px]"><Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Control de jornada</h2><p className="text-sm text-muted-foreground">Ventas y movimientos que afectan directamente al efectivo.</p></div><div className="flex gap-2"><Button variant="outline" disabled={!canWrite} onClick={() => setMovementDialog("deposit")}><ArrowDownToLine className="mr-2 h-4 w-4" /> Ingreso</Button><Button variant="outline" disabled={!canWrite} onClick={() => setMovementDialog("withdrawal")}><ArrowUpFromLine className="mr-2 h-4 w-4" /> Retiro</Button></div></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><Summary label="Ingresos manuales" value={fmtCLP(deposits)} /><Summary label="Retiros" value={fmtCLP(withdrawals)} /><Summary label="Ventas" value={String(todaySales.length)} /></div><div className="mt-5 space-y-2">{(movementsQuery.data ?? []).slice(0, 8).map((m) => <div key={m.id} className="flex items-center justify-between rounded-lg border p-3 text-sm"><div><div className="font-medium">{m.reason}</div><div className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}</div></div><span className={m.movement_type === "deposit" ? "font-semibold text-emerald-600" : "font-semibold text-destructive"}>{m.movement_type === "deposit" ? "+" : "-"}{fmtCLP(Number(m.amount))}</span></div>)}{(movementsQuery.data ?? []).length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Sin movimientos manuales.</p>}</div></Card><Card className="p-5"><h2 className="text-lg font-semibold">Arqueo</h2><p className="text-sm text-muted-foreground">Compara el efectivo contado con el esperado.</p><div className="mt-5 rounded-xl border p-4"><div className="flex justify-between text-sm"><span>Esperado</span><strong>{fmtCLP(expectedCash)}</strong></div><div className="mt-2 flex justify-between text-sm"><span>Contado</span><strong>{countedCash === "" ? "—" : fmtCLP(Number(countedCash))}</strong></div><div className="mt-3 border-t pt-3 flex justify-between"><span className="font-medium">Diferencia</span><strong className={difference == null ? "" : difference === 0 ? "text-emerald-600" : "text-destructive"}>{difference == null ? "—" : fmtCLP(difference)}</strong></div></div><Button className="mt-4 w-full" disabled={!canWrite || busy} onClick={() => setCloseDialog(true)}><LockKeyhole className="mr-2 h-4 w-4" /> Cerrar y arquear caja</Button></Card></div></> }<Dialog open={openDialog} onOpenChange={setOpenDialog}><DialogContent><DialogHeader><DialogTitle>Abrir caja</DialogTitle></DialogHeader><div className="space-y-4"><Label>Fondo inicial</Label><Input type="number" min="0" value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} /><Button className="w-full" disabled={busy} onClick={openRegister}>Confirmar apertura</Button></div></DialogContent></Dialog><Dialog open={movementDialog !== null} onOpenChange={(open) => !open && setMovementDialog(null)}><DialogContent><DialogHeader><DialogTitle>{movementDialog === "deposit" ? "Registrar ingreso" : "Registrar retiro"}</DialogTitle></DialogHeader><div className="space-y-4"><div><Label>Monto</Label><Input type="number" min="0.01" value={movementAmount} onChange={(e) => setMovementAmount(e.target.value)} /></div><div><Label>Motivo</Label><Input value={movementReason} onChange={(e) => setMovementReason(e.target.value)} placeholder="Ej. depósito bancario" /></div><Button className="w-full" disabled={busy} onClick={addMovement}>Registrar movimiento</Button></div></DialogContent></Dialog><Dialog open={closeDialog} onOpenChange={setCloseDialog}><DialogContent><DialogHeader><DialogTitle>Cierre y arqueo</DialogTitle></DialogHeader><div className="space-y-4"><div className="rounded-lg border p-3 text-sm">Efectivo esperado: <strong>{fmtCLP(expectedCash)}</strong></div><div><Label>Efectivo contado</Label><Input type="number" min="0" value={countedCash} onChange={(e) => setCountedCash(e.target.value)} /></div><Button className="w-full" disabled={busy} onClick={closeRegister}>Confirmar cierre</Button></div></DialogContent></Dialog></div></ModuleGuard>;
}
function Metric({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) { return <Card className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{title}</div><div className="mt-2 text-xl font-bold">{value}</div></Card>; }
function Summary({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 font-semibold">{value}</div></div>; }
