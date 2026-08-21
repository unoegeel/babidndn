-- Read-only: production cutover 전 활성/조회 가능 주문 규모 확인
-- (access_token_hash NULL인 legacy 행은 customer 접근이 거부됨)

-- 1) 컬럼 존재 여부
-- SHOW COLUMNS FROM orders LIKE 'access_token_hash';

-- 2) hash 없는(legacy) 주문 수
SELECT COUNT(*) AS legacy_orders_without_token
FROM orders
WHERE access_token_hash IS NULL;

-- 3) 상태별 · token 유무
SELECT status,
       SUM(CASE WHEN access_token_hash IS NULL THEN 1 ELSE 0 END) AS without_token,
       SUM(CASE WHEN access_token_hash IS NOT NULL THEN 1 ELSE 0 END) AS with_token,
       COUNT(*) AS total
FROM orders
GROUP BY status
ORDER BY status;

-- 4) customer가 아직 조회할 가능성이 높은 활성/미결제성 주문 (legacy)
-- OrderStatus: PREPARING, READY, COMPLETED, CANCELED + pickup_number=0 은 결제 전 UNPAID 임시
SELECT COUNT(*) AS active_or_unpaid_legacy
FROM orders
WHERE access_token_hash IS NULL
  AND (
        pickup_number = 0
        OR status IN ('PREPARING', 'READY')
      );
