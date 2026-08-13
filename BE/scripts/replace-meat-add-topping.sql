-- 기본 토핑: '고기 추가' 제거 + 삼겹소금/삼겹양념/참치마요 추가
-- 과거 주문 snapshot(option_name_snapshot 등)은 변경하지 않습니다.
-- 운영 DB에 한 번 실행합니다. 이미 반영된 환경에서는 중복 insert가 되지 않습니다.

SET NAMES utf8mb4;

-- 1) 과거 주문 옵션 FK만 해제 (snapshot 컬럼은 유지)
UPDATE order_item_options oio
INNER JOIN menu_options mo ON mo.id = oio.menu_option_id
SET oio.menu_option_id = NULL
WHERE mo.name = '고기 추가';

-- 2) 현재 메뉴 옵션에서 '고기 추가' 삭제
DELETE FROM menu_options
WHERE name = '고기 추가';

-- 3) 기존 치즈/스팸 순서를 최종 displayOrder에 맞춤 (가격은 변경하지 않음)
UPDATE menu_options
SET display_order = 6, updated_at = NOW(6)
WHERE group_type = 'TOPPING_ADD' AND name = '모짜렐라치즈';

UPDATE menu_options
SET display_order = 7, updated_at = NOW(6)
WHERE group_type = 'TOPPING_ADD' AND name = '체다치즈';

UPDATE menu_options
SET display_order = 8, updated_at = NOW(6)
WHERE group_type = 'TOPPING_ADD' AND name = '스팸';

-- 4) 토핑이 있는 메뉴에 새 3개 추가 (이미 있으면 건너뜀)
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
    'TOPPING_ADD',
    option_source.name,
    option_source.additional_price,
    3,
    FALSE,
    option_source.display_order,
    NOW(6),
    NOW(6)
FROM menus menu
INNER JOIN (
    SELECT DISTINCT menu_id
    FROM menu_options
    WHERE group_type IN ('TOPPING_ADD', 'TOPPING_REMOVE')
) topping_menus ON topping_menus.menu_id = menu.id
CROSS JOIN (
    SELECT '삼겹소금 추가' AS name, 1200 AS additional_price, 3 AS display_order
    UNION ALL SELECT '삼겹양념 추가', 1200, 4
    UNION ALL SELECT '참치마요 추가', 1200, 5
) AS option_source
LEFT JOIN menu_options existing
    ON existing.menu_id = menu.id
    AND existing.name = option_source.name
WHERE existing.id IS NULL;

-- 5) 이미 1000원으로 들어간 신규 3개는 최종 가격 1200원으로 맞춤
--    (일반 GET healing은 동명 옵션 가격을 덮어쓰지 않음. 이번 일회성 스크립트만 예외)
UPDATE menu_options
SET additional_price = 1200, updated_at = NOW(6)
WHERE group_type = 'TOPPING_ADD'
  AND name IN ('삼겹소금 추가', '삼겹양념 추가', '참치마요 추가');
