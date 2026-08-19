-- 냉모밀 메뉴 PACKAGING(매장/포장) 옵션 동기화
-- 메뉴명에 '냉모밀'이 포함된 메뉴만 대상으로 합니다. 카테고리는 보지 않습니다.
-- 과거 주문/나만의 메뉴 snapshot(option_name_snapshot 등)은 변경하지 않습니다.
-- 운영 DB에 한 번 실행합니다. 이미 PACKAGING이 있으면 중복 insert 되지 않습니다.
--
-- 토핑 가능(TOPPING_ADD/REMOVE 또는 PACKAGING 존재):
--   매장/포장 생성 후 SIZE/TOPPING_ADD/TOPPING_REMOVE 제거
-- 토핑 불가능(위 그룹 없음, SIZE만 남은 경우):
--   SIZE 제거. PACKAGING은 만들지 않습니다.

SET NAMES utf8mb4;

-- 1) 토핑 가능 냉모밀에 PACKAGING 매장/포장 추가 (이미 있으면 건너뜀)
--    컵밥 옵션을 지우기 전에 넣어, 대상 메뉴를 TOPPING 존재로 식별할 수 있게 한다.
INSERT INTO menu_options (
    menu_id,
    group_type,
    name,
    additional_price,
    max_quantity,
    default_selected,
    display_order,
    created_at,
    updated_at
)
SELECT
    menu.id,
    'PACKAGING',
    option_source.name,
    0,
    1,
    option_source.default_selected,
    option_source.display_order,
    NOW(6),
    NOW(6)
FROM menus menu
INNER JOIN (
    SELECT DISTINCT menu_id
    FROM menu_options
    WHERE group_type IN ('TOPPING_ADD', 'TOPPING_REMOVE', 'PACKAGING')
) topping_on ON topping_on.menu_id = menu.id
CROSS JOIN (
    SELECT '매장' AS name, TRUE AS default_selected, 1 AS display_order
    UNION ALL SELECT '포장', FALSE, 2
) AS option_source
LEFT JOIN menu_options existing
    ON existing.menu_id = menu.id
    AND existing.group_type = 'PACKAGING'
    AND existing.name = option_source.name
WHERE menu.name LIKE '%냉모밀%'
  AND existing.id IS NULL;

-- 2) 토핑 가능 냉모밀: 컵밥 옵션의 주문/나만의 메뉴 FK만 해제 (snapshot 컬럼은 유지)
UPDATE order_item_options oio
INNER JOIN menu_options mo ON mo.id = oio.menu_option_id
INNER JOIN menus menu ON menu.id = mo.menu_id
SET oio.menu_option_id = NULL
WHERE menu.name LIKE '%냉모밀%'
  AND mo.group_type IN ('SIZE', 'TOPPING_ADD', 'TOPPING_REMOVE');

UPDATE saved_menu_options smo
INNER JOIN menu_options mo ON mo.id = smo.menu_option_id
INNER JOIN menus menu ON menu.id = mo.menu_id
SET smo.menu_option_id = NULL
WHERE menu.name LIKE '%냉모밀%'
  AND mo.group_type IN ('SIZE', 'TOPPING_ADD', 'TOPPING_REMOVE');

-- 3) 토핑 가능/불가능 공통: 냉모밀에서 컵밥 기본 옵션 삭제
--    (1)에서 PACKAGING을 넣은 토핑 가능 메뉴와, SIZE만 남은 토핑 불가 메뉴 모두 포함)
DELETE mo
FROM menu_options mo
INNER JOIN menus menu ON menu.id = mo.menu_id
WHERE menu.name LIKE '%냉모밀%'
  AND mo.group_type IN ('SIZE', 'TOPPING_ADD', 'TOPPING_REMOVE');
