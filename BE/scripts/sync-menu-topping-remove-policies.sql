-- 컵밥형 메뉴 TOPPING_REMOVE를 메뉴명 정책에 맞춥니다.
-- 우선순위: 김치삼겹볶음밥 → 삼겹소금/삼겹양념 → 마요 → 기본
--
-- 대상 카테고리: 이름 = '컵밥' 또는 '%세트'
-- 참치불닭비빔우동은 이 스크립트에서 건드리지 않습니다.
--
-- 실행 대상(Flyway/Liquibase 없음, 환경별 1회 또는 idempotent 재실행 가능):
--   개발: babi_order_dev
--   운영: babi_order
-- 과거 주문 snapshot(option_name_snapshot, option_group_snapshot 등)은 변경하지 않습니다.
-- SavedMenu는 menu_option_id만 해제하며, 런타임 OPTIONS_STALE은 기존 로직이 계산합니다.

SET NAMES utf8mb4;

-- ========== 1) 김치삼겹볶음밥: TOPPING_REMOVE 전부 제거 ==========
UPDATE order_item_options oio
INNER JOIN menu_options mo ON mo.id = oio.menu_option_id
INNER JOIN menus menu ON menu.id = mo.menu_id
INNER JOIN categories category ON category.id = menu.category_id
SET oio.menu_option_id = NULL
WHERE mo.group_type = 'TOPPING_REMOVE'
  AND (category.name = '컵밥' OR category.name LIKE '%세트')
  AND menu.name LIKE '%김치삼겹볶음밥%';

UPDATE saved_menu_options smo
INNER JOIN menu_options mo ON mo.id = smo.menu_option_id
INNER JOIN menus menu ON menu.id = mo.menu_id
INNER JOIN categories category ON category.id = menu.category_id
SET smo.menu_option_id = NULL
WHERE mo.group_type = 'TOPPING_REMOVE'
  AND (category.name = '컵밥' OR category.name LIKE '%세트')
  AND menu.name LIKE '%김치삼겹볶음밥%';

DELETE mo
FROM menu_options mo
INNER JOIN menus menu ON menu.id = mo.menu_id
INNER JOIN categories category ON category.id = menu.category_id
WHERE mo.group_type = 'TOPPING_REMOVE'
  AND (category.name = '컵밥' OR category.name LIKE '%세트')
  AND menu.name LIKE '%김치삼겹볶음밥%';

-- ========== 2) 삼겹소금 / 삼겹양념: canonical 4종만 유지 ==========
UPDATE order_item_options oio
INNER JOIN menu_options mo ON mo.id = oio.menu_option_id
INNER JOIN menus menu ON menu.id = mo.menu_id
INNER JOIN categories category ON category.id = menu.category_id
SET oio.menu_option_id = NULL
WHERE mo.group_type = 'TOPPING_REMOVE'
  AND (category.name = '컵밥' OR category.name LIKE '%세트')
  AND menu.name NOT LIKE '%김치삼겹볶음밥%'
  AND (menu.name LIKE '%삼겹소금%' OR menu.name LIKE '%삼겹양념%')
  AND mo.name NOT IN ('김치 제외', '고추장 소스 제외', '참기름 제외', '김가루 제외');

UPDATE saved_menu_options smo
INNER JOIN menu_options mo ON mo.id = smo.menu_option_id
INNER JOIN menus menu ON menu.id = mo.menu_id
INNER JOIN categories category ON category.id = menu.category_id
SET smo.menu_option_id = NULL
WHERE mo.group_type = 'TOPPING_REMOVE'
  AND (category.name = '컵밥' OR category.name LIKE '%세트')
  AND menu.name NOT LIKE '%김치삼겹볶음밥%'
  AND (menu.name LIKE '%삼겹소금%' OR menu.name LIKE '%삼겹양념%')
  AND mo.name NOT IN ('김치 제외', '고추장 소스 제외', '참기름 제외', '김가루 제외');

DELETE mo
FROM menu_options mo
INNER JOIN menus menu ON menu.id = mo.menu_id
INNER JOIN categories category ON category.id = menu.category_id
WHERE mo.group_type = 'TOPPING_REMOVE'
  AND (category.name = '컵밥' OR category.name LIKE '%세트')
  AND menu.name NOT LIKE '%김치삼겹볶음밥%'
  AND (menu.name LIKE '%삼겹소금%' OR menu.name LIKE '%삼겹양념%')
  AND mo.name NOT IN ('김치 제외', '고추장 소스 제외', '참기름 제외', '김가루 제외');

INSERT INTO menu_options (
    menu_id, group_type, name, additional_price, max_quantity,
    default_selected, display_order, created_at, updated_at
)
SELECT
    menu.id,
    option_source.group_type,
    option_source.name,
    0,
    1,
    FALSE,
    option_source.display_order,
    NOW(6),
    NOW(6)
FROM menus menu
INNER JOIN categories category ON category.id = menu.category_id
INNER JOIN (
    SELECT DISTINCT menu_id
    FROM menu_options
    WHERE group_type IN ('TOPPING_ADD', 'TOPPING_REMOVE', 'PACKAGING')
) topping_on ON topping_on.menu_id = menu.id
CROSS JOIN (
    SELECT 'TOPPING_REMOVE' AS group_type, '김치 제외' AS name, 1 AS display_order
    UNION ALL SELECT 'TOPPING_REMOVE', '고추장 소스 제외', 2
    UNION ALL SELECT 'TOPPING_REMOVE', '참기름 제외', 3
    UNION ALL SELECT 'TOPPING_REMOVE', '김가루 제외', 4
) AS option_source
LEFT JOIN menu_options existing
    ON existing.menu_id = menu.id
    AND existing.group_type = 'TOPPING_REMOVE'
    AND existing.name = option_source.name
WHERE (category.name = '컵밥' OR category.name LIKE '%세트')
  AND menu.name NOT LIKE '%김치삼겹볶음밥%'
  AND (menu.name LIKE '%삼겹소금%' OR menu.name LIKE '%삼겹양념%')
  AND existing.id IS NULL;

UPDATE menu_options mo
INNER JOIN menus menu ON menu.id = mo.menu_id
INNER JOIN categories category ON category.id = menu.category_id
INNER JOIN (
    SELECT '김치 제외' AS name, 1 AS display_order
    UNION ALL SELECT '고추장 소스 제외', 2
    UNION ALL SELECT '참기름 제외', 3
    UNION ALL SELECT '김가루 제외', 4
) canonical ON canonical.name = mo.name
SET mo.display_order = canonical.display_order, mo.updated_at = NOW(6)
WHERE mo.group_type = 'TOPPING_REMOVE'
  AND (category.name = '컵밥' OR category.name LIKE '%세트')
  AND menu.name NOT LIKE '%김치삼겹볶음밥%'
  AND (menu.name LIKE '%삼겹소금%' OR menu.name LIKE '%삼겹양념%');

-- ========== 3) 마요: canonical 2종만 유지 ==========
UPDATE order_item_options oio
INNER JOIN menu_options mo ON mo.id = oio.menu_option_id
INNER JOIN menus menu ON menu.id = mo.menu_id
INNER JOIN categories category ON category.id = menu.category_id
SET oio.menu_option_id = NULL
WHERE mo.group_type = 'TOPPING_REMOVE'
  AND (category.name = '컵밥' OR category.name LIKE '%세트')
  AND menu.name NOT LIKE '%김치삼겹볶음밥%'
  AND menu.name NOT LIKE '%삼겹소금%'
  AND menu.name NOT LIKE '%삼겹양념%'
  AND menu.name LIKE '%마요%'
  AND mo.name NOT IN ('단무지 제외', '김가루 제외');

UPDATE saved_menu_options smo
INNER JOIN menu_options mo ON mo.id = smo.menu_option_id
INNER JOIN menus menu ON menu.id = mo.menu_id
INNER JOIN categories category ON category.id = menu.category_id
SET smo.menu_option_id = NULL
WHERE mo.group_type = 'TOPPING_REMOVE'
  AND (category.name = '컵밥' OR category.name LIKE '%세트')
  AND menu.name NOT LIKE '%김치삼겹볶음밥%'
  AND menu.name NOT LIKE '%삼겹소금%'
  AND menu.name NOT LIKE '%삼겹양념%'
  AND menu.name LIKE '%마요%'
  AND mo.name NOT IN ('단무지 제외', '김가루 제외');

DELETE mo
FROM menu_options mo
INNER JOIN menus menu ON menu.id = mo.menu_id
INNER JOIN categories category ON category.id = menu.category_id
WHERE mo.group_type = 'TOPPING_REMOVE'
  AND (category.name = '컵밥' OR category.name LIKE '%세트')
  AND menu.name NOT LIKE '%김치삼겹볶음밥%'
  AND menu.name NOT LIKE '%삼겹소금%'
  AND menu.name NOT LIKE '%삼겹양념%'
  AND menu.name LIKE '%마요%'
  AND mo.name NOT IN ('단무지 제외', '김가루 제외');

INSERT INTO menu_options (
    menu_id, group_type, name, additional_price, max_quantity,
    default_selected, display_order, created_at, updated_at
)
SELECT
    menu.id,
    option_source.group_type,
    option_source.name,
    0,
    1,
    FALSE,
    option_source.display_order,
    NOW(6),
    NOW(6)
FROM menus menu
INNER JOIN categories category ON category.id = menu.category_id
INNER JOIN (
    SELECT DISTINCT menu_id
    FROM menu_options
    WHERE group_type IN ('TOPPING_ADD', 'TOPPING_REMOVE', 'PACKAGING')
) topping_on ON topping_on.menu_id = menu.id
CROSS JOIN (
    SELECT 'TOPPING_REMOVE' AS group_type, '단무지 제외' AS name, 1 AS display_order
    UNION ALL SELECT 'TOPPING_REMOVE', '김가루 제외', 2
) AS option_source
LEFT JOIN menu_options existing
    ON existing.menu_id = menu.id
    AND existing.group_type = 'TOPPING_REMOVE'
    AND existing.name = option_source.name
WHERE (category.name = '컵밥' OR category.name LIKE '%세트')
  AND menu.name NOT LIKE '%김치삼겹볶음밥%'
  AND menu.name NOT LIKE '%삼겹소금%'
  AND menu.name NOT LIKE '%삼겹양념%'
  AND menu.name LIKE '%마요%'
  AND existing.id IS NULL;

UPDATE menu_options mo
INNER JOIN menus menu ON menu.id = mo.menu_id
INNER JOIN categories category ON category.id = menu.category_id
INNER JOIN (
    SELECT '단무지 제외' AS name, 1 AS display_order
    UNION ALL SELECT '김가루 제외', 2
) canonical ON canonical.name = mo.name
SET mo.display_order = canonical.display_order, mo.updated_at = NOW(6)
WHERE mo.group_type = 'TOPPING_REMOVE'
  AND (category.name = '컵밥' OR category.name LIKE '%세트')
  AND menu.name NOT LIKE '%김치삼겹볶음밥%'
  AND menu.name NOT LIKE '%삼겹소금%'
  AND menu.name NOT LIKE '%삼겹양념%'
  AND menu.name LIKE '%마요%';

-- ========== 4) 그 외 컵밥형: 기본 2종만 유지 ==========
UPDATE order_item_options oio
INNER JOIN menu_options mo ON mo.id = oio.menu_option_id
INNER JOIN menus menu ON menu.id = mo.menu_id
INNER JOIN categories category ON category.id = menu.category_id
SET oio.menu_option_id = NULL
WHERE mo.group_type = 'TOPPING_REMOVE'
  AND (category.name = '컵밥' OR category.name LIKE '%세트')
  AND menu.name <> '참치불닭비빔우동'
  AND menu.name NOT LIKE '%김치삼겹볶음밥%'
  AND menu.name NOT LIKE '%삼겹소금%'
  AND menu.name NOT LIKE '%삼겹양념%'
  AND menu.name NOT LIKE '%마요%'
  AND mo.name NOT IN ('김치 제외', '고추장 소스 제외');

UPDATE saved_menu_options smo
INNER JOIN menu_options mo ON mo.id = smo.menu_option_id
INNER JOIN menus menu ON menu.id = mo.menu_id
INNER JOIN categories category ON category.id = menu.category_id
SET smo.menu_option_id = NULL
WHERE mo.group_type = 'TOPPING_REMOVE'
  AND (category.name = '컵밥' OR category.name LIKE '%세트')
  AND menu.name <> '참치불닭비빔우동'
  AND menu.name NOT LIKE '%김치삼겹볶음밥%'
  AND menu.name NOT LIKE '%삼겹소금%'
  AND menu.name NOT LIKE '%삼겹양념%'
  AND menu.name NOT LIKE '%마요%'
  AND mo.name NOT IN ('김치 제외', '고추장 소스 제외');

DELETE mo
FROM menu_options mo
INNER JOIN menus menu ON menu.id = mo.menu_id
INNER JOIN categories category ON category.id = menu.category_id
WHERE mo.group_type = 'TOPPING_REMOVE'
  AND (category.name = '컵밥' OR category.name LIKE '%세트')
  AND menu.name <> '참치불닭비빔우동'
  AND menu.name NOT LIKE '%김치삼겹볶음밥%'
  AND menu.name NOT LIKE '%삼겹소금%'
  AND menu.name NOT LIKE '%삼겹양념%'
  AND menu.name NOT LIKE '%마요%'
  AND mo.name NOT IN ('김치 제외', '고추장 소스 제외');

INSERT INTO menu_options (
    menu_id, group_type, name, additional_price, max_quantity,
    default_selected, display_order, created_at, updated_at
)
SELECT
    menu.id,
    option_source.group_type,
    option_source.name,
    0,
    1,
    FALSE,
    option_source.display_order,
    NOW(6),
    NOW(6)
FROM menus menu
INNER JOIN categories category ON category.id = menu.category_id
INNER JOIN (
    SELECT DISTINCT menu_id
    FROM menu_options
    WHERE group_type IN ('TOPPING_ADD', 'TOPPING_REMOVE', 'PACKAGING')
) topping_on ON topping_on.menu_id = menu.id
CROSS JOIN (
    SELECT 'TOPPING_REMOVE' AS group_type, '김치 제외' AS name, 1 AS display_order
    UNION ALL SELECT 'TOPPING_REMOVE', '고추장 소스 제외', 2
) AS option_source
LEFT JOIN menu_options existing
    ON existing.menu_id = menu.id
    AND existing.group_type = 'TOPPING_REMOVE'
    AND existing.name = option_source.name
WHERE (category.name = '컵밥' OR category.name LIKE '%세트')
  AND menu.name <> '참치불닭비빔우동'
  AND menu.name NOT LIKE '%김치삼겹볶음밥%'
  AND menu.name NOT LIKE '%삼겹소금%'
  AND menu.name NOT LIKE '%삼겹양념%'
  AND menu.name NOT LIKE '%마요%'
  AND existing.id IS NULL;

UPDATE menu_options mo
INNER JOIN menus menu ON menu.id = mo.menu_id
INNER JOIN categories category ON category.id = menu.category_id
INNER JOIN (
    SELECT '김치 제외' AS name, 1 AS display_order
    UNION ALL SELECT '고추장 소스 제외', 2
) canonical ON canonical.name = mo.name
SET mo.display_order = canonical.display_order, mo.updated_at = NOW(6)
WHERE mo.group_type = 'TOPPING_REMOVE'
  AND (category.name = '컵밥' OR category.name LIKE '%세트')
  AND menu.name <> '참치불닭비빔우동'
  AND menu.name NOT LIKE '%김치삼겹볶음밥%'
  AND menu.name NOT LIKE '%삼겹소금%'
  AND menu.name NOT LIKE '%삼겹양념%'
  AND menu.name NOT LIKE '%마요%';
