#!/usr/bin/env bash
set -euo pipefail

DB_CONTAINER="$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -n1 || true)"
if [[ -z "$DB_CONTAINER" ]]; then
  echo "ERROR: local Supabase database container not found"
  docker ps -a
  exit 1
fi
db() {
  docker exec -i "$DB_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"
}

USER_ID="00000000-0000-0000-0000-0000000000a1"
BUSINESS_ID="00000000-0000-0000-0000-0000000000b1"
PRODUCT_ID="00000000-0000-0000-0000-0000000000c1"
SALE_ID="00000000-0000-0000-0000-0000000000d1"
INTENT_ID="00000000-0000-0000-0000-0000000000e1"
INVENTORY_SOURCE_ID="00000000-0000-0000-0000-0000000000f1"

echo "Seeding isolated concurrent settlement fixtures"
db <<SQL
INSERT INTO auth.users (id) VALUES ('$USER_ID') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.businesses (id, name, owner_id, plan)
VALUES ('$BUSINESS_ID', 'Atomic concurrency test', '$USER_ID', 'starter');
INSERT INTO public.products (id, business_id, name, price, stock)
VALUES ('$PRODUCT_ID', '$BUSINESS_ID', 'Concurrency widget', 1000, 10);
INSERT INTO public.sales (id, business_id, status, total, items, is_credit, paid_amount)
VALUES ('$SALE_ID', '$BUSINESS_ID', 'pending', 5000, '[]'::jsonb, true, 0);
INSERT INTO public.payment_intents (
  id, business_id, sale_id, provider, token, commerce_order, amount, status
)
VALUES (
  '$INTENT_ID', '$BUSINESS_ID', '$SALE_ID', 'flow',
  'concurrency-payment-token', 'concurrency-payment-order', 4000, 'pending'
);
SQL

echo "Forcing two webhook settlements to contend on the same intent row"
docker exec "$DB_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  -c "BEGIN; SELECT id FROM public.payment_intents WHERE id = '$INTENT_ID' FOR UPDATE; SELECT pg_sleep(3); COMMIT;" \
  >/tmp/nuva-payment-lock.log 2>&1 &
PAYMENT_LOCK_PID=$!
sleep 0.4
docker exec "$DB_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  -c "SELECT public.settle_payment_intent('flow','concurrency-payment-token','paid',4000,'concurrency-payment-order');" \
  >/tmp/nuva-payment-a.log 2>&1 &
PAYMENT_A_PID=$!
docker exec "$DB_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  -c "SELECT public.settle_payment_intent('flow','concurrency-payment-token','paid',4000,'concurrency-payment-order');" \
  >/tmp/nuva-payment-b.log 2>&1 &
PAYMENT_B_PID=$!
wait "$PAYMENT_LOCK_PID"
wait "$PAYMENT_A_PID"
wait "$PAYMENT_B_PID"

PAYMENT_COUNT="$(db -Atc "SELECT count(*) FROM public.payments WHERE payment_intent_id = '$INTENT_ID';" | tr -d '[:space:]')"
PAID_AMOUNT="$(db -Atc "SELECT paid_amount FROM public.sales WHERE id = '$SALE_ID';" | tr -d '[:space:]')"
EVENT_PROCESSED="$(db -Atc "SELECT processed FROM public.payment_webhook_events WHERE provider='flow' AND token='concurrency-payment-token';" | tr -d '[:space:]')"
[[ "$PAYMENT_COUNT" == "1" ]] || { echo "FAIL: expected 1 payment, got $PAYMENT_COUNT"; cat /tmp/nuva-payment-{a,b}.log; exit 1; }
[[ "$PAID_AMOUNT" == "4000.00" || "$PAID_AMOUNT" == "4000" ]] || { echo "FAIL: sale paid_amount is $PAID_AMOUNT"; exit 1; }
[[ "$EVENT_PROCESSED" == "t" ]] || { echo "FAIL: webhook event was not processed"; exit 1; }
echo "PASS: two concurrent webhooks created exactly one payment and one sale-balance effect"

echo "Forcing two inventory adjustments to contend on the same product row"
docker exec "$DB_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  -c "BEGIN; SELECT id FROM public.products WHERE id = '$PRODUCT_ID' FOR UPDATE; SELECT pg_sleep(3); COMMIT;" \
  >/tmp/nuva-inventory-lock.log 2>&1 &
INVENTORY_LOCK_PID=$!
sleep 0.4
docker exec "$DB_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  -c "BEGIN; SELECT set_config('request.jwt.claim.sub','$USER_ID',true); SELECT * FROM public.adjust_product_stock('$PRODUCT_ID',-2,'Concurrent adjustment','concurrency_test','$INVENTORY_SOURCE_ID'); COMMIT;" \
  >/tmp/nuva-inventory-a.log 2>&1 &
INVENTORY_A_PID=$!
docker exec "$DB_CONTAINER" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
  -c "BEGIN; SELECT set_config('request.jwt.claim.sub','$USER_ID',true); SELECT * FROM public.adjust_product_stock('$PRODUCT_ID',-2,'Concurrent adjustment','concurrency_test','$INVENTORY_SOURCE_ID'); COMMIT;" \
  >/tmp/nuva-inventory-b.log 2>&1 &
INVENTORY_B_PID=$!
wait "$INVENTORY_LOCK_PID"
wait "$INVENTORY_A_PID"
wait "$INVENTORY_B_PID"

STOCK="$(db -Atc "SELECT stock FROM public.products WHERE id = '$PRODUCT_ID';" | tr -d '[:space:]')"
MOVEMENT_COUNT="$(db -Atc "SELECT count(*) FROM public.inventory_movements WHERE product_id='$PRODUCT_ID' AND source_type='concurrency_test' AND source_id='$INVENTORY_SOURCE_ID';" | tr -d '[:space:]')"
[[ "$STOCK" == "8" ]] || { echo "FAIL: expected stock 8, got $STOCK"; cat /tmp/nuva-inventory-{a,b}.log; exit 1; }
[[ "$MOVEMENT_COUNT" == "1" ]] || { echo "FAIL: expected 1 movement, got $MOVEMENT_COUNT"; exit 1; }
echo "PASS: two concurrent identical inventory requests applied one stock delta and one movement"
