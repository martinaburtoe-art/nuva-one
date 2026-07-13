import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { PageHeader } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Printer,
  Star,
  StarOff,
  AlertTriangle,
  Receipt,
} from "lucide-react";
import { useBizList, useBizInsert, fmtCLP } from "@/lib/biz-data";
import { useActiveBusiness } from "@/lib/use-business";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pos")({
  head: () => ({ meta: [{ title: "Caja — Nüva One" }] }),
  component: POS,
});

type CartItem = { product_id: string; name: string; qty: number; price: number; stock: number };
type PayMethod = "efectivo" | "tarjeta" | "transferencia";

function POS() {
  const { active } = useActiveBusiness();
  const { data: products, isLoading } = useBizList<any>("products", { order: "name", ascending: true });
  const { data: sales } = useBizList<any>("sales", { order: "created_at" });
  const insert = useBizInsert("sales");

  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [method, setMethod] = useState<PayMethod>("efectivo");
  const [received, setReceived] = useState<number>(0);
  const [showReceipt, setShowReceipt] = useState<any | null>(null);

  const favKey = active ? `nuva.pos.favs.${active.id}` : null;
  const [favs, setFavs] = useState<string[]>([]);
  useEffect(() => {
    if (!favKey) return;
    try {
      setFavs(JSON.parse(localStorage.getItem(favKey) ?? "[]"));
    } catch {
      setFavs([]);
    }
  }, [favKey]);
  function toggleFav(id: string) {
    if (!favKey) return;
    setFavs((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem(favKey, JSON.stringify(next));
      return next;
    });
  }

  const list = products ?? [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p: any) =>
        p.name?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase?.().includes(q) ||
        p.category?.toLowerCase?.().includes(q),
    );
  }, [list, query]);
  const favorites = list.filter((p: any) => favs.includes(p.id));

  function addToCart(p: any) {
    if (Number(p.stock) <= 0) {
      toast.error(`${p.name} sin stock`);
      return;
    }
    setCart((c) => {
      const existing = c.find((i) => i.product_id === p.id);
      if (existing) {
        if (existing.qty + 1 > Number(p.stock)) {
          toast.error(`Solo quedan ${p.stock} de ${p.name}`);
          return c;
        }
        return c.map((i) => (i.product_id === p.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...c, { product_id: p.id, name: p.name, qty: 1, price: Number(p.price), stock: Number(p.stock) }];
    });
  }

  function updateQty(pid: string, qty: number) {
    setCart((c) =>
      c
        .map((i) => {
          if (i.product_id !== pid) return i;
          const capped = Math.min(Math.max(1, qty), i.stock);
          if (qty > i.stock) toast.error(`Máximo ${i.stock} unidades`);
          return { ...i, qty: capped };
        })
        .filter((i) => i.qty > 0),
    );
  }
  function removeFromCart(pid: string) {
    setCart((c) => c.filter((i) => i.product_id !== pid));
  }

  const total = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const change = method === "efectivo" ? Math.max(0, received - total) : 0;
  const canPay = cart.length > 0 && total > 0 && (method !== "efectivo" || received >= total);

  const today = new Date().toISOString().slice(0, 10);
  const todaySales = (sales ?? []).filter((s: any) => (s.sale_date ?? s.created_at?.slice(0, 10)) === today);
  const todayTotal = todaySales.reduce((s: number, x: any) => s + Number(x.total), 0);

  async function checkout() {
    if (!canPay) return;
    const notes = [
      `Caja · ${method}`,
      method === "efectivo" ? `Recibido ${fmtCLP(received)} · Vuelto ${fmtCLP(change)}` : null,
    ]
      .filter(Boolean)
      .join(" — ");
    try {
      const saved: any = await insert.mutateAsync({
        customer_name: "Venta mostrador",
        channel: "tienda",
        status: "paid",
        total,
        sale_date: today,
        items: cart.map((i) => ({ product_id: i.product_id, name: i.name, qty: i.qty, price: i.price })) as any,
        notes,
      });
      setShowReceipt({ id: saved?.id, items: cart, total, method, received, change, at: new Date() });
      setCart([]);
      setReceived(0);
      setMethod("efectivo");
    } catch {
      // toast handled by hook
    }
  }

  return (
    <>
      <PageHeader
        title="Caja"
        description="Punto de venta rápido para mostrador — tap, cobra, imprime"
        action={
          <div className="rounded-xl border bg-card px-4 py-2 text-right">
            <div className="text-xs text-muted-foreground">Hoy</div>
            <div className="text-lg font-bold">{fmtCLP(todayTotal)}</div>
            <div className="text-[10px] text-muted-foreground">{todaySales.length} venta(s)</div>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, SKU o categoría…"
              className="h-12 pl-10 text-base"
              autoFocus
            />
          </div>

          {favorites.length > 0 && !query && (
            <Card className="p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                <Star className="h-3.5 w-3.5 text-warning" /> Favoritos
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {favorites.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="flex flex-col items-start rounded-lg border bg-primary/5 p-3 text-left transition hover:bg-primary/10"
                  >
                    <span className="text-sm font-medium leading-tight">{p.name}</span>
                    <span className="mt-1 text-sm font-bold">{fmtCLP(Number(p.price))}</span>
                    <span className="text-[10px] text-muted-foreground">Stock: {p.stock}</span>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">Sin productos que coincidan.</Card>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {filtered.map((p: any) => {
                const stock = Number(p.stock);
                const inCart = cart.find((c) => c.product_id === p.id)?.qty ?? 0;
                const remaining = stock - inCart;
                const low = stock > 0 && stock <= 3;
                const willDeplete = inCart > 0 && remaining <= 0;
                return (
                  <div key={p.id} className="relative">
                    <button
                      onClick={() => addToCart(p)}
                      disabled={stock <= 0}
                      className={cn(
                        "flex h-full w-full flex-col items-start gap-1 rounded-xl border bg-card p-3 text-left transition active:scale-[0.98]",
                        stock <= 0 ? "opacity-50" : "hover:border-primary hover:shadow-elegant",
                      )}
                    >
                      <div className="flex w-full items-start justify-between gap-1">
                        <span className="line-clamp-2 text-sm font-medium leading-tight">{p.name}</span>
                        {(low || willDeplete) && (
                          <AlertTriangle
                            className={cn("h-3.5 w-3.5 shrink-0", willDeplete ? "text-destructive" : "text-warning")}
                          />
                        )}
                      </div>
                      <div className="mt-auto flex w-full items-end justify-between">
                        <span className="text-base font-bold">{fmtCLP(Number(p.price))}</span>
                        <span
                          className={cn(
                            "text-[10px]",
                            stock <= 0 ? "text-destructive" : low ? "text-warning" : "text-muted-foreground",
                          )}
                        >
                          {stock <= 0 ? "Sin stock" : `${remaining} disp.`}
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFav(p.id);
                      }}
                      className="absolute right-1 top-1 rounded-md p-1 text-muted-foreground hover:bg-accent"
                      aria-label="Favorito"
                    >
                      {favs.includes(p.id) ? (
                        <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                      ) : (
                        <StarOff className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {todaySales.length > 0 && (
            <Card className="p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                <Receipt className="h-3.5 w-3.5" /> Últimas ventas de hoy
              </div>
              <div className="max-h-48 space-y-1 overflow-y-auto">
                {todaySales.slice(0, 8).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent/60">
                    <span className="text-muted-foreground">
                      {new Date(s.created_at).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
                      {" · "}
                      {Array.isArray(s.items) ? s.items.length : 0} ítem(s)
                    </span>
                    <span className="font-semibold">{fmtCLP(Number(s.total))}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <Card className="sticky top-16 flex h-fit max-h-[calc(100vh-6rem)] flex-col p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <ShoppingCart className="h-4 w-4" /> Carrito
              {cart.length > 0 && <Badge variant="secondary">{cart.length}</Badge>}
            </div>
            {cart.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCart([])}>
                Vaciar
              </Button>
            )}
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Toca un producto para agregarlo</div>
            ) : (
              cart.map((i) => (
                <div key={i.product_id} className="rounded-lg border p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium">{i.name}</span>
                    <button onClick={() => removeFromCart(i.product_id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(i.product_id, i.qty - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        max={i.stock}
                        value={i.qty}
                        onChange={(e) => updateQty(i.product_id, Number(e.target.value))}
                        className="h-8 w-14 text-center"
                      />
                      <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateQty(i.product_id, i.qty + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="text-sm font-semibold">{fmtCLP(i.qty * i.price)}</span>
                  </div>
                  {i.qty >= i.stock && <div className="mt-1 text-[10px] text-warning">Stock máximo alcanzado</div>}
                </div>
              ))
            )}
          </div>

          <div className="mt-3 space-y-3 border-t pt-3">
            <div>
              <Label className="mb-1.5 block text-xs">Método de pago</Label>
              <div className="grid grid-cols-3 gap-1.5">
                {(["efectivo", "tarjeta", "transferencia"] as PayMethod[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-xs font-medium capitalize transition",
                      method === m ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {method === "efectivo" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Recibido</Label>
                  <Input
                    type="number"
                    min={0}
                    value={received || ""}
                    onChange={(e) => setReceived(Number(e.target.value))}
                    className="h-10 text-right"
                  />
                </div>
                <div>
                  <Label className="text-xs">Vuelto</Label>
                  <div className="flex h-10 items-center justify-end rounded-md border bg-muted/40 px-3 text-sm font-semibold">
                    {fmtCLP(change)}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-3">
              <span className="text-sm font-medium">Total</span>
              <span className="text-2xl font-bold">{fmtCLP(total)}</span>
            </div>

            <Button className="h-12 w-full text-base shadow-elegant" onClick={checkout} disabled={!canPay || insert.isPending}>
              {insert.isPending ? "Procesando…" : `Cobrar ${fmtCLP(total)}`}
            </Button>
          </div>
        </Card>
      </div>

      <Dialog open={!!showReceipt} onOpenChange={(v) => !v && setShowReceipt(null)}>
        <DialogContent className="max-w-sm print:shadow-none">
          <DialogHeader>
            <DialogTitle>Boleta</DialogTitle>
          </DialogHeader>
          {showReceipt && (
            <div className="space-y-3 text-sm">
              <div className="text-center">
                <div className="text-base font-bold">{active?.name}</div>
                <div className="text-xs text-muted-foreground">{showReceipt.at.toLocaleString("es-CL")}</div>
              </div>
              <div className="border-t border-dashed" />
              <div className="space-y-1">
                {showReceipt.items.map((i: CartItem) => (
                  <div key={i.product_id} className="flex justify-between gap-2">
                    <span>{i.qty}× {i.name}</span>
                    <span>{fmtCLP(i.qty * i.price)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed" />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{fmtCLP(showReceipt.total)}</span>
              </div>
              <div className="text-xs text-muted-foreground capitalize">Pago: {showReceipt.method}</div>
              {showReceipt.method === "efectivo" && (
                <>
                  <div className="flex justify-between text-xs">
                    <span>Recibido</span>
                    <span>{fmtCLP(showReceipt.received)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Vuelto</span>
                    <span>{fmtCLP(showReceipt.change)}</span>
                  </div>
                </>
              )}
              <div className="pt-2 text-center text-[10px] text-muted-foreground">¡Gracias por su compra!</div>
            </div>
          )}
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" className="flex-1" onClick={() => setShowReceipt(null)}>
              Cerrar
            </Button>
            <Button className="flex-1" onClick={() => window.print()}>
              <Printer className="mr-1.5 h-4 w-4" /> Imprimir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
