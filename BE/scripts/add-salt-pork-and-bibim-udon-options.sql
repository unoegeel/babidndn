-- 삼겹소금: 참기름 제외 보강
-- 참치불닭비빔우동: 토핑 관련 옵션이 있는 경우에만 PACKAGING(매장/포장) 추가
-- 과거 주문/나만의 메뉴 snapshot은 변경하지 않습니다.
-- 이미 존재하면 중복 insert 되지 않습니다.

SET NAMES utf8mb4;

-- 1) 메뉴명이 정확히 '삼겹소금'이고 토핑 옵션이 있는 메뉴에 '참기름 제외' 추가
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
    'TOPPING_REMOVE',
    '참기름 제외',
    0,
    1,
    FALSE,
    3,
    NOW(6),
    NOW(6)
FROM menus menu
INNER JOIN (
    SELECT DISTINCT menu_id
    FROM menu_options
    WHERE group_type IN ('TOPPING_ADD', 'TOPPING_REMOVE')
) topping_on ON topping_on.menu_id = menu.id
LEFT JOIN menu_options existing
    ON existing.menu_id = menu.id
    AND existing.group_type = 'TOPPING_REMOVE'
    AND existing.name = '참기름 제외'
WHERE menu.name = '삼겹소금'
  AND existing.id IS NULL;

-- 2) 메뉴명이 정확히 '참치불닭비빔우동'이고 토핑 관련 옵션이 있으면 PACKAGING 추가
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
WHERE menu.name = '참치불닭비빔우동'
  AND existing.id IS NULL;
