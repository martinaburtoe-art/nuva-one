-- Golden Business vertical lifecycle regression.
-- Database integration coverage for the three P0 operating templates.
-- Synthetic fixtures only; this is not a UI/E2E or production certification.
-- Requires the P0 movement-ledger lifecycle migration in the test schema.

BEGIN;
SELECT plan(36);

INSERT INTO auth.users (id) VALUES
  ('00000000-0000-0000-0000-00000000a901'),
  ('00000000-0000-0000-0000-00000000a902'),
  ('00000000-0000-0000-0000-00000000a903');

INSERT INTO public.businesses (id, name, owner_id, plan, industry_profile)
VALUES
  ('00000000-0000-0000-0000-00000000b901', 'Golden Almacen Los Robles', '00000000-0000-0000-0000-00000000a901', 'starter', 'neighborhood_grocery'),
  ('00000000-0000-0000-0000-00000000b902', 'Golden Ferreteria El Martillo', '00000000-0000-0000-0000-00000000a902', 'starter', 'hardware_store'),
  ('00000000-0000-0000-0000-00000000b903', 'Golden Distribuidora Central Maule', '00000000-0000-0000-0000-00000000a903', 'starter', 'wholesale_distribution');

INSERT INTO public.products (id, business_id, name, price, stock)
VALUES
  ('00000000-0000-0000-0000-00000000c901', '00000000-0000-0000-0000-00000000b901', 'Arroz grado 1 1kg', 1800, 10),
  ('00000000-0000-0000-0000-00000000c902', '00000000-0000-0000-0000-00000000b902', 'Tornillo hexagonal M8', 250, 10),
  ('00000000-0000-0000-0000-00000000c903', '00000000-0000-0000-0000-00000000b903', 'Caja de guantes industriales', 12000, 10);

INSERT INTO public.purchases (id, business_id, status, total, items)
VALUES
  ('00000000-0000-0000-0000-00000000d901', '00000000-0000-0000-0000-00000000b901', 'received', 9000,
    jsonb_build_array(jsonb_build_object('product_id','00000000-0000-0000-0000-00000000c901','qty',5,'name','Arroz grado 1 1kg'))),
  ('00000000-0000-0000-0000-00000000d902', '00000000-0000-0000-0000-00000000b902', 'received', 1250,
    jsonb_build_array(jsonb_build_object('product_id','00000000-0000-0000-0000-00000000c902','qty',5,'name','Tornillo hexagonal M8'))),
  ('00000000-0000-0000-0000-00000000d903', '00000000-0000-0000-0000-00000000b903', 'received', 60000,
    jsonb_build_array(jsonb_build_object('product_id','00000000-0000-0000-0000-00000000c903','qty',5,'name','Caja de guantes industriales')));

SELECT is((SELECT industry_profile FROM public.businesses WHERE id='00000000-0000-0000-0000-00000000b901'), 'neighborhood_grocery', 'Almacen fixture keeps its operational profile');
SELECT is((SELECT industry_profile FROM public.businesses WHERE id='00000000-0000-0000-0000-00000000b902'), 'hardware_store', 'Ferreteria fixture keeps its operational profile');
SELECT is((SELECT industry_profile FROM public.businesses WHERE id='00000000-0000-0000-0000-00000000b903'), 'wholesale_distribution', 'Distribuidora fixture keeps its operational profile');

SELECT is((SELECT stock FROM public.products WHERE id='00000000-0000-0000-0000-00000000c901'), 15, 'Almacen receipt increases only its product stock');
SELECT is((SELECT stock FROM public.products WHERE id='00000000-0000-0000-0000-00000000c902'), 15, 'Ferreteria receipt increases only its product stock');
SELECT is((SELECT stock FROM public.products WHERE id='00000000-0000-0000-0000-00000000c903'), 15, 'Distribuidora receipt increases only its product stock');

SELECT is((SELECT count(*)::int FROM public.inventory_movements WHERE business_id='00000000-0000-0000-0000-00000000b901' AND source_type='purchase' AND source_id='00000000-0000-0000-0000-00000000d901'), 1, 'Almacen receipt writes one source-linked movement');
SELECT is((SELECT count(*)::int FROM public.inventory_movements WHERE business_id='00000000-0000-0000-0000-00000000b902' AND source_type='purchase' AND source_id='00000000-0000-0000-0000-00000000d902'), 1, 'Ferreteria receipt writes one source-linked movement');
SELECT is((SELECT count(*)::int FROM public.inventory_movements WHERE business_id='00000000-0000-0000-0000-00000000b903' AND source_type='purchase' AND source_id='00000000-0000-0000-0000-00000000d903'), 1, 'Distribuidora receipt writes one source-linked movement');

INSERT INTO public.sales (id, business_id, status, total, items)
VALUES
  ('00000000-0000-0000-0000-00000000e901', '00000000-0000-0000-0000-00000000b901', 'paid', 3600,
    jsonb_build_array(jsonb_build_object('product_id','00000000-0000-0000-0000-00000000c901','qty',2,'name','Arroz grado 1 1kg'))),
  ('00000000-0000-0000-0000-00000000e902', '00000000-0000-0000-0000-00000000b902', 'paid', 500,
    jsonb_build_array(jsonb_build_object('product_id','00000000-0000-0000-0000-00000000c902','qty',2,'name','Tornillo hexagonal M8'))),
  ('00000000-0000-0000-0000-00000000e903', '00000000-0000-0000-0000-00000000b903', 'paid', 24000,
    jsonb_build_array(jsonb_build_object('product_id','00000000-0000-0000-0000-00000000c903','qty',2,'name','Caja de guantes industriales')));

SELECT is((SELECT stock FROM public.products WHERE id='00000000-0000-0000-0000-00000000c901'), 13, 'Almacen sale decrements its product stock');
SELECT is((SELECT stock FROM public.products WHERE id='00000000-0000-0000-0000-00000000c902'), 13, 'Ferreteria sale decrements its product stock');
SELECT is((SELECT stock FROM public.products WHERE id='00000000-0000-0000-0000-00000000c903'), 13, 'Distribuidora sale decrements its product stock');

SELECT is((SELECT count(*)::int FROM public.inventory_movements WHERE business_id='00000000-0000-0000-0000-00000000b901' AND source_type='sale' AND source_id='00000000-0000-0000-0000-00000000e901'), 1, 'Almacen sale writes one source-linked movement');
SELECT is((SELECT count(*)::int FROM public.inventory_movements WHERE business_id='00000000-0000-0000-0000-00000000b902' AND source_type='sale' AND source_id='00000000-0000-0000-0000-00000000e902'), 1, 'Ferreteria sale writes one source-linked movement');
SELECT is((SELECT count(*)::int FROM public.inventory_movements WHERE business_id='00000000-0000-0000-0000-00000000b903' AND source_type='sale' AND source_id='00000000-0000-0000-0000-00000000e903'), 1, 'Distribuidora sale writes one source-linked movement');

SELECT is((SELECT count(*)::int FROM public.transactions WHERE business_id='00000000-0000-0000-0000-00000000b901' AND type='income'), 1, 'Almacen sale creates one income transaction');
SELECT is((SELECT count(*)::int FROM public.transactions WHERE business_id='00000000-0000-0000-0000-00000000b901' AND type='expense'), 1, 'Almacen purchase creates one expense transaction');
SELECT is((SELECT count(*)::int FROM public.transactions WHERE business_id='00000000-0000-0000-0000-00000000b902' AND type='income'), 1, 'Ferreteria sale creates one income transaction');
SELECT is((SELECT count(*)::int FROM public.transactions WHERE business_id='00000000-0000-0000-0000-00000000b902' AND type='expense'), 1, 'Ferreteria purchase creates one expense transaction');
SELECT is((SELECT count(*)::int FROM public.transactions WHERE business_id='00000000-0000-0000-0000-00000000b903' AND type='income'), 1, 'Distribuidora sale creates one income transaction');
SELECT is((SELECT count(*)::int FROM public.transactions WHERE business_id='00000000-0000-0000-0000-00000000b903' AND type='expense'), 1, 'Distribuidora purchase creates one expense transaction');

UPDATE public.sales SET status='cancelled'
WHERE id IN (
  '00000000-0000-0000-0000-00000000e901',
  '00000000-0000-0000-0000-00000000e902',
  '00000000-0000-0000-0000-00000000e903'
);

SELECT is((SELECT stock FROM public.products WHERE id='00000000-0000-0000-0000-00000000c901'), 15, 'Almacen sale cancellation restores stock');
SELECT is((SELECT stock FROM public.products WHERE id='00000000-0000-0000-0000-00000000c902'), 15, 'Ferreteria sale cancellation restores stock');
SELECT is((SELECT stock FROM public.products WHERE id='00000000-0000-0000-0000-00000000c903'), 15, 'Distribuidora sale cancellation restores stock');

SELECT is((SELECT count(*)::int FROM public.inventory_movements WHERE business_id='00000000-0000-0000-0000-00000000b901' AND source_type='sale_reversal' AND source_id='00000000-0000-0000-0000-00000000e901'), 1, 'Almacen cancellation appends one reversal');
SELECT is((SELECT count(*)::int FROM public.inventory_movements WHERE business_id='00000000-0000-0000-0000-00000000b902' AND source_type='sale_reversal' AND source_id='00000000-0000-0000-0000-00000000e902'), 1, 'Ferreteria cancellation appends one reversal');
SELECT is((SELECT count(*)::int FROM public.inventory_movements WHERE business_id='00000000-0000-0000-0000-00000000b903' AND source_type='sale_reversal' AND source_id='00000000-0000-0000-0000-00000000e903'), 1, 'Distribuidora cancellation appends one reversal');

UPDATE public.purchases SET status='cancelled'
WHERE id IN (
  '00000000-0000-0000-0000-00000000d901',
  '00000000-0000-0000-0000-00000000d902',
  '00000000-0000-0000-0000-00000000d903'
);

SELECT is((SELECT stock FROM public.products WHERE id='00000000-0000-0000-0000-00000000c901'), 10, 'Almacen purchase cancellation restores original stock');
SELECT is((SELECT stock FROM public.products WHERE id='00000000-0000-0000-0000-00000000c902'), 10, 'Ferreteria purchase cancellation restores original stock');
SELECT is((SELECT stock FROM public.products WHERE id='00000000-0000-0000-0000-00000000c903'), 10, 'Distribuidora purchase cancellation restores original stock');

SELECT is((SELECT count(*)::int FROM public.inventory_movements WHERE business_id='00000000-0000-0000-0000-00000000b901' AND source_type='purchase_reversal' AND source_id='00000000-0000-0000-0000-00000000d901'), 1, 'Almacen purchase cancellation appends one reversal');
SELECT is((SELECT count(*)::int FROM public.inventory_movements WHERE business_id='00000000-0000-0000-0000-00000000b902' AND source_type='purchase_reversal' AND source_id='00000000-0000-0000-0000-00000000d902'), 1, 'Ferreteria purchase cancellation appends one reversal');
SELECT is((SELECT count(*)::int FROM public.inventory_movements WHERE business_id='00000000-0000-0000-0000-00000000b903' AND source_type='purchase_reversal' AND source_id='00000000-0000-0000-0000-00000000d903'), 1, 'Distribuidora purchase cancellation appends one reversal');

SELECT is((SELECT COALESCE(sum(quantity_delta),0) FROM public.inventory_movements WHERE business_id='00000000-0000-0000-0000-00000000b901' AND product_id='00000000-0000-0000-0000-00000000c901'), 0::numeric, 'Almacen ledger net equals zero after full reversals');
SELECT is((SELECT COALESCE(sum(quantity_delta),0) FROM public.inventory_movements WHERE business_id='00000000-0000-0000-0000-00000000b902' AND product_id='00000000-0000-0000-0000-00000000c902'), 0::numeric, 'Ferreteria ledger net equals zero after full reversals');
SELECT is((SELECT COALESCE(sum(quantity_delta),0) FROM public.inventory_movements WHERE business_id='00000000-0000-0000-0000-00000000b903' AND product_id='00000000-0000-0000-0000-00000000c903'), 0::numeric, 'Distribuidora ledger net equals zero after full reversals');

SELECT * FROM finish();
ROLLBACK;
