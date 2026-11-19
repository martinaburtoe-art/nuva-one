import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Clock3, XCircle, RefreshCw, Play, ArrowUpRight } from "lucide-react";
import type { ActionDestination } from "@/lib/nuva-action-center";
import { supabase } from "@/integrations/supabase/client";
import { canManageBusiness, useActiveBusiness, useMyRole } from "@/lib/use-business";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Json } from "@/integrations/supabase/types";

type QueueItem = {
  id: string;
  action_type: string;
  payload: Json;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  impact: number;
  destination: ActionDestination | null;
  mode: "review" | "prepare";
  created_at: string;
  error_message: string | null;
};

const labels: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  executing: "Ejecutando",
  completed: "Completada",
  dismissed: "Descartada",
  failed: "Fallida",
};

export function NuvaActionQueue() {
  const { active } = useActiveBusiness();
  const { data: role } = useMyRole();
  const canApprove = canManageBusiness(role);
  const [actionError, setActionError] = useState<string | null>(null);
  const [purchaseActionId, setPurchaseActionId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierEmail, setNewSupplierEmail] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [purchaseLines, setPurchaseLines] = useState([{ productId: "", quantity: "1", unitCost: "" }]);
  const [executing, setExecuting] = useState<string | null>(null);
  const query = useQuery({
    enabled: !!active?.id,
    queryKey: ["nuva-action-queue", active?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nuva_action_queue")
        .select("id,action_type,payload,title,description,priority,status,impact,destination,mode,created_at,error_message")
        .eq("business_id", active!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as QueueItem[];
    },
  });

  const suppliersQuery = useQuery({
    enabled: !!active?.id && !!purchaseActionId,
    queryKey: ["nuva-purchase-suppliers", active?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("id,name").eq("business_id", active!.id).order("name").limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });
  const productsQuery = useQuery({
    enabled: !!active?.id && !!purchaseActionId,
    queryKey: ["nuva-purchase-products", active?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id,name,sku,cost").eq("business_id", active!.id).order("name").limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const openPurchaseDraft = (id: string) => {
    setActionError(null);
    setPurchaseActionId(id);
    setSupplierId("");
    setShowNewSupplier(false);
    setNewSupplierName("");
    setNewSupplierEmail("");
    setNewSupplierPhone("");
    setPurchaseLines([{ productId: "", quantity: "1", unitCost: "" }]);
  };

  const updatePurchaseLine = (index: number, patch: Partial<(typeof purchaseLines)[number]>) => {
    setPurchaseLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  };

  const createSupplier = async () => {
    if (!active?.id || !canApprove) return;
    const name = newSupplierName.trim();
    if (name.length < 2) {
      setActionError("El nombre del proveedor debe tener al menos dos caracteres.");
      return;
    }
    setCreatingSupplier(true);
    setActionError(null);
    try {
      const { data, error } = await supabase.from("suppliers").insert({
        business_id: active.id,
        name,
        email: newSupplierEmail.trim() || null,
        phone: newSupplierPhone.trim() || null,
      }).select("id,name").single();
      if (error || !data) throw error ?? new Error("No se pudo crear el proveedor.");
      setSupplierId(data.id);
      setNewSupplierName("");
      setNewSupplierEmail("");
      setNewSupplierPhone("");
      setShowNewSupplier(false);
      await suppliersQuery.refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "No se pudo registrar el proveedor.");
    } finally {
      setCreatingSupplier(false);
    }
  };

  const submitPurchaseDraft = async (item: QueueItem) => {
    if (!canApprove || !active?.id) return;
    if (!supplierId) {
      setActionError("Selecciona un proveedor antes de continuar.");
      return;
    }
    if (purchaseLines.length === 0 || purchaseLines.some((line) => !line.productId || !Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0 || !Number.isFinite(Number(line.unitCost)) || Number(line.unitCost) <= 0)) {
      setActionError("Cada línea necesita producto, cantidad mayor que cero y costo unitario mayor que cero.");
      return;
    }
    const productIds = purchaseLines.map((line) => line.productId);
    if (new Set(productIds).size !== productIds.length) {
      setActionError("No repitas el mismo producto; consolida sus cantidades en una sola línea.");
      return;
    }
    const payloadObject = item.payload && typeof item.payload === "object" && !Array.isArray(item.payload)
      ? item.payload as { [key: string]: Json | undefined }
      : {};
    const payload: Json = {
      ...payloadObject,
      supplier_id: supplierId,
      items: purchaseLines.map((line) => ({
        product_id: line.productId,
        quantity: Number(line.quantity),
        unit_cost: Number(line.unitCost),
      })),
    };
    const { error } = await supabase.from("nuva_action_queue")
      .update({ payload })
      .eq("id", item.id)
      .eq("business_id", active.id)
      .eq("status", "approved");
    if (error) {
      setActionError("No se pudieron guardar los datos de la compra. No se ejecutó ninguna operación.");
      return;
    }
    setPurchaseActionId(null);
    await execute(item.id);
  };

  const updateStatus = async (id: string, status: "approved" | "dismissed") => {
    if (!canApprove || !active?.id) return;
    setActionError(null);
    const { error } = await supabase.from("nuva_action_queue").update({ status }).eq("id", id).eq("business_id", active.id);
    if (error) setActionError(error.message); else await query.refetch();
  };

  const execute = async (id: string) => {
    if (!canApprove || !active?.id) return;
    setActionError(null);
    setExecuting(id);
    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch("/api/nuva-action-execute", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.session?.access_token ?? ""}`,
          "x-business-id": active.id,
          "content-type": "application/json",
        },
        body: JSON.stringify({ action_id: id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const details = typeof payload.details === "string" ? ` ${payload.details}` : "";
        throw new Error(`${payload.error ?? "No se pudo ejecutar la acción"}${details}`);
      }
      await query.refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "No se pudo ejecutar la acción");
      await query.refetch();
    } finally {
      setExecuting(null);
    }
  };

  return (
    <Card className="border-primary/15 bg-background/70 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Nüva Action Layer</p>
          <h3 className="mt-1 text-lg font-semibold">Acciones preparadas</h3>
        </div>
        <span className="text-xs text-muted-foreground">{query.data?.length ?? 0} recientes</span>
      </div>
      {actionError && <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm" role="alert">No se pudo procesar la acción: {actionError}</div>}
      {query.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Cargando acciones…</p>
      ) : query.isError ? (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4" role="alert">
          <p className="text-sm font-medium">No se pudo cargar la cola de acciones.</p>
          <p className="mt-1 text-xs text-muted-foreground">{query.error instanceof Error ? query.error.message : "Comprueba tu conexión y vuelve a intentarlo."}</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} /> Reintentar
          </Button>
        </div>
      ) : !query.data?.length ? (
        <p className="mt-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Todavía no hay acciones preparadas. Usa “Preparar acción” desde Nüva Action Center.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {query.data.map((item) => (
            <div key={item.id} className="rounded-xl border bg-background/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${item.error_message?.startsWith("RECONCILIATION_REQUIRED:") ? "bg-destructive/10 text-destructive" : "bg-accent"}`}>
                  {item.error_message?.startsWith("RECONCILIATION_REQUIRED:") ? "Requiere conciliación" : labels[item.status] ?? item.status}
                </span>
              </div>
              {purchaseActionId === item.id && (
                <form
                  className="mt-4 space-y-3 rounded-xl border border-primary/20 bg-muted/30 p-4"
                  onSubmit={(event) => { event.preventDefault(); void submitPurchaseDraft(item); }}
                >
                  <div>
                    <p className="text-sm font-semibold">Completar compra sugerida</p>
                    <p className="mt-1 text-xs text-muted-foreground">La recomendación no es una orden de compra. Confirma proveedor, productos, cantidades y costos reales antes de ejecutar.</p>
                  </div>
                  {suppliersQuery.isLoading || productsQuery.isLoading ? (
                    <p className="text-xs text-muted-foreground">Cargando proveedores y productos…</p>
                  ) : suppliersQuery.isError || productsQuery.isError ? (
                    <p className="text-xs text-destructive" role="alert">No se pudieron cargar los datos del negocio. Reintenta o abre Compras.</p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Label htmlFor={`purchase-supplier-${item.id}`}>Proveedor</Label>
                          {!!suppliersQuery.data?.length && !showNewSupplier && <Button type="button" size="sm" variant="outline" onClick={() => setShowNewSupplier(true)}>Nuevo proveedor</Button>}
                        </div>
                        {showNewSupplier || !suppliersQuery.data?.length ? (
                          <div className="grid gap-2 rounded-lg border bg-background p-3 sm:grid-cols-3">
                            <div className="space-y-1 sm:col-span-3"><Label htmlFor={`new-supplier-name-${item.id}`}>Nombre / razón social</Label><Input id={`new-supplier-name-${item.id}`} value={newSupplierName} onChange={(event) => setNewSupplierName(event.target.value)} placeholder="Proveedor real" required /></div>
                            <div className="space-y-1"><Label htmlFor={`new-supplier-email-${item.id}`}>Email (opcional)</Label><Input id={`new-supplier-email-${item.id}`} type="email" value={newSupplierEmail} onChange={(event) => setNewSupplierEmail(event.target.value)} /></div>
                            <div className="space-y-1"><Label htmlFor={`new-supplier-phone-${item.id}`}>Teléfono (opcional)</Label><Input id={`new-supplier-phone-${item.id}`} value={newSupplierPhone} onChange={(event) => setNewSupplierPhone(event.target.value)} /></div>
                            <div className="flex items-end gap-2">
                              <Button type="button" size="sm" onClick={() => void createSupplier()} disabled={creatingSupplier || newSupplierName.trim().length < 2}>{creatingSupplier ? "Guardando…" : "Registrar proveedor"}</Button>
                              {!!suppliersQuery.data?.length && <Button type="button" size="sm" variant="ghost" onClick={() => setShowNewSupplier(false)}>Cancelar</Button>}
                            </div>
                          </div>
                        ) : (
                          <select
                            id={`purchase-supplier-${item.id}`}
                            value={supplierId}
                            onChange={(event) => setSupplierId(event.target.value)}
                            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                            required
                          >
                            <option value="">Seleccionar proveedor…</option>
                            {(suppliersQuery.data ?? []).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                          </select>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Label>Productos y costos</Label>
                          <Button type="button" size="sm" variant="outline" onClick={() => setPurchaseLines((current) => [...current, { productId: "", quantity: "1", unitCost: "" }])}>Agregar línea</Button>
                        </div>
                        {!productsQuery.data?.length && <p className="text-xs text-muted-foreground">No hay productos registrados. <Link to="/inventory" className="text-primary underline">Agregar productos en Inventario</Link>.</p>}
                        {purchaseLines.map((line, index) => (
                          <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border bg-background p-3 sm:grid-cols-[minmax(0,1fr)_90px_130px_auto]">
                            <div className="space-y-1">
                              <Label htmlFor={`purchase-product-${item.id}-${index}`}>Producto</Label>
                              <select
                                id={`purchase-product-${item.id}-${index}`}
                                value={line.productId}
                                onChange={(event) => {
                                  const product = productsQuery.data?.find((candidate) => candidate.id === event.target.value);
                                  updatePurchaseLine(index, { productId: event.target.value, unitCost: product && product.cost > 0 ? String(product.cost) : line.unitCost });
                                }}
                                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                required
                              >
                                <option value="">Seleccionar producto…</option>
                                {(productsQuery.data ?? []).map((product) => <option key={product.id} value={product.id}>{product.name}{product.sku ? ` · ${product.sku}` : ""}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`purchase-quantity-${item.id}-${index}`}>Cantidad</Label>
                              <Input id={`purchase-quantity-${item.id}-${index}`} type="number" min="0.01" step="0.01" value={line.quantity} onChange={(event) => updatePurchaseLine(index, { quantity: event.target.value })} required />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`purchase-cost-${item.id}-${index}`}>Costo unitario (CLP)</Label>
                              <Input id={`purchase-cost-${item.id}-${index}`} type="number" min="1" step="1" value={line.unitCost} onChange={(event) => updatePurchaseLine(index, { unitCost: event.target.value })} placeholder="Confirmar costo" required />
                            </div>
                            <div className="flex items-end">
                              <Button type="button" size="icon" variant="ghost" aria-label={`Eliminar línea ${index + 1}`} disabled={purchaseLines.length === 1} onClick={() => setPurchaseLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Total estimado de la compra</p>
                          <p className="text-base font-semibold tabular-nums">{new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(purchaseLines.reduce((sum, line) => sum + Math.max(0, Number(line.quantity) || 0) * Math.max(0, Number(line.unitCost) || 0), 0))}</p>
                          <p className="text-[11px] text-muted-foreground">El costo del catálogo es una referencia; confirma el precio acordado con el proveedor.</p>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" size="sm" variant="outline" onClick={() => setPurchaseActionId(null)}>Cancelar</Button>
                          <Button type="submit" size="sm" disabled={!supplierId || !productsQuery.data?.length || executing === item.id}>Confirmar datos y ejecutar</Button>
                        </div>
                      </div>
                    </>
                  )}
                </form>
              )}
              {item.error_message?.startsWith("RECONCILIATION_REQUIRED:") && (
                <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive" role="alert">
                  La operación de negocio pudo haberse confirmado, pero falta conciliar su resultado. No vuelvas a ejecutarla; solicita revisión administrativa.
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Impacto {item.impact}/100</span><span>•</span><span>{item.priority}</span>
                {item.status === "pending" && canApprove && (
                  <>
                    <Button size="sm" onClick={() => updateStatus(item.id, "approved")}><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Aprobar</Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(item.id, "dismissed")}><XCircle className="mr-1 h-3.5 w-3.5" /> Descartar</Button>
                  </>
                )}
                {item.status === "approved" && item.mode === "prepare" && canApprove && (item.action_type === "low-stock" || item.action_type === "purchase-pressure") && purchaseActionId !== item.id && (
                  <Button size="sm" onClick={() => openPurchaseDraft(item.id)}><Play className="mr-1 h-3.5 w-3.5" /> Completar compra</Button>
                )}
                {item.status === "approved" && item.mode === "prepare" && canApprove && item.action_type !== "low-stock" && item.action_type !== "purchase-pressure" && (
                  <Button size="sm" onClick={() => execute(item.id)} disabled={executing === item.id}>
                    <Play className="mr-1 h-3.5 w-3.5" /> {executing === item.id ? "Ejecutando…" : "Ejecutar"}
                  </Button>
                )}
                {item.status === "approved" && item.mode === "review" && item.destination && (
                  <Link to={destinationRoute(item.destination)} className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted">
                    Revisar en módulo <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                )}
                {item.status === "approved" && !canApprove && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1"><Clock3 className="h-3.5 w-3.5" /> Revisión autorizada</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function destinationRoute(destination: ActionDestination) {
  switch (destination) {
    case "inventory": return "/inventory";
    case "crm":
    case "customers": return "/customers";
    case "purchases": return "/purchases";
    case "finance": return "/finance";
    case "dashboard":
    default: return "/dashboard";
  }
}
