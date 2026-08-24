# Flyway migrations

Schema ownership after Flyway baseline:

- **Existing dev/prod MySQL:** baseline version **100** (already applied).
- **V101:** `V101__create_payment_reconciliation_issues.sql` — persisted reconciliation incidents.
- **Next schema change:** `V102__short_description.sql` …
- **Do not** rename or re-run historical `BE/scripts` files as `V1`/`V2` migrations.
- **Deployed migrations are immutable** — fix forward with a new version.
- **Tests:** H2 `create-drop` with Flyway disabled — Gradle test does **not** prove MySQL Flyway runtime.
