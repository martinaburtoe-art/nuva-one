import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { PageHeader, EmptyState } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ModuleGuard } from "@/components/module-guard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  ArrowDownToLine,
  Boxes,
  Download,
  ImagePlus,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import {
  fmtCLP,
  useBizDelete,
  useBizInsert,
  useBizList,
  useBizUpdate,
} from "@/lib/biz-data";
import { downloadCsv } from "@/lib/export";
import { canWriteOperations, useActiveBusinessId, useMyRole } from "@/lib/use-business";
import { validateProductImage, uploadProductImage } from "@/lib/product-image";
import { toast } from "sonner";
import { NuvaInventoryIntelligence } from "@/components/nuva-inventory-intelligence";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({ meta: [{ title: "Inventario — Nüva One" }] }),
  component: Inventory,
});

function Inventory() {
  const { data: myRole } = useMyRole();
  const canWrite = canWriteOperations(myRole);
  const [activeBusinessId] = useActiveBusinessId();
  const { data, isLoading } = useBizList<any>("products", { order: "created_at" });
  const insert = useBizInsert("products");
  const update = useBizUpdate("products");
  const remove = useBizDelete("products");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openCreate() {
    setEditing(null);
    setImageFile(null);
    setImagePreview(null);
    setOpen(true);
  }

  function openEdit(product: any) {
    setEditing(product);
    setImageFile(null);
    setImagePreview(product.image_url ?? null);
    setOpen(true);
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onPickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const error = validateProductImage(file);
    if (error) {
      toast.error(error);
      event.target.value = "";
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    let imageUrl = editing?.image_url ?? null;

    if (imageFile && activeBusinessId) {
      setUploadingImage(true);
      try {
        imageUrl = await uploadProductImage(activeBusinessId, imageFile);
      } catch {
        toast.error("No se pudo subir la imagen. Intenta de nuevo.");
        setUploadingImage(false);
        return;
      }
      setUploadingImage(false);
    } else if (imagePreview === null) {
      imageUrl = null;
    }

    const payload = {
      sku: form.get("sku"),
      name: form.get("name"),
      category: form.get("category"),
      cost: Number(form.get("cost") || 0),
      price: Number(form.get("price") || 0),
      stock: Number(form.get("stock") || 0),
      low_stock_threshold: Number(form.get("low_stock_threshold") || 5),
      image_url: imageUrl,
    };

    if (editing) {
      await update.mutateAsync({ id: editing.id, patch: payload });
    } else {
      await insert.mutateAsync(payload);
    }

    setOpen(false);
    setEditing(null);
    setImageFile(null);
    setImagePreview(null);
  }

  const products = data ?? [];
  const lowStock = products.filter(
    (product) => Number(product.stock ?? 0) <= Number(product.low_stock_threshold ?? 0),
  );
  const topLowStock = [...lowStock]
    .sort((a, b) => {
      const gapA = Math.max(
        0,
        Number(a.low_stock_threshold ?? 0) - Number(a.stock ?? 0),
      );
      const gapB = Math.max(
        0,
        Number(b.low_stock_threshold ?? 0) - Number(b.stock ?? 0),
      );
      return gapB - gapA;
    })
    .slice(0, 3);
  const replenishmentValue = lowStock.reduce(
    (sum, product) =>
      sum +
      Math.max(
        0,
        Number(product.low_stock_threshold ?? 0) - Number(product.stock ?? 0),
      ) * Number(product.cost ?? 0),
    0,
  );

  const action = (
    <div className="flex gap-2">
      <Button
        variant="outline"
        disabled={products.length === 0}
        onClick={() =>
          downloadCsv(
            "inventario.csv",
            products.map((product) => ({
              sku: product.sku ?? "",
              nombre: product.name,
              categoria: product.category ?? "",
              costo: product.cost ?? 0,
              precio: product.price ?? 0,
              stock: product.stock ?? 0,
              alerta_stock_bajo: product.low_stock_threshold ?? 0,
            })),
          )
        }
      >
        <Download className="mr-1.5 h-4 w-4" />
        Exportar CSV
      </Button>
      {canWrite && (
        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            if (!value) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button className="shadow-elegant" onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              Agregar producto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar producto" : "Nuevo producto"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label>Imagen referencial</Label>
                <div className="mt-1.5 flex items-center gap-3">
                  {imagePreview ? (
                    <div className="relative h-20 w-20 shrink-0">
                      <img
                        src={imagePreview}
                        alt="Vista previa del producto"
                        className="h-20 w-20 rounded-lg border object-cover"
                      />
                      <button
                        type="button"
                        onClick={clearImage}
                        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                        aria-label="Quitar imagen"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground transition-colors hover:bg-accent"
                    >
                      <ImagePlus className="h-5 w-5" />
                      <span className="text-[10px]">Subir foto</span>
                    </button>
                  )}
                  <div className="text-xs text-muted-foreground">
                    JPG, PNG, WEBP o GIF. Máx. 5MB.
                    {imagePreview && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-1 block font-medium text-primary hover:underline"
                      >
                        Cambiar imagen
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={onPickImage}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input id="sku" name="sku" defaultValue={editing?.sku ?? ""} />
                </div>
                <div>
                  <Label htmlFor="category">Categoría</Label>
                  <Input
                    id="category"
                    name="category"
                    defaultValue={editing?.category ?? ""}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" name="name" defaultValue={editing?.name ?? ""} required />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="cost">Costo</Label>
                  <Input
                    id="cost"
                    name="cost"
                    type="number"
                    min={0}
                    defaultValue={editing?.cost ?? 0}
                  />
                </div>
                <div>
                  <Label htmlFor="price">Precio</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min={0}
                    defaultValue={editing?.price ?? ""}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="stock">Stock</Label>
                  <Input
                    id="stock"
                    name="stock"
                    type="number"
                    min={0}
                    defaultValue={editing?.stock ?? 0}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="low_stock_threshold">Alerta stock bajo</Label>
                <Input
                  id="low_stock_threshold"
                  name="low_stock_threshold"
                  type="number"
                  min={0}
                  defaultValue={editing?.low_stock_threshold ?? 5}
                />
              </div>

              {editing && (
                <p className="text-xs text-muted-foreground">
                  Editar el stock aquí es un ajuste manual (conteo físico, merma). Las ventas y compras ya mueven el stock automáticamente.
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={insert.isPending || update.isPending || uploadingImage}
              >
                {uploadingImage
                  ? "Subiendo imagen..."
                  : editing
                    ? "Guardar cambios"
                    : "Guardar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );

  return (
    <ModuleGuard module="inventory">
      <div>
        <PageHeader
          title="Inventario"
          description="Catálogo de productos y niveles de stock"
          action={action}
        />

        <div className="mb-6">
          <NuvaInventoryIntelligence products={products} />
        </div>

        {lowStock.length > 0 && (
          <Card className="mb-6 overflow-hidden border-warning/40 bg-warning/5">
            <div className="border-b border-warning/20 p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">Nüva Intelligence · Inventario</p>
                      <Badge className="bg-warning/15 text-warning">Atención</Badge>
                    </div>
                    <h2 className="mt-1 text-lg font-semibold tracking-tight">
                      {lowStock.length} producto{lowStock.length === 1 ? " necesita" : "s necesitan"} atención
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                      Nüva compara el stock actual con el umbral configurado para cada producto y prioriza dónde conviene actuar primero.
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-warning/20 bg-background/70 px-3 py-2 text-left sm:text-right">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Reposición estimada</p>
                  <p className="text-base font-semibold">{fmtCLP(replenishmentValue)}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
              {topLowStock.map((product) => {
                const stock = Number(product.stock ?? 0);
                const threshold = Number(product.low_stock_threshold ?? 0);
                const gap = Math.max(0, threshold - stock);
                const critical = stock === 0;

                return (
                  <div key={product.id} className="rounded-xl border bg-background/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <Badge
                        className={
                          critical
                            ? "bg-destructive/10 text-destructive"
                            : "bg-warning/15 text-warning"
                        }
                      >
                        {critical ? "Sin stock" : "Bajo"}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xl font-semibold">{stock}</p>
                        <p className="text-[11px] text-muted-foreground">actual</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{threshold}</p>
                        <p className="text-[11px] text-muted-foreground">umbral · faltan {gap}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-3 border-t border-warning/20 bg-background/35 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <ArrowDownToLine className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <strong className="text-foreground">Siguiente decisión:</strong> revisar primero los productos con mayor brecha respecto a su umbral.
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  document
                    .getElementById("inventory-table")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                <ShoppingCart className="mr-1.5 h-4 w-4" />
                Revisar inventario
              </Button>
            </div>
          </Card>
        )}

        <Card id="inventory-table">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {[...Array(5)].map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="Tu catálogo está vacío"
              description="Agrega tu primer producto para empezar a gestionar inventario."
              action={
                canWrite ? (
                  <Button onClick={openCreate}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Agregar producto
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead />
                  <TableHead>SKU</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-9 w-9 rounded-md border object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-dashed text-muted-foreground">
                          <ImagePlus className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {product.sku ?? "—"}
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.category ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(product.stock ?? 0) <= Number(product.low_stock_threshold ?? 0) ? (
                        <Badge className="bg-warning/15 text-warning">
                          {product.stock} bajo
                        </Badge>
                      ) : (
                        <span className="font-medium">{product.stock}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {fmtCLP(Number(product.price ?? 0))}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => remove.mutate(product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </ModuleGuard>
  );
}
