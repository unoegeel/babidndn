-- 운영 카테고리(바비우동세트/김치우동세트/냉모밀세트 등) 옵션 동기화
-- 1) TOPPING_ADD 스팸 → 햄구이
-- 2) 삼겹소금 계열 정확 4개 메뉴에 참기름 제외
-- 3) 컵밥형 냉모밀 세트에 PACKAGING 매장/포장
--
-- 이미 실행된 migration은 수정하지 않습니다. 이 파일만 운영에 1회 실행합니다.
-- 과거 주문/나만의 메뉴 snapshot은 변경하지 않습니다.
-- topping_enabled=false 이거나 토핑 관련 옵션이 없는 메뉴에는 새 옵션을 만들지 않습니다.

SET NAMES utf8mb4;

-- 컵밥형: 이름 = '컵밥' 또는 '세트'로 끝남 (바비우동세트/김치우동세트/냉모밀세트 포함)
-- 면/음료수는 대상이 아니다.

-- 1-a) 이미 햄구이가 있는 컵밥형 메뉴의 스팸은 삭제 (snapshot 컬럼은 유지, FK만 해제)
UPDATE order_item_options oio
INNER JOIN menu_options mo ON mo.id = oio.menu_option_id
INNER JOIN menus menu ON menu.id = mo.menu_id
INNER JOIN categories category ON category.id = menu.category_id
SET oio.menu_option_id = NULL
WHERE mo.group_type = 'TOPPING_ADD'
  AND mo.name = '스팸'
  AND (category.name = '컵밥' OR category.name LIKE '%세트')
  AND mo.menu_id IN (
      SELECT menu_id FROM (
          SELECT menu_id
          FROM menu_options
          WHERE group_type = 'TOPPING_ADD' AND name = '햄구이'
      ) existing_ham
  );

UPDATE saved_menu_options smo
INNER JOIN menu_options mo ON mo.id = smo.menu_option_id
INNER JOIN menus menu ON menu.id = mo.menu_id
INNER JOIN categories category ON category.id = menu.category_id
SET smo.menu_option_id = NULL
WHERE mo.group_type = 'TOPPING_ADD'
  AND mo.name = '스팸'
  AND (category.name = '컵밥' OR category.name LIKE '%세트')
  AND mo.menu_id IN (
      SELECT menu_id FROM (
          SELECT menu_id
          FROM menu_options
          WHERE group_type = 'TOPPING_ADD' AND name = '햄구이'
      ) existing_ham
  );

DELETE mo
FROM menu_options mo
INNER JOIN menus menu ON menu.id = mo.menu_id
INNER JOIN categories category ON category.id = menu.category_id
WHERE mo.group_type = 'TOPPING_ADD'
  AND mo.name = '스팸'
  AND (category.name = '컵밥' OR category.name LIKE '%세트')
  AND mo.menu_id IN (
      SELECT menu_id FROM (
          SELECT menu_id
          FROM menu_options
          WHERE group_type = 'TOPPING_ADD' AND name = '햄구이'
      ) existing_ham
  );

-- 1-b) 남은 스팸 → 햄구이 (같은 메뉴에 햄구이가 없을 때만)
UPDATE menu_options mo
INNER JOIN menus menu ON menu.id = mo.menu_id
INNER JOIN categories category ON category.id = menu.category_id
SET mo.name = '햄구이', mo.updated_at = NOW(6)
WHERE mo.group_type = 'TOPPING_ADD'
  AND mo.name = '스팸'
  AND (category.name = '컵밥' OR category.name LIKE '%세트')
  AND mo.menu_id NOT IN (
      SELECT menu_id FROM (
          SELECT menu_id
          FROM menu_options
          WHERE group_type = 'TOPPING_ADD' AND name = '햄구이'
      ) existing_ham
  );

-- 2) 삼겹소금 계열(정확 일치) + 토핑 ON → 참기름 제외
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
WHERE menu.name IN (
        '삼겹소금',
        '삼겹소금+바비우동',
        '삼겹소금+김치우동',
        '삼겹소금+냉모밀'
    )
  AND existing.id IS NULL;

-- 3) 카테고리명이 '세트'로 끝나고 메뉴명에 냉모밀이 있으며 토핑 관련 옵션이 있으면 PACKAGING 추가
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
WHERE category.name LIKE '%세트'
  AND menu.name LIKE '%냉모밀%'
  AND existing.id IS NULL;
