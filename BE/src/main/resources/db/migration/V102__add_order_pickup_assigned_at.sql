-- Queue entry timestamp: when pickup number was first assigned (activateAfterPayment).
-- Canonical chronology for Admin order board and customer waitingAheadCount.
-- Not updated on READY/call/complete.

ALTER TABLE orders
    ADD COLUMN pickup_assigned_at DATETIME(6) NULL;

-- pickup_number > 0: prefer earliest payment approved_at (any payment status).
UPDATE orders o
INNER JOIN (
    SELECT p.order_id AS order_id, MIN(p.approved_at) AS first_approved_at
    FROM payments p
    WHERE p.approved_at IS NOT NULL
    GROUP BY p.order_id
) paid ON paid.order_id = o.id
SET o.pickup_assigned_at = paid.first_approved_at
WHERE o.pickup_number > 0
  AND o.pickup_assigned_at IS NULL;

-- No payment row / approved_at: fall back to order creation time.
UPDATE orders
SET pickup_assigned_at = created_at
WHERE pickup_number > 0
  AND pickup_assigned_at IS NULL;

-- pickup_number = 0 (unpaid): leave pickup_assigned_at NULL.

CREATE INDEX idx_orders_queue_entry
    ON orders (pickup_assigned_at, id);
