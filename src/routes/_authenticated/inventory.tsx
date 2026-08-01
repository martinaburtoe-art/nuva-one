import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef } from "react";
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
import { Plus, Trash2, Pencil, Boxes, AlertTriangle, Download, ImagePlus, X } from "lucide-react";
import { useBizList, useBizInsert, useBizUpdate, useBizDelete, fmtCLP } from "@/lib/biz-data";
import { downloadCsv } from "@/lib/export";
import { useActiveBusinessId } from "@/lib/use-business";
import { validateProductImage, uploadProductImage } from "@/lib/product-image";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({ meta: [{ title: "Inventario — Nüva One" }] }),
  component: Inventory,
});

import { useMyRole, canWriteOperations } from "@/lib/use-business";

function Inventory() {
  const { data: myRole } = useMyRole();
  const canWrite = canWriteOperations(myRole);
  const [activeBusinessId] = useActiveBusinessId();
  const { data, isLoading } = useBizList<any>("products", { order: "created_at" });
  const insert = useBizInsert("products");
  const upd = useBizUpdate("products");
  const del = useBizDelete("products");
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
  function openEdit(p: any) {
    setEditing(p);
    setImageFile(null);
    setImagePreview(p.image_url ?? null);
    setOpen(true);
  }

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const error = validateProductImage(file);
    if (error) {
      toast.error(error);
      e.target.value = "";
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

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
      imageUrl = null; // user removed the existing image
    }

    const payload = {
      sku: fd.get("sku"),
      name: fd.get("name"),
      category: fd.get("category"),
      cost: Number(fd.get("cost")),
      price: Number(fd.get("price")),
      stock: Number(fd.get("stock")),
      low_stock_threshold: Number(fd.get("low_stock_threshold")) || 5,
      image_url: imageUrl,
    };
    if (editing) {
      await upd.mutateAsync({ id: editing.id, patch: payload });
    } else {
      await insert.mutateAsync(payload);
    }
    setOpen(false);
    setEditing(null);
    setImageFile(null);
    setImagePreview(null);
  }

  const lowStock = (data ?? []).filter((p) => p.stock <= p.low_stock_threshold);

  return (
    <ModuleGuard module="inventory">
    <>
      <PageHeader
        title="Inventario"
        description="Catálogo de productos y niveles de stock"
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={!data || data.length === 0}
              onClick={() =>
                downloadCsv(
                  "inventario.csv",
                  (data ?? []).map((p) => ({
                    sku: p.sku ?? "",
                    nombre: p.name,
                    categoria: p.category ?? "",
                    costo: p.cost ?? 0,
                    precio: p.price ?? 0,
                    stock: p.stock ?? 0,
                    alerta_stock_bajo: p.low_stock_threshold ?? 0,
                  })),
                )
              }
            >
              <Download className="mr-1.5 h-4 w-4" /> Exportar CSV
            </Button>
            {canWrite && (
              <Dialog
                open={open}
                onOpenChange={(v) => {
                  setOpen(v);
                  if (!v) setEditing(null);
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
                        defaultValue={editing?.low_stock_threshold ?? 5}
                      />
                    </div>
                    {editing && (
                      <p className="text-xs text-muted-foreground">
                        Editar el stock aquí es un ajuste manual (conteo físico, merma). Las ventas
                        y compras ya mueven el stock automáticamente.
                      </p>
                    )}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={insert.isPending || upd.isPending || uploadingImage}
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
        }
      />

      {lowStock.length > 0 && (
        <Card className="mb-6 border-warning/40 bg-warning/5 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium">
              {lowStock.length} producto(s) con stock bajo
            </span>
          </div>
        </Card>
      )}

      <Card>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
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
              {data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="h-9 w-9 rounded-md border object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-md border border-dashed text-muted-foreground">
                        <ImagePlus className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.sku ?? "—"}
                  </TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.category ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {p.stock <= p.low_stock_threshold ? (
                      <Badge className="bg-warning/15 text-warning">{p.stock} bajo</Badge>
                    ) : (
                      <span className="font-medium">{p.stock}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{fmtCLP(Number(p.price))}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => del.mutate(p.id)}>
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
    </>
    </ModuleGuard>
  );
}
