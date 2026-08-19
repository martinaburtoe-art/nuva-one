BEGIN;

SELECT plan(8);

SELECT has_table('public', 'product_codes', 'product_codes registry exists');
SELECT has_column('public', 'product_codes', 'business_id', 'registry is tenant scoped');
SELECT has_column('public', 'product_codes', 'product_id', 'registry links products');
SELECT has_column('public', 'product_codes', 'code', 'registry stores code');
SELECT has_column('public', 'product_codes', 'code_type', 'registry stores code type');
SELECT has_index('public', 'ux_product_codes_business_code', 'codes are unique per business');
SELECT has_function('public', 'lookup_product_by_code', ARRAY['text'], 'lookup function exists');
SELECT has_function('public', 'generate_product_sku', ARRAY['text'], 'SKU generator exists');

SELECT * FROM finish();
ROLLBACK;
