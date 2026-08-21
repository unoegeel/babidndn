# Flyway migrations

Schema ownership after Flyway baseline introduction:

- **Existing dev/prod MySQL:** current schema is registered as **baseline version 100**
  (`spring.flyway.baseline-on-migrate=true`). Legacy `BE/scripts/*.sql` are **not** re-executed.
- **Next schema change:** add `V101__short_description.sql` (then V102, …).
- **Do not** rename or re-run historical `BE/scripts` files as `V1`/`V2` migrations.
- **Deployed migrations are immutable** — fix forward with a new version.
- **Fresh empty MySQL bootstrap** (full CREATE snapshot) is a follow-up task; H2 tests use
  `ddl-auto: create-drop` with Flyway disabled.

This directory intentionally has **no** versioned SQL until the first real schema change
(e.g. reconciliation alert persistence).
