-- 냉모밀 컵밥 세트: 기존 컵밥 옵션을 유지한 채 PACKAGING(매장/포장)만 보강
-- 삼겹소금 계열: 정확한 메뉴명에만 '참기름 제외' 보강
--
-- 대상 세트(운영 메뉴명 기준):
--   삼겹소금+냉모밀
--   삼겹양념(매운맛)+냉모밀
--   참치마요+냉모밀
--   치킨마요+냉모밀
--   스팸마요+냉모밀
--   김치삼겹볶음밥+냉모밀
--   불고기맛소금삼겹마요+냉모밀
--
-- 과거 add-naengmomil-packaging-options.sql 이 세트 SIZE/토핑을 지운 경우,
-- 앱 GET/관리자 저장의 ensureDefaultOptions 가 컵밥 옵션을 복구합니다.
-- 이 스크립트는 PACKAGING / 참기름 제외만 upsert 합니다.
--
-- 토핑 관련 옵션(SIZE/ADD/REMOVE/PACKAGING)이 없는 메뉴는 토핑 OFF로 보고 생성하지 않습니다.
-- 이미 있으면 중복 insert 하지 않습니다.
-- 과거 주문/나만의 메뉴 snapshot 은 변경하지 않습니다.

SET NAMES utf8mb4;

-- 1) 컵밥/세트 카테고리 + 메뉴명에 냉모밀 포함 + 토핑 관련 옵션이 있으면 PACKAGING 추가
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
INNER JOIN categories category ON category.id = menu.category_id
INNER JOIN (
    SELECT DISTINCT menu_id
    FROM menu_options
    WHERE group_type IN ('SIZE', 'TOPPING_ADD', 'TOPPING_REMOVE', 'PACKAGING')
) topping_on ON topping_on.menu_id = menu.id
CROSS JOIN (
    SELECT '매장' AS name, TRUE AS default_selected, 1 AS display_order
    UNION ALL SELECT '포장', FALSE, 2
) AS option_source
LEFT JOIN menu_options existing
    ON existing.menu_id = menu.id
    AND existing.group_type = 'PACKAGING'
    AND existing.name = option_source.name
WHERE category.name IN ('컵밥', '세트')
  AND menu.name LIKE '%냉모밀%'
  AND existing.id IS NULL;

-- 2) 삼겹소금 계열(정확 일치)이고 토핑 ON 인 메뉴에 '참기름 제외' 추가
--    삼겹소금+냉모밀은 과거 스크립트로 ADD/REMOVE 가 지워지고 PACKAGING만 남은 경우도 포함한다.
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
       OR (group_type = 'PACKAGING' AND menu_id IN (
            SELECT id FROM menus WHERE name = '삼겹소금+냉모밀'
       ))
) topping_on ON topping_on.menu_id = menu.id
LEFT JOIN menu_options existing
    ON existing.menu_id = menu.id
    AND existing.group_type = 'TOPPING_REMOVE'
    AND existing.name = '참기름 제외'
WHERE menu.name IN (
        '삼겹소금',
        '삼겹소금+바비우동',
        '삼겹소금+김치우동',
        '삼겹소금+냉모밀'
    )
  AND existing.id IS NULL;
