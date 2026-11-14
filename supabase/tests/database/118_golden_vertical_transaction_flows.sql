-- Golden vertical transaction flows for the P0 inventory-ledger contract.
-- These are isolated database integration scenarios, not a claim of browser/UI E2E.
-- Each vertical gets its own tenant, catalog, purchase, sale and compensating reversals.
BEGIN;
SELECT plan(20);

INSERT INTO auth.users (id)
VALUES ('00000000-0000-0000-0000-00000000a801');

INSERT INTO public.businesses (id, name, owner_id, plan, industry_profile)
VALUES
  ('00000000-0000-0000-0000-00000000b801', 'Golden Minimarket', '00000000-0000-0000-0000-00000000a801', 'starter', 'neighborhood_grocery'),
  ('00000000-0000-0000-0000-00000000b802', 'Golden Ferretería', '00000000-0000-0000-0000-00000000a801', 'starter', 'hardware_store'),
  ('00000000-0000-0000-0000-00000000b803', 'Golden Distribuidora', '00000000-0000-0000-0000-00000000a801', 'starter', 'wholesale_distribution');

INSERT INTO public.products (id, business_id, name, price, stock)
VALUES
  ('00000000-0000-0000-0000-00000000c801', '00000000-0000-0000-0000-00000000b801', 'Producto minimarket', 1200, 20),
  ('00000000-0000-0000-0000-00000000c802', '00000000-0000-0000-0000-00000000b802', 'Producto ferretería', 4500, 20),
  ('00000000-0000-0000-0000-00000000c803', '00000000-0000-0000-0000-00000000b803', 'Producto mayorista', 900, 20);

-- One receipt per vertical: all three start with 20 units and receive 10.
INSERT INTO public.purchases (id, business_id, status, total, items)
VALUES
  ('00000000-0000-0000-0000-00000000d801', '00000000-0000-0000-0000-00000000b801', 'received', 6000, jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-0000-0000-00000000c801', 'qty', 10, 'name', 'Producto minimarket'))),
  ('00000000-0000-0000-0000-00000000d802', '00000000-0000-0000-0000-00000000b802', 'received', 22000, jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-0000-0000-00000000c802', 'qty', 10, 'name', 'Producto ferretería'))),
  ('00000000-0000-0000-0000-00000000d803', '00000000-0000-0000-0000-00000000b803', 'received', 5000, jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-0000-0000-00000000c803', 'qty', 10, 'name', 'Producto mayorista')));

SELECT is((SELECT count(*)::int FROM public.businesses WHERE id IN ('00000000-0000-0000-0000-00000000b801','00000000-0000-0000-0000-00000000b802','00000000-0000-0000-0000-00000000b803') AND industry_profile IN ('neighborhood_grocery','hardware_store','wholesale_distribution')), 3, 'the three golden vertical profiles persist independently');
SELECT is((SELECT stock FROM public.products WHERE id = '00000000-0000-0000-0000-00000000c801'), 30, 'minimarket receipt increases only its product stock');
SELECT is((SELECT stock FROM public.products WHERE id = '00000000-0000-0000-0000-00000000c802'), 30, 'hardware receipt increases only its product stock');
SELECT is((SELECT stock FROM public.products WHERE id = '00000000-0000-0000-0000-00000000c803'), 30, 'wholesale receipt increases only its product stock');
SELECT is((SELECT count(*)::int FROM public.inventory_movements WHERE source_type = 'purchase' AND source_id IN ('00000000-0000-0000-0000-00000000d801','00000000-0000-0000-0000-00000000d802','00000000-0000-0000-0000-00000000d803')), 3, 'each receipt creates a source-linked inventory movement');

-- One sale per vertical with deliberately different quantities.
INSERT INTO public.sales (id, business_id, status, total, items)
VALUES
  ('00000000-0000-0000-0000-00000000e801', '00000000-0000-0000-0000-00000000b801', 'paid', 2400, jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-0000-0000-00000000c801', 'qty', 2, 'name', 'Producto minimarket'))),
  ('00000000-0000-0000-0000-00000000e802', '00000000-0000-0000-0000-00000000b802', 'paid', 13500, jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-0000-0000-00000000c802', 'qty', 3, 'name', 'Producto ferretería'))),
  ('00000000-0000-0000-0000-00000000e803', '00000000-0000-0000-0000-00000000b803', 'paid', 4500, jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-0000-0000-00000000c803', 'qty', 5, 'name', 'Producto mayorista')));

SELECT is((SELECT stock FROM public.products WHERE id = '00000000-0000-0000-0000-00000000c801'), 28, 'minimarket sale decrements its own stock by two');
SELECT is((SELECT stock FROM public.products WHERE id = '00000000-0000-0000-0000-00000000c802'), 27, 'hardware sale decrements its own stock by three');
SELECT is((SELECT stock FROM public.products WHERE id = '00000000-0000-0000-0000-00000000c803'), 25, 'wholesale sale decrements its own stock by five');
SELECT is((SELECT count(*)::int FROM public.inventory_movements WHERE source_type = 'sale' AND source_id IN ('00000000-0000-0000-0000-00000000e801','00000000-0000-0000-0000-00000000e802','00000000-0000-0000-0000-00000000e803')), 3, 'each sale creates a source-linked inventory movement');
SELECT is((SELECT count(*)::int FROM public.transactions WHERE business_id IN ('00000000-0000-0000-0000-00000000b801','00000000-0000-0000-0000-00000000b802','00000000-0000-0000-0000-00000000b803')), 6, 'each vertical records one purchase expense and one sale income transaction');

-- Cancellation must create compensating movements and restore each business to its
-- pre-sale state, then to its pre-receipt state. No historical row is rewritten.
UPDATE public.sales SET status = 'cancelled'
WHERE id IN ('00000000-0000-0000-0000-00000000e801','00000000-0000-0000-0000-00000000e802','00000000-0000-0000-0000-00000000e803');

SELECT is((SELECT stock FROM public.products WHERE id = '00000000-0000-0000-0000-00000000c801'), 30, 'minimarket sale cancellation restores stock');
SELECT is((SELECT stock FROM public.products WHERE id = '00000000-0000-0000-0000-00000000c802'), 30, 'hardware sale cancellation restores stock');
SELECT is((SELECT stock FROM public.products WHERE id = '00000000-0000-0000-0000-00000000c803'), 30, 'wholesale sale cancellation restores stock');

UPDATE public.purchases SET status = 'cancelled'
WHERE id IN ('00000000-0000-0000-0000-00000000d801','00000000-0000-0000-0000-00000000d802','00000000-0000-0000-0000-00000000d803');

SELECT is((SELECT stock FROM public.products WHERE id = '00000000-0000-0000-0000-00000000c801'), 20, 'minimarket purchase cancellation reverses receipt');
SELECT is((SELECT stock FROM public.products WHERE id = '00000000-0000-0000-0000-00000000c802'), 20, 'hardware purchase cancellation reverses receipt');
SELECT is((SELECT stock FROM public.products WHERE id = '00000000-0000-0000-0000-00000000c803'), 20, 'wholesale purchase cancellation reverses receipt');
SELECT is((SELECT count(*)::int FROM public.inventory_movements WHERE source_type IN ('sale_reversal','purchase_reversal') AND source_id IN ('00000000-0000-0000-0000-00000000e801','00000000-0000-0000-0000-00000000e802','00000000-0000-0000-0000-00000000e803','00000000-0000-0000-0000-00000000d801','00000000-0000-0000-0000-00000000d802','00000000-0000-0000-0000-00000000d803')), 6, 'all three sales and purchases have immutable compensating ledger rows');

SELECT is((SELECT count(*)::int FROM public.inventory_movements m JOIN public.products p ON p.id = m.product_id WHERE m.source_id IN ('00000000-0000-0000-0000-00000000d801','00000000-0000-0000-0000-00000000d802','00000000-0000-0000-0000-00000000d803','00000000-0000-0000-0000-00000000e801','00000000-0000-0000-0000-00000000e802','00000000-0000-0000-0000-00000000e803') AND m.business_id = p.business_id), 12, 'all ledger rows remain linked to their product tenant');
SELECT is((SELECT count(*)::int FROM public.transactions WHERE business_id IN ('00000000-0000-0000-0000-00000000b801','00000000-0000-0000-0000-00000000b802','00000000-0000-0000-0000-00000000b803')), 0, 'cancelling both source documents removes their generated transactions');
SELECT is((SELECT count(*)::int FROM public.inventory_movements WHERE business_id IN ('00000000-0000-0000-0000-00000000b801','00000000-0000-0000-0000-00000000b802','00000000-0000-0000-0000-00000000b803')), 12, 'each vertical retains its four original and compensating movement records');

SELECT * FROM finish();
ROLLBACK;
