-- =============================================================================
-- schema-drift-audit.sql (READ-ONLY)
-- Purpose: export a comparable schema fingerprint for babi_order(_dev) vs prod.
--
-- Usage (example):
--   mysql -h ... -u ... -p babi_order_dev < schema-drift-audit.sql > drift-dev.txt
--   mysql -h ... -u ... -p babi_order     < schema-drift-audit.sql > drift-prod.txt
--   diff -u drift-dev.txt drift-prod.txt
--
-- Classify differences:
--   EXPECTED_ENV_DIFFERENCE — seed/data-only or intentional env split
--   MISSING_MIGRATION       — column/table present in one env only (apply/align first)
--   UNEXPECTED_DRIFT        — type/nullability/index/FK mismatch
--
-- Do NOT enable Flyway baseline on an environment until critical tables match
-- (or drift is explicitly accepted).
-- =============================================================================

SELECT DATABASE() AS audited_schema, NOW() AS audited_at;

-- ---------------------------------------------------------------------------
-- 1) Tables
-- ---------------------------------------------------------------------------
SELECT 'TABLE' AS kind,
       t.TABLE_NAME AS object_name,
       t.ENGINE AS detail1,
       t.TABLE_COLLATION AS detail2,
       '' AS detail3
FROM information_schema.TABLES t
WHERE t.TABLE_SCHEMA = DATABASE()
  AND t.TABLE_TYPE = 'BASE TABLE'
ORDER BY t.TABLE_NAME;

-- ---------------------------------------------------------------------------
-- 2) Columns (type, nullability, default, extra)
-- ---------------------------------------------------------------------------
SELECT 'COLUMN' AS kind,
       CONCAT(c.TABLE_NAME, '.', c.COLUMN_NAME) AS object_name,
       CONCAT(
           c.COLUMN_TYPE,
           IF(c.CHARACTER_SET_NAME IS NULL, '', CONCAT(' cs=', c.CHARACTER_SET_NAME)),
           IF(c.COLLATION_NAME IS NULL, '', CONCAT(' coll=', c.COLLATION_NAME))
       ) AS detail1,
       CONCAT('nullable=', c.IS_NULLABLE, ' default=', IFNULL(c.COLUMN_DEFAULT, 'NULL')) AS detail2,
       c.EXTRA AS detail3
FROM information_schema.COLUMNS c
WHERE c.TABLE_SCHEMA = DATABASE()
ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION;

-- ---------------------------------------------------------------------------
-- 3) Primary keys
-- ---------------------------------------------------------------------------
SELECT 'PRIMARY_KEY' AS kind,
       CONCAT(k.TABLE_NAME, '.', k.CONSTRAINT_NAME) AS object_name,
       GROUP_CONCAT(k.COLUMN_NAME ORDER BY k.ORDINAL_POSITION) AS detail1,
       '' AS detail2,
       '' AS detail3
FROM information_schema.KEY_COLUMN_USAGE k
JOIN information_schema.TABLE_CONSTRAINTS tc
  ON tc.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
 AND tc.TABLE_NAME = k.TABLE_NAME
 AND tc.CONSTRAINT_NAME = k.CONSTRAINT_NAME
WHERE k.CONSTRAINT_SCHEMA = DATABASE()
  AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
GROUP BY k.TABLE_NAME, k.CONSTRAINT_NAME
ORDER BY k.TABLE_NAME;

-- ---------------------------------------------------------------------------
-- 4) Unique constraints
-- ---------------------------------------------------------------------------
SELECT 'UNIQUE' AS kind,
       CONCAT(k.TABLE_NAME, '.', k.CONSTRAINT_NAME) AS object_name,
       GROUP_CONCAT(k.COLUMN_NAME ORDER BY k.ORDINAL_POSITION) AS detail1,
       '' AS detail2,
       '' AS detail3
FROM information_schema.KEY_COLUMN_USAGE k
JOIN information_schema.TABLE_CONSTRAINTS tc
  ON tc.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
 AND tc.TABLE_NAME = k.TABLE_NAME
 AND tc.CONSTRAINT_NAME = k.CONSTRAINT_NAME
WHERE k.CONSTRAINT_SCHEMA = DATABASE()
  AND tc.CONSTRAINT_TYPE = 'UNIQUE'
GROUP BY k.TABLE_NAME, k.CONSTRAINT_NAME
ORDER BY k.TABLE_NAME, k.CONSTRAINT_NAME;

-- ---------------------------------------------------------------------------
-- 5) Foreign keys
-- ---------------------------------------------------------------------------
SELECT 'FOREIGN_KEY' AS kind,
       CONCAT(k.TABLE_NAME, '.', k.CONSTRAINT_NAME) AS object_name,
       CONCAT(
           GROUP_CONCAT(k.COLUMN_NAME ORDER BY k.ORDINAL_POSITION),
           ' -> ',
           k.REFERENCED_TABLE_NAME, '(',
           GROUP_CONCAT(k.REFERENCED_COLUMN_NAME ORDER BY k.ORDINAL_POSITION),
           ')'
       ) AS detail1,
       '' AS detail2,
       '' AS detail3
FROM information_schema.KEY_COLUMN_USAGE k
JOIN information_schema.TABLE_CONSTRAINTS tc
  ON tc.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
 AND tc.TABLE_NAME = k.TABLE_NAME
 AND tc.CONSTRAINT_NAME = k.CONSTRAINT_NAME
WHERE k.CONSTRAINT_SCHEMA = DATABASE()
  AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
GROUP BY k.TABLE_NAME, k.CONSTRAINT_NAME, k.REFERENCED_TABLE_NAME
ORDER BY k.TABLE_NAME, k.CONSTRAINT_NAME;

-- ---------------------------------------------------------------------------
-- 6) Indexes (non-primary)
-- ---------------------------------------------------------------------------
SELECT 'INDEX' AS kind,
       CONCAT(s.TABLE_NAME, '.', s.INDEX_NAME) AS object_name,
       GROUP_CONCAT(
           CONCAT(s.COLUMN_NAME, IF(s.COLLATION = 'D', ' DESC', ''))
           ORDER BY s.SEQ_IN_INDEX
       ) AS detail1,
       CONCAT('unique=', IF(s.NON_UNIQUE = 0, 'YES', 'NO'), ' type=', s.INDEX_TYPE) AS detail2,
       '' AS detail3
FROM information_schema.STATISTICS s
WHERE s.TABLE_SCHEMA = DATABASE()
  AND s.INDEX_NAME <> 'PRIMARY'
GROUP BY s.TABLE_NAME, s.INDEX_NAME, s.NON_UNIQUE, s.INDEX_TYPE
ORDER BY s.TABLE_NAME, s.INDEX_NAME;

-- ---------------------------------------------------------------------------
-- 7) Spotlight: critical tables presence / key columns
-- ---------------------------------------------------------------------------
SELECT 'SPOTLIGHT_TABLE' AS kind,
       expected.TABLE_NAME AS object_name,
       IF(t.TABLE_NAME IS NULL, 'MISSING', 'PRESENT') AS detail1,
       '' AS detail2,
       '' AS detail3
FROM (
    SELECT 'orders' AS TABLE_NAME UNION ALL
    SELECT 'payments' UNION ALL
    SELECT 'push_subscriptions' UNION ALL
    SELECT 'push_subscription_orders' UNION ALL
    SELECT 'saved_menus' UNION ALL
    SELECT 'saved_menu_options' UNION ALL
    SELECT 'client_errors' UNION ALL
    SELECT 'backend_errors' UNION ALL
    SELECT 'client_events' UNION ALL
    SELECT 'http_request_records' UNION ALL
    SELECT 'menus' UNION ALL
    SELECT 'menu_options' UNION ALL
    SELECT 'categories' UNION ALL
    SELECT 'admins' UNION ALL
    SELECT 'order_items' UNION ALL
    SELECT 'order_item_options'
) expected
LEFT JOIN information_schema.TABLES t
  ON t.TABLE_SCHEMA = DATABASE()
 AND t.TABLE_NAME = expected.TABLE_NAME
ORDER BY expected.TABLE_NAME;

SELECT 'SPOTLIGHT_COLUMN' AS kind,
       CONCAT(expected.TABLE_NAME, '.', expected.COLUMN_NAME) AS object_name,
       IFNULL(c.COLUMN_TYPE, 'MISSING') AS detail1,
       IFNULL(c.IS_NULLABLE, '') AS detail2,
       '' AS detail3
FROM (
    SELECT 'orders' AS TABLE_NAME, 'access_token_hash' AS COLUMN_NAME UNION ALL
    SELECT 'orders', 'pickup_number' UNION ALL
    SELECT 'orders', 'total_amount' UNION ALL
    SELECT 'payments', 'status' UNION ALL
    SELECT 'payments', 'amount' UNION ALL
    SELECT 'payments', 'approved_at' UNION ALL
    SELECT 'client_errors', 'stack' UNION ALL
    SELECT 'client_errors', 'component_stack' UNION ALL
    SELECT 'backend_errors', 'message' UNION ALL
    SELECT 'http_request_records', 'request_id' UNION ALL
    SELECT 'client_events', 'event_type' UNION ALL
    SELECT 'push_subscriptions', 'endpoint' UNION ALL
    SELECT 'saved_menus', 'client_key'
) expected
LEFT JOIN information_schema.COLUMNS c
  ON c.TABLE_SCHEMA = DATABASE()
 AND c.TABLE_NAME = expected.TABLE_NAME
 AND c.COLUMN_NAME = expected.COLUMN_NAME
ORDER BY expected.TABLE_NAME, expected.COLUMN_NAME;
