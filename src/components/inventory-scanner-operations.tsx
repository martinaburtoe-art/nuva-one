import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, ScanBarcode, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LiveProductScanner } from "@/components/scanner/LiveProductScanner";
import { resolveProductCode } from "@/lib/product-resolver";
import { executeInventoryOperation, type InventoryOperation } from "@/lib/inventory-transactions";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness, useMyRole, canWriteOperations } from "@/lib/use-business";

export function InventoryScannerOperations() {
  const { active } = useActiveBusiness();
  const { data: role } = useMyRole();
  const canWrite = canWriteOperations(role);
  const [open, setOpen] = useState(false);
  const [operation, setOperation] = useState<InventoryOperation>("entry");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [code, setCode] = useState("");
  const [product, setProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function resolve(codeValue: string) {
    const value = codeValue.trim();
    if (!value || !active) return;
    try {
      const result = await resolveProductCode(value);
      if (result.status === "UNAUTHORIZED") return toast.error("No tienes autorización para consultar este producto.");
      if (result.status === "DUPLICATE") return toast.error("El código está asociado a más de un producto.");
      if (result.status !== "FOUND" || !result.product) return toast.error("Producto no encontrado. Créalo desde el conteo físico o el catálogo.");
      setProduct(result.product);
      setCode(value);
      setOpen(true);
    } catch (error: any) {
      toast.error(error?.message ?? "No se pudo resolver el código.");
    }
  }

  async function apply() {
    if (!product || !active || !canWrite) return;
    const qty = Number(quantity);
    if (!Number.isSafeInteger(qty) || qty <= 0) return toast.error("La cantidad debe ser un entero mayor que cero.");
    if (!reason.trim()) return toast.error("Indica el motivo del movimiento.");
    setBusy(true);
    try {
      await executeInventoryOperation(supabase, {
        productId: product.product_id,
        operation,
        quantity: qty,
        currentStock: Number(product.stock ?? 0),
        reason: reason.trim(),
        sourceId: `${operation}:${product.product_id}:${Date.now()}`,
      });
      toast.success(operation === "entry" || operation === "receipt" ? `Entrada de ${qty} unidad(es) registrada.` : `Salida de ${qty} unidad(es) registrada.`);
      setOpen(false);
      setProduct(null);
      setCode("");
      setQuantity("1");
      setReason("");
    } catch (error: any) {
      toast.error(error?.message ?? "No se pudo registrar el movimiento.");
    } finally {
      setBusy(false);
    }
  }

  const operationLabel = operation === "entry" ? "Entrada" : operation === "receipt" ? "Recepción" : "Salida";

  return <>
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold">Operaciones rápidas con Scanner</h2>
          <p className="text-sm text-muted-foreground">Escanea un producto para registrar entradas o salidas de stock con trazabilidad.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!canWrite} onClick={() => { setOperation("entry"); setScannerOpen(true); }}><ArrowDownToLine className="mr-2 h-4 w-4" />Entrada</Button>
          <Button variant="outline" disabled={!canWrite} onClick={() => { setOperation("exit"); setScannerOpen(true); }}><ArrowUpFromLine className="mr-2 h-4 w-4" />Salida</Button>
          <Button variant="outline" disabled={!canWrite} onClick={() => setScannerOpen(true)}><ScanBarcode className="mr-2 h-4 w-4" />Escanear</Button>
        </div>
      </div>
    </Card>

    <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>Scanner de inventario — {operationLabel}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <LiveProductScanner onDetected={(value: string) => { setScannerOpen(false); void resolve(value); }} />
          <div className="flex gap-2"><Input value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void resolve(code); } }} placeholder="Código de barras o SKU" /><Button onClick={() => void resolve(code)}>Buscar</Button></div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>{operationLabel} de inventario</DialogTitle></DialogHeader>
        {product && <div className="space-y-4">
          <div className="rounded-lg border p-4"><div className="font-semibold">{product.name ?? "Producto"}</div><div className="mt-1 text-sm text-muted-foreground">SKU: {product.sku ?? "—"} · Código: {product.barcode ?? code} · Stock actual: {Number(product.stock ?? 0)}</div></div>
          <div><Label htmlFor="inventory-operation-quantity">Cantidad</Label><Input id="inventory-operation-quantity" type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
          <div><Label htmlFor="inventory-operation-reason">Motivo</Label><Input id="inventory-operation-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder={operation === "entry" ? "Ej. recepción de proveedor" : "Ej. salida por merma"} /></div>
          <Badge variant="outline" className="flex w-fit items-center gap-1"><Settings2 className="h-3 w-3" />Movimiento auditado y atómico</Badge>
          <Button className="w-full" disabled={busy} onClick={() => void apply()}>{busy ? "Registrando…" : `Confirmar ${operationLabel.toLowerCase()}`}</Button>
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}
