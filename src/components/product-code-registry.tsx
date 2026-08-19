import { useCallback, useEffect, useMemo, useState } from 'react';
import { Barcode, CheckCircle2, Plus, ScanBarcode, Search, Sparkles, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LiveScannerView } from '@/components/scanner/LiveScannerView';
import { supabase } from '@/integrations/supabase/client';
import { useActiveBusinessId, useMyRole, canWriteOperations } from '@/lib/use-business';
import { normalizeProductCode, resolveProductCode } from '@/lib/product-resolver';
import { toast } from 'sonner';

type Product = { id: string; name: string | null; sku: string | null; stock: number | null; price?: number | null };
type ProductCode = { id: string; product_id: string; code: string; code_type: string; is_primary: boolean; is_active: boolean; created_at: string };

const CODE_TYPES = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'codabar', 'qr_code', 'supplier', 'alternate', 'barcode'];

export function ProductCodeRegistry({ products }: { products: Product[] }) {
  const [businessId] = useActiveBusinessId();
  const { data: role } = useMyRole();
  const canWrite = canWriteOperations(role);
  const [codes, setCodes] = useState<ProductCode[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [code, setCode] = useState('');
  const [codeType, setCodeType] = useState('ean_13');
  const [productId, setProductId] = useState('');
  const [sku, setSku] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCodes, setLoadingCodes] = useState(false);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const loadCodes = useCallback(async () => {
    if (!businessId) return;
    setLoadingCodes(true);
    try {
      const { data, error } = await (supabase as any).from('product_codes')
        .select('id,product_id,code,code_type,is_primary,is_active,created_at')
        .eq('business_id', businessId).eq('is_active', true).order('created_at', { ascending: false });
      if (error) throw error;
      setCodes((data ?? []) as ProductCode[]);
    } catch (error: any) {
      toast.error(error?.message ?? 'No se pudieron cargar los códigos.');
    } finally { setLoadingCodes(false); }
  }, [businessId]);

  useEffect(() => { void loadCodes(); }, [loadCodes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return codes;
    return codes.filter((c) => {
      const p = productById.get(c.product_id);
      return c.code.toLowerCase().includes(q) || c.code_type.toLowerCase().includes(q) || p?.name?.toLowerCase().includes(q) || p?.sku?.toLowerCase().includes(q);
    });
  }, [codes, productById, query]);

  function reset() {
    setCode(''); setCodeType('ean_13'); setProductId(''); setSku(''); setOpen(false); setScanOpen(false);
  }

  async function generateSku() {
    if (!businessId || !canWrite) return;
    try {
      const { data, error } = await (supabase as any).rpc('generate_product_sku', { p_business_id: businessId, p_prefix: 'NVA-PRD' });
      if (error) throw error;
      setSku(String(data ?? ''));
      toast.success('SKU generado.');
    } catch (error: any) { toast.error(error?.message ?? 'No se pudo generar el SKU.'); }
  }

  async function save() {
    if (!canWrite || !businessId) return;
    const normalizedCode = normalizeProductCode(code);
    if (!productId) return toast.error('Selecciona un producto.');
    if (!normalizedCode) return toast.error('Ingresa o escanea un código.');
    setLoading(true);
    try {
      const resolution = await resolveProductCode(normalizedCode);
      if (resolution.status === 'DUPLICATE') return toast.error('Este código tiene múltiples asociaciones y debe resolverse antes de guardarlo.');
      if (resolution.status === 'FOUND' && resolution.product?.product_id !== productId) return toast.error(`Este código ya pertenece a ${resolution.product?.name ?? 'otro producto'}.`);
      if (resolution.status === 'UNAUTHORIZED') return toast.error('No autorizado.');

      const product = productById.get(productId);
      if (sku.trim() && sku.trim() !== product?.sku) {
        const { error: skuError } = await (supabase as any).from('products').update({ sku: sku.trim() }).eq('id', productId).eq('business_id', businessId);
        if (skuError) throw skuError;
      }

      const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
      const { error } = await (supabase as any).from('product_codes').insert({
        business_id: businessId,
        product_id: productId,
        code: normalizedCode,
        code_type: codeType,
        is_primary: codes.every((c) => c.product_id !== productId),
        created_by: userId,
      });
      if (error) throw error;
      toast.success('Código asociado correctamente.');
      await loadCodes();
      reset();
    } catch (error: any) { toast.error(error?.message ?? 'No se pudo guardar el código.'); }
    finally { setLoading(false); }
  }

  async function deactivate(id: string) {
    if (!canWrite || !businessId) return;
    const { error } = await (supabase as any).from('product_codes').update({ is_active: false }).eq('id', id).eq('business_id', businessId);
    if (error) toast.error(error.message); else { toast.success('Código desactivado.'); await loadCodes(); }
  }

  async function onDetected(result: { rawValue: string; format?: string }) {
    const normalized = normalizeProductCode(result.rawValue);
    setCode(normalized);
    if (result.format && CODE_TYPES.includes(result.format)) setCodeType(result.format);
    setScanOpen(false);

    try {
      const resolution = await resolveProductCode(normalized);
      if (resolution.status === 'FOUND' && resolution.product) {
        setProductId(resolution.product.product_id);
        setSku(resolution.product.sku ?? '');
        toast.success(`Código ya registrado · ${resolution.product.name ?? 'Producto'}`);
      } else if (resolution.status === 'DUPLICATE') {
        toast.error('Código duplicado: selecciona la asociación correcta antes de continuar.');
      } else if (resolution.status === 'NOT_FOUND') {
        toast.success(`Código disponible: ${normalized}`);
      }
    } catch (error: any) {
      toast.error(error?.message ?? 'No se pudo consultar el código.');
    }
    setOpen(true);
  }

  return (
    <Card className="overflow-hidden border-primary/15">
      <div className="p-5 md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><Barcode className="h-4 w-4" /> Códigos y SKU</div>
            <h2 className="mt-2 text-xl font-semibold">Identificación profesional de productos</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">SKU interno, EAN/UPC/QR y códigos alternativos con un único lector en vivo.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setScanOpen(true)} disabled={!canWrite}><ScanBarcode className="mr-2 h-4 w-4" />Escanear código</Button>
            <Button onClick={() => setOpen(true)} disabled={!canWrite}><Plus className="mr-2 h-4 w-4" />Nuevo código / SKU</Button>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por código, SKU o producto…" className="pl-9" /></div><Badge variant="secondary">{filtered.length} códigos</Badge></div>
        <div className="mt-4 overflow-x-auto rounded-xl border">
          {loadingCodes ? <div className="p-6 text-sm text-muted-foreground">Cargando códigos…</div> : !filtered.length ? <div className="p-8 text-center text-sm text-muted-foreground"><Tag className="mx-auto mb-2 h-7 w-7" />Aún no hay códigos externos registrados.</div> : (
            <Table><TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>SKU</TableHead><TableHead>Código</TableHead><TableHead>Tipo</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acción</TableHead></TableRow></TableHeader><TableBody>
              {filtered.slice(0, 50).map((c) => { const p = productById.get(c.product_id); return <TableRow key={c.id}><TableCell className="font-medium">{p?.name ?? 'Producto'}</TableCell><TableCell>{p?.sku ?? '—'}</TableCell><TableCell className="font-mono text-xs">{c.code}</TableCell><TableCell><Badge variant="outline">{c.code_type}</Badge></TableCell><TableCell>{c.is_primary ? <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Principal</Badge> : <Badge variant="secondary">Activo</Badge>}</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" disabled={!canWrite} onClick={() => void deactivate(c.id)}>Desactivar</Button></TableCell></TableRow>; })}
            </TableBody></Table>
          )}
        </div>
      </div>
      {scanOpen && <LiveScannerView open={scanOpen} title="Escanear código" onDetect={(result) => void onDetected(result)} onClose={() => setScanOpen(false)} onError={(error) => console.error('Live scanner error', error)} />}
      <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Nuevo código / SKU</DialogTitle></DialogHeader><div className="space-y-4">
        <div><Label>Producto</Label><Select value={productId} onValueChange={setProductId}><SelectTrigger><SelectValue placeholder="Selecciona un producto" /></SelectTrigger><SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name ?? 'Producto'}{p.sku ? ` · ${p.sku}` : ''}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><div><Label>SKU interno</Label><Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="NVA-PRD-000001" /></div><Button type="button" variant="outline" className="self-end" onClick={() => void generateSku()} disabled={!canWrite || !businessId}><Sparkles className="mr-2 h-4 w-4" />Generar</Button></div>
        <div><Label>Código</Label><div className="flex gap-2"><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Escanea o escribe el código" className="font-mono" /><Button type="button" variant="outline" onClick={() => setScanOpen(true)}><ScanBarcode className="mr-2 h-4 w-4" />Escanear</Button></div></div>
        <div><Label>Tipo de código</Label><Select value={codeType} onValueChange={setCodeType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CODE_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={reset}>Cancelar</Button><Button disabled={loading || !canWrite} onClick={() => void save()}>{loading ? 'Guardando…' : 'Guardar'}</Button></div>
      </div></DialogContent></Dialog>
    </Card>
  );
}
