-- Developer Console error persistence tables
-- Hibernate ddl-auto:update 가 적용되지 않은 환경에서 수동 실행용.
-- MySQL 8.x

CREATE TABLE IF NOT EXISTS client_errors (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    tracking_request_id VARCHAR(64)  NULL,
    related_request_id  VARCHAR(64)  NULL,
    source              VARCHAR(30)  NOT NULL,
    error_name          VARCHAR(200) NOT NULL,
    message             VARCHAR(2000) NOT NULL,
    stack               VARCHAR(8000) NULL,
    component_stack     VARCHAR(8000) NULL,
    route               VARCHAR(500) NOT NULL,
    user_agent          VARCHAR(500) NULL,
    browser             VARCHAR(100) NULL,
    platform            VARCHAR(100) NULL,
    reported_at         DATETIME(6)  NOT NULL,
    created_at          DATETIME(6)  NOT NULL,
    INDEX idx_client_errors_created_at (created_at),
    INDEX idx_client_errors_tracking_request_id (tracking_request_id),
    INDEX idx_client_errors_related_request_id (related_request_id)
);

CREATE TABLE IF NOT EXISTS backend_errors (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    request_id       VARCHAR(64)  NULL,
    method           VARCHAR(10)  NULL,
    path             VARCHAR(500) NOT NULL,
    status           INT          NOT NULL,
    exception_class  VARCHAR(255) NOT NULL,
    message          VARCHAR(2000) NOT NULL,
    stack_trace      VARCHAR(8000) NULL,
    duration_ms      BIGINT       NULL,
    principal        VARCHAR(100) NULL,
    created_at       DATETIME(6)  NOT NULL,
    INDEX idx_backend_errors_created_at (created_at),
    INDEX idx_backend_errors_request_id (request_id),
    INDEX idx_backend_errors_status (status)
);
