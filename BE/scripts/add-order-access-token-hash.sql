-- Additive: customer order access token hash (raw token은 DB에 저장하지 않음)
-- Production/dev 적용 전 반드시 DB backup 후 실행.

ALTER TABLE orders
    ADD COLUMN access_token_hash VARCHAR(64) NULL;

-- Optional verification:
-- SHOW COLUMNS FROM orders LIKE 'access_token_hash';
