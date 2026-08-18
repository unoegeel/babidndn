-- 나만의 메뉴 영구 저장 테이블.
-- Flyway/Liquibase 없음. 환경별 1회 또는 idempotent 재실행 가능.
-- 운영 반영: babi_order / 개발: babi_order_dev
-- 원본 메뉴·옵션이 삭제돼도 snapshot 행은 유지하고 FK만 NULL 로 둡니다.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS saved_menus (
    id BIGINT NOT NULL AUTO_INCREMENT,
    client_key VARCHAR(64) NOT NULL,
    menu_id BIGINT NULL,
    custom_name VARCHAR(100) NOT NULL,
    menu_name_snapshot VARCHAR(100) NOT NULL,
    menu_image_url_snapshot VARCHAR(255) NULL,
    menu_price_snapshot INT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_saved_menus_client_key (client_key),
    KEY idx_saved_menus_client_created (client_key, created_at),
    CONSTRAINT fk_saved_menus_menu
        FOREIGN KEY (menu_id) REFERENCES menus (id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS saved_menu_options (
    id BIGINT NOT NULL AUTO_INCREMENT,
    saved_menu_id BIGINT NOT NULL,
    menu_option_id BIGINT NULL,
    option_name_snapshot VARCHAR(100) NOT NULL,
    option_group_snapshot VARCHAR(30) NULL,
    additional_price_snapshot INT NOT NULL,
    quantity INT NOT NULL,
    display_order_snapshot INT NOT NULL,
    PRIMARY KEY (id),
    KEY idx_saved_menu_options_saved_menu (saved_menu_id),
    CONSTRAINT fk_saved_menu_options_saved_menu
        FOREIGN KEY (saved_menu_id) REFERENCES saved_menus (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_saved_menu_options_menu_option
        FOREIGN KEY (menu_option_id) REFERENCES menu_options (id)
        ON DELETE SET NULL
);
