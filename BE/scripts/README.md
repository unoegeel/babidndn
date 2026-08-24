# BE/scripts — SQL role classification

Flyway 도입 이후 **신규 schema 변경**은 `BE/src/main/resources/db/migration/` 에만 추가한다.
이 디렉터리의 파일은 삭제하지 않으며, 역할별로만 사용한다.

| Classification | Files | Notes |
|----------------|-------|-------|
| **LEGACY_APPLIED** | `add-order-access-token-hash.sql`, `create-developer-error-tables.sql`, `add-saved-menus.sql`, `add-menu-badge.sql`, `add-menu-topping-enabled.sql`, `add-naengmomil-*.sql`, `add-salt-pork-and-bibim-udon-options.sql` | 이미 환경에 수동 적용된 schema/seed성 DDL. Flyway V* 로 재실행하지 말 것. |
| **DATA_MAINTENANCE** | `initial-menu-data.sql`, `sync-menu-topping-remove-policies.sql`, `sync-cupbap-like-set-options.sql`, `replace-meat-add-topping.sql`, `fix-bibim-udon-topping-removes.sql`, `rename-spam-to-ham-grill.sql` | 메뉴/옵션 데이터 sync·보정. 필요 시 운영자 판단 하에 실행. |
| **PRECHECK** | `precheck-order-access-token-cutover.sql`, `schema-drift-audit.sql` | read-only 점검. |
| **ENV_BOOTSTRAP** | `create-dev-database.sql` | DB/유저 생성 등 환경 준비 (schema migration 아님). |

## FUTURE_MIGRATION

앞으로 schema를 바꾸는 SQL은 여기에 두지 말고:

`V{version}__{description}.sql` → `src/main/resources/db/migration/`

예: `V101__create_payment_reconciliation_issues.sql` (Phase B — 이미 migration 디렉터리에 존재)
