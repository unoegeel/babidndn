-- 참치불닭비빔우동: 컵밥 기본 사이즈/추가토핑/기본 제외토핑을 제거하고
-- 전용 TOPPING_REMOVE 3종만 남깁니다.
--
-- 실행 대상(Flyway/Liquibase 없음, 환경별 1회 또는 idempotent 재실행 가능):
--   개발: babi_order_dev
--   운영: babi_order
-- 과거 주문 snapshot(option_name_snapshot, option_group_snapshot 등)은 변경하지 않습니다.
-- 메뉴명 기준으로 조회하므로 환경별 menu id에 의존하지 않습니다.
-- 이미 반영된 환경에서는 detach/delete/insert가 중복으로 적용되지 않습니다.

SET NAMES utf8mb4;

-- 1) 정리 대상 옵션의 주문 FK만 해제 (snapshot 컬럼은 유지)
UPDATE order_item_options oio
INNER JOIN menu_options mo ON mo.id = oio.menu_option_id
INNER JOIN menus menu ON menu.id = mo.menu_id
SET oio.menu_option_id = NULL
WHERE menu.name = '참치불닭비빔우동'
  AND (
        mo.group_type IN ('SIZE', 'TOPPING_ADD')
        OR (
            mo.group_type = 'TOPPING_REMOVE'
            AND mo.name IN ('김치 제외', '고추장 소스 제외', '고추장소스 제외')
        )
      );

-- 2) 참치불닭비빔우동의 컵밥 기본 옵션만 삭제 (다른 메뉴는 변경하지 않음)
DELETE mo
FROM menu_options mo
INNER JOIN menus menu ON menu.id = mo.menu_id
WHERE menu.name = '참치불닭비빔우동'
  AND (
        mo.group_type IN ('SIZE', 'TOPPING_ADD')
        OR (
            mo.group_type = 'TOPPING_REMOVE'
            AND mo.name IN ('김치 제외', '고추장 소스 제외', '고추장소스 제외')
        )
      );

-- 3) 전용 제외 토핑 3종 추가 (이미 있으면 건너뜀)
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
LEFT JOIN menu_options existing
    ON existing.menu_id = menu.id
    AND existing.name = option_source.name
WHERE menu.name = '참치불닭비빔우동'
  AND existing.id IS NULL;
