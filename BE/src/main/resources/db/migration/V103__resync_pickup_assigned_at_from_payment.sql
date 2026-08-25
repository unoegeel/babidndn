-- Dev repair / prod-safe re-sync: pickup_assigned_at must match Payment.approved_at
-- (Asia/Seoul wall-clock LocalDateTime via Toss OffsetDateTime → atZoneSameInstant).
--
-- V102 already applied on some environments. Do not rewrite V102 (Flyway checksum).
-- Prefer payment MIN(approved_at) over created_at — created_at may have been written
-- with JVM default zone (UTC wall) while approved_at is Seoul, causing ~+9h skew
-- when comparing naive LocalDateTime values. Do NOT subtract 9 hours blindly.

UPDATE orders o
INNER JOIN (
    SELECT p.order_id AS order_id, MIN(p.approved_at) AS first_approved_at
    FROM payments p
    WHERE p.approved_at IS NOT NULL
    GROUP BY p.order_id
) paid ON paid.order_id = o.id
SET o.pickup_assigned_at = paid.first_approved_at
WHERE o.pickup_number > 0;

-- Still no payment approved_at: keep / set created_at fallback (may be legacy UTC wall).
UPDATE orders
SET pickup_assigned_at = created_at
WHERE pickup_number > 0
  AND pickup_assigned_at IS NULL;
