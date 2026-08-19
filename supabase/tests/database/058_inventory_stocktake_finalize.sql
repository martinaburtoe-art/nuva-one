BEGIN;

SELECT plan(7);

SELECT has_table('public', 'inventory_stocktakes', 'stocktakes table exists');
SELECT has_table('public', 'inventory_stocktake_lines', 'stocktake lines table exists');
SELECT has_column('public', 'inventory_stocktakes', 'completed_at', 'stocktake completion timestamp exists');
SELECT has_column('public', 'inventory_stocktake_lines', 'difference', 'stocktake difference is persisted');
SELECT has_function('public', 'finalize_inventory_stocktake', ARRAY['uuid'], 'atomic finalizer exists');
SELECT has_column('public', 'inventory_movements', 'source_id', 'adjustments can be traced to a source');
SELECT has_column('public', 'inventory_movements', 'stock_after', 'adjustments preserve resulting stock');

SELECT * FROM finish();
ROLLBACK;
