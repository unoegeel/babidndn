-- First real schema mutation after baseline v100.
-- Persisted Order↔Payment reconciliation incidents (DETECT lifecycle only).

CREATE TABLE payment_reconciliation_issues (
    id BIGINT NOT NULL AUTO_INCREMENT,
    logical_key VARCHAR(191) NOT NULL,
    active_key VARCHAR(191) NULL,
    issue_type VARCHAR(64) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    order_id BIGINT NOT NULL,
    payment_id BIGINT NULL,
    status VARCHAR(20) NOT NULL,
    message VARCHAR(500) NOT NULL,
    metadata TEXT NULL,
    first_detected_at DATETIME(6) NOT NULL,
    last_detected_at DATETIME(6) NOT NULL,
    resolved_at DATETIME(6) NULL,
    occurrence_count BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_recon_active_key UNIQUE (active_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_recon_status_last_detected ON payment_reconciliation_issues (status, last_detected_at);
CREATE INDEX idx_recon_order_id ON payment_reconciliation_issues (order_id);
CREATE INDEX idx_recon_payment_id ON payment_reconciliation_issues (payment_id);
CREATE INDEX idx_recon_logical_key ON payment_reconciliation_issues (logical_key);

-- No FK on order_id / payment_id:
-- unpaid Order hard-delete and future cleanup must not be blocked by audit history rows.
