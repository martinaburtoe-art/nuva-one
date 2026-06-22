import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, EmptyState } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Instagram, Facebook, Calendar, Megaphone } from "lucide-react";
import { useBizList, useBizInsert, useBizDelete } from "@/lib/biz-data";

export const Route = createFileRoute("/_authenticated/marketing")({
  head: () => ({ meta: [{ title: "Marketing — NovaFlow" }] }),
  component: Marketing,
});

function Marketing() {
  const { data, isLoading } = useBizList<any>("marketing_posts", { order: "scheduled_for" });
  const insert = useBizInsert("marketing_posts");
  const del = useBizDelete("marketing_posts");
  const [open, setOpen] = useState(false);
  const [platforms, setPlatforms] = useState<string[]>(["instagram"]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await insert.mutateAsync({
      content: fd.get("content"),
      platforms,
      scheduled_for: fd.get("scheduled_for") || null,
      status: "scheduled",
    });
    setOpen(false);
  }

  return (
    <>
      <PageHeader title="Marketing" description="Programa publicaciones en Instagram y Facebook" action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1.5 h-4 w-4" />Nueva publicación</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Programar publicación</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div><Label htmlFor="content">Contenido</Label><Textarea id="content" name="content" rows={4} required /></div>
              <div>
                <Label>Plataformas</Label>
                <div className="mt-2 flex gap-2">
                  {["instagram", "facebook"].map((p) => (
                    <button key={p} type="button"
                      onClick={() => setPlatforms((cur) => cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p])}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${platforms.includes(p) ? "border-primary bg-accent" : ""}`}>
                      {p === "instagram" ? <Instagram className="h-4 w-4" /> : <Facebook className="h-4 w-4" />}
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div><Label htmlFor="scheduled_for">Fecha y hora</Label><Input id="scheduled_for" name="scheduled_for" type="datetime-local" /></div>
              <Button type="submit" className="w-full">Programar</Button>
            </form>
          </DialogContent>
        </Dialog>
      } />

      <Card className="mb-6 border-primary/30 bg-accent/50 p-5">
        <div className="flex items-center gap-3">
          <Instagram className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">Conecta tu cuenta de Meta Business</p>
            <p className="text-xs text-muted-foreground">Para publicar directamente en Instagram y Facebook necesitas tu propia cuenta de Meta Developer.</p>
          </div>
          <Button variant="outline" size="sm">Conectar Meta</Button>
        </div>
      </Card>

      {isLoading ? <Skeleton className="h-64 w-full" />
        : !data || data.length === 0 ? <EmptyState icon={Megaphone} title="Sin publicaciones programadas" description="Crea tu primera publicación." />
        : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex gap-1">
                  {p.platforms?.includes("instagram") && <Badge variant="outline"><Instagram className="mr-1 h-3 w-3" />IG</Badge>}
                  {p.platforms?.includes("facebook") && <Badge variant="outline"><Facebook className="mr-1 h-3 w-3" />FB</Badge>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => del.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <p className="text-sm">{p.content}</p>
              {p.scheduled_for && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" /> {new Date(p.scheduled_for).toLocaleString("es-CL")}
                </div>
              )}
            </Card>
          ))}
        </div>
      }
    </>
  );
}
