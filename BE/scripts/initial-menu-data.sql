-- 바비든든 실제 서비스 초기 메뉴 데이터
-- Spring Boot를 먼저 실행하여 JPA 테이블을 생성한 뒤 실행합니다.
-- 동일한 카테고리, 메뉴, 옵션이 이미 있으면 중복으로 추가하지 않습니다.

SET NAMES utf8mb4;

-- 카테고리 4개
INSERT INTO categories (name, display_order, created_at, updated_at)
SELECT source.name, source.display_order, NOW(6), NOW(6)
FROM (
    SELECT '컵밥' AS name, 1 AS display_order
    UNION ALL SELECT '우동', 2
    UNION ALL SELECT '세트', 3
    UNION ALL SELECT '음료수', 4
) AS source
LEFT JOIN categories category ON category.name = source.name
WHERE category.id IS NULL;

-- 메뉴 45개
INSERT INTO menus (
    category_id,
    name,
    description,
    base_price,
    image_url,
    display_order,
    sale_status,
    created_at,
    updated_at
)
SELECT
    category.id,
    source.name,
    NULL,
    source.base_price,
    NULL,
    source.display_order,
    'AVAILABLE',
    NOW(6),
    NOW(6)
FROM (
    SELECT '컵밥' AS category_name, '삼겹소금' AS name, 3500 AS base_price, 1 AS display_order
    UNION ALL SELECT '컵밥', '삼겹양념(매운맛)', 3500, 2
    UNION ALL SELECT '컵밥', '참치마요', 3500, 3
    UNION ALL SELECT '컵밥', '치킨마요', 3500, 4
    UNION ALL SELECT '컵밥', '스팸마요', 3500, 5
    UNION ALL SELECT '컵밥', '불고기맛소금삼겹마요', 3500, 6
    UNION ALL SELECT '컵밥', '김치삼겹볶음밥', 3500, 7

    UNION ALL SELECT '우동', '바비우동', 4500, 1
    UNION ALL SELECT '우동', '김치우동', 4900, 2
    UNION ALL SELECT '우동', '참치불닭비빔우동', 5500, 3
    UNION ALL SELECT '우동', '냉모밀', 5500, 4

    UNION ALL SELECT '세트', '삼겹소금+바비우동', 7500, 1
    UNION ALL SELECT '세트', '삼겹양념(매운맛)+바비우동', 7500, 2
    UNION ALL SELECT '세트', '참치마요+바비우동', 7500, 3
    UNION ALL SELECT '세트', '치킨마요+바비우동', 7500, 4
    UNION ALL SELECT '세트', '스팸마요+바비우동', 7500, 5
    UNION ALL SELECT '세트', '김치삼겹볶음밥+바비우동', 7500, 6
    UNION ALL SELECT '세트', '불고기맛소금삼겹마요+바비우동', 7500, 7
    UNION ALL SELECT '세트', '삼겹소금+김치우동', 7900, 8
    UNION ALL SELECT '세트', '삼겹양념(매운맛)+김치우동', 7900, 9
    UNION ALL SELECT '세트', '참치마요+김치우동', 7900, 10
    UNION ALL SELECT '세트', '치킨마요+김치우동', 7900, 11
    UNION ALL SELECT '세트', '스팸마요+김치우동', 7900, 12
    UNION ALL SELECT '세트', '김치삼겹볶음밥+김치우동', 7900, 13
    UNION ALL SELECT '세트', '불고기맛소금삼겹마요+김치우동', 7900, 14
    UNION ALL SELECT '세트', '삼겹소금+냉모밀', 8500, 15
    UNION ALL SELECT '세트', '삼겹양념(매운맛)+냉모밀', 8500, 16
    UNION ALL SELECT '세트', '참치마요+냉모밀', 8500, 17
    UNION ALL SELECT '세트', '치킨마요+냉모밀', 8500, 18
    UNION ALL SELECT '세트', '스팸마요+냉모밀', 8500, 19
    UNION ALL SELECT '세트', '김치삼겹볶음밥+냉모밀', 8500, 20
    UNION ALL SELECT '세트', '불고기맛소금삼겹마요+냉모밀', 8500, 21

    UNION ALL SELECT '음료수', '사이다 245ml', 1200, 1
    UNION ALL SELECT '음료수', '사이다 500ml', 1900, 2
    UNION ALL SELECT '음료수', '사이다제로 355ml', 1500, 3
    UNION ALL SELECT '음료수', '사이다제로 500ml', 1900, 4
    UNION ALL SELECT '음료수', '펩시 245ml', 1200, 5
    UNION ALL SELECT '음료수', '펩시 500ml', 1900, 6
    UNION ALL SELECT '음료수', '펩시제로 245ml', 1200, 7
    UNION ALL SELECT '음료수', '펩시제로 355ml', 1500, 8
    UNION ALL SELECT '음료수', '펩시제로 500ml', 1900, 9
    UNION ALL SELECT '음료수', '탐스제로(파인애플) 355ml', 1500, 10
    UNION ALL SELECT '음료수', '탐스제로(오렌지) 355ml', 1500, 11
    UNION ALL SELECT '음료수', '탐스제로(파인애플) 500ml', 1900, 12
    UNION ALL SELECT '음료수', '탐스제로(오렌지) 500ml', 1900, 13
) AS source
JOIN categories category ON category.name = source.category_name
LEFT JOIN menus menu
    ON menu.category_id = category.id
    AND menu.name = source.name
WHERE menu.id IS NULL;

-- 기존 초기 데이터에서 SIZE로 잘못 저장된 '밥 추가'를 추가 토핑으로 교정합니다.
UPDATE menu_options menu_option
JOIN menus menu ON menu.id = menu_option.menu_id
JOIN categories category ON category.id = menu.category_id
SET
    menu_option.group_type = 'TOPPING_ADD',
    menu_option.additional_price = 1000,
    menu_option.max_quantity = 3,
    menu_option.default_selected = FALSE,
    menu_option.display_order = 2,
    menu_option.updated_at = NOW(6)
WHERE category.name IN ('컵밥', '세트')
  AND menu_option.name = '밥 추가'
  AND menu_option.group_type = 'SIZE';

-- 컵밥과 세트 메뉴에 사이즈 3종, 추가 토핑 6종, 제외 토핑 2종을 연결합니다.
-- 세트 메뉴의 옵션은 세트에 포함된 컵밥에 적용합니다.
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
    option_source.group_type,
    option_source.name,
    option_source.additional_price,
    option_source.max_quantity,
    option_source.default_selected,
    option_source.display_order,
    NOW(6),
    NOW(6)
FROM menus menu
JOIN categories category ON category.id = menu.category_id
CROSS JOIN (
    SELECT
        'SIZE' AS group_type,
        '싱글' AS name,
        0 AS additional_price,
        1 AS max_quantity,
        TRUE AS default_selected,
        1 AS display_order
    UNION ALL SELECT 'SIZE', '더블', 1000, 1, FALSE, 2
    UNION ALL SELECT 'SIZE', '점보', 2000, 1, FALSE, 3
    UNION ALL SELECT 'TOPPING_ADD', '계란후라이', 700, 3, FALSE, 1
    UNION ALL SELECT 'TOPPING_ADD', '햄구이', 700, 3, FALSE, 2
    UNION ALL SELECT 'TOPPING_ADD', '밥 추가', 1000, 3, FALSE, 3
    UNION ALL SELECT 'TOPPING_ADD', '삼겹소금 추가', 1200, 3, FALSE, 4
    UNION ALL SELECT 'TOPPING_ADD', '삼겹양념 추가', 1200, 3, FALSE, 5
    UNION ALL SELECT 'TOPPING_ADD', '참치마요 추가', 1200, 3, FALSE, 6
    UNION ALL SELECT 'TOPPING_ADD', '모짜렐라치즈', 1000, 3, FALSE, 7
    UNION ALL SELECT 'TOPPING_ADD', '체다치즈', 500, 3, FALSE, 8
    UNION ALL SELECT 'TOPPING_REMOVE', '김치 제외', 0, 1, FALSE, 1
    UNION ALL SELECT 'TOPPING_REMOVE', '고추장 소스 제외', 0, 1, FALSE, 2
) AS option_source
LEFT JOIN menu_options menu_option
    ON menu_option.menu_id = menu.id
    AND menu_option.name = option_source.name
WHERE category.name IN ('컵밥', '세트')
  AND menu_option.id IS NULL;

-- 참치불닭비빔우동: 컵밥 기본 토핑 없이 제외 토핑 3종만 연결합니다.
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
    option_source.group_type,
    option_source.name,
    option_source.additional_price,
    option_source.max_quantity,
    option_source.default_selected,
    option_source.display_order,
    NOW(6),
    NOW(6)
FROM menus menu
CROSS JOIN (
    SELECT
        'TOPPING_REMOVE' AS group_type,
        '불닭소스 제외' AS name,
        0 AS additional_price,
        1 AS max_quantity,
        FALSE AS default_selected,
        1 AS display_order
    UNION ALL SELECT 'TOPPING_REMOVE', '김가루 제외', 0, 1, FALSE, 2
    UNION ALL SELECT 'TOPPING_REMOVE', '파 제외', 0, 1, FALSE, 3
) AS option_source
LEFT JOIN menu_options menu_option
    ON menu_option.menu_id = menu.id
    AND menu_option.name = option_source.name
WHERE menu.name = '참치불닭비빔우동'
  AND menu_option.id IS NULL;
