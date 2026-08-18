-- menus 테이블에 메뉴 배지 컬럼 추가
-- 운영 DB 배포 전 1회 실행. 이미 컬럼이 있으면 아무 작업도 하지 않습니다.
-- Spring Boot dev 환경(ddl-auto: update)에서는 Entity 기준으로 자동 반영될 수 있습니다.

SET NAMES utf8mb4;

SET @badge_column_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'menus'
      AND COLUMN_NAME = 'badge'
);

SET @add_badge_sql = IF(
    @badge_column_exists = 0,
    'ALTER TABLE menus ADD COLUMN badge VARCHAR(20) NOT NULL DEFAULT ''NONE''',
    'SELECT 1'
);

PREPARE add_badge_stmt FROM @add_badge_sql;
EXECUTE add_badge_stmt;
DEALLOCATE PREPARE add_badge_stmt;
