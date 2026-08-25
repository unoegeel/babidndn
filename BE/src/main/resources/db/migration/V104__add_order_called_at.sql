-- First admin call timestamp for order processing-time analytics.
-- Immutable after first set. No historical backfill (unknown first-call time).

ALTER TABLE orders
    ADD COLUMN called_at DATETIME(6) NULL;

CREATE INDEX idx_orders_called_at
    ON orders (called_at);
