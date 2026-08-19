-- menus 테이블에 토핑 선택 가능 여부 컬럼 추가 후 기존 데이터 백필
-- 운영 DB 배포 전 1회 실행. 이미 컬럼이 있으면 ALTER는 건너뛰고 백필만 수행합니다.
-- Spring Boot dev 환경(ddl-auto: update)에서는 Entity 기준으로 컬럼이 자동 반영될 수 있습니다.
-- 과거 주문/나만의 메뉴 snapshot은 변경하지 않습니다.

SET NAMES utf8mb4;

SET @topping_enabled_column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'menus'
      AND COLUMN_NAME = 'topping_enabled'
);

SET @add_topping_enabled_sql = IF(
    @topping_enabled_column_exists = 0,
    'ALTER TABLE menus ADD COLUMN topping_enabled TINYINT(1) NOT NULL DEFAULT 0',
    'SELECT 1'
);

PREPARE add_topping_enabled_stmt FROM @add_topping_enabled_sql;
EXECUTE add_topping_enabled_stmt;
DEALLOCATE PREPARE add_topping_enabled_stmt;

-- 백필: SIZE만 있는 메뉴는 false. ADD/REMOVE/PACKAGING이 있으면 true.
UPDATE menus menu
SET menu.topping_enabled = EXISTS (
    SELECT 1
    FROM menu_options option_row
    WHERE option_row.menu_id = menu.id
      AND option_row.group_type IN ('TOPPING_ADD', 'TOPPING_REMOVE', 'PACKAGING')
);
