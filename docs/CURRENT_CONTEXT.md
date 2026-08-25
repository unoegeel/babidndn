# 바비든든 스마트 오더 — Current Development Context

> **기준일: 2026-08-20**  
> 살아있는 개발 문서 — 코드 변경 시 함께 갱신  
> 구조 상세: [ARCHITECTURE.md](ARCHITECTURE.md) · 실행: [README.md](../README.md)

---

## 1. Current Snapshot (Confirmed)

다음 기능은 **코드에 구현되어 있음**.

### Core

- 고객: 메뉴·옵션·장바구니·Toss 결제·주문 추적(polling)·Web Push·PWA
- 관리자: JWT · 주문 SSE · 메뉴/옵션 CRUD · 결제/취소 · 매출 · 팝업/리뷰 · S3
- Saved Menu: CRUD · `X-Client-Key` · snapshot · `resolveStatus()`

### Observability & Developer Console

- Request ID · `http_request_records`
- `client_errors` · `backend_errors` · `client_events`
  - `client_errors.stack` / `component_stack` = MySQL `TEXT` (VARCHAR(8000)은 utf8mb4 row-size ERROR 1118)
- `/dev` Overview · `/dev/errors|requests|reconciliation|events|analytics`
- `GET /api/dev/overview` · `GET /api/dev/analytics/menu-options`
- Menu×Option 선택률 (분모 `MENU_OPTION_OPEN`, 분자 `OPTION_SELECTED` + `menuId`)

### Payment Reconciliation (code verified 2026-08-24)

- Phase B core: persist OPEN/RESOLVED · scan · Toss read-only verify · V101 **dev MySQL verified**
- Rules: `ORDER_ACTIVATED_WITHOUT_PAYMENT` / `ORDER_ACTIVE_WITH_CANCELED_PAYMENT` (deprecated without-valid 신규 탐지 안 함)
- **Exposure (Admin→Dev migration implemented in repo):**
  - UI: `/dev/reconciliation` (`DeveloperReconciliationPage`) · sidebar「결제 정합성」
  - API: `/api/dev/reconciliation/**` (`DeveloperReconciliationController`) · `ROLE_DEVELOPER`
  - Core: `payment/reconciliation/*` (unchanged)
  - Admin `/admin/payments`: 결제 내역·취소·매출 분석만 — reconciliation UI/state/API 호출 없음
  - Legacy `/api/admin/payments/reconciliation*` · `AdminPaymentController` **제거** (compat adapter 없음)
- Boundary 원칙: [ARCHITECTURE.md](ARCHITECTURE.md) §5 · 설계 절차: [CONVENTIONS.md](CONVENTIONS.md) §2
- **dev deploy smoke of new Dev exposure: Pending** (아래 Status Matrix)

### API Rate Limiting (CODE READY — 2026-08-24)

- Package: `BE/.../ratelimit/` · `app.rate-limit.*` · dependency: Caffeine
- Targets: `POST /api/orders`, `/api/payments/confirm`, `/api/inquiries`, `/api/client-errors`, `/api/client-events`, `/api/admin/auth/login`
- Excluded: order GET polling · SSE · Toss webhook · `/api/dev/reconciliation/**`
- Identity: client(hash)+IP layered (public) · login IP-only · trusted-proxy IP resolve
- 429 + `Retry-After` · not written to `backend_errors`
- Login UX: `Retry-After` countdown on LoginPage (sessionStorage `babi_order_login_rate_limit_until`) · CORS exposes `Retry-After`
- FE: LoginPage 429 message · telemetry fetch already ignores failures (no loop)
- Tests: suite **enabled=false** by default · dedicated rate-limit tests enable locally
- **NO SCHEMA CHANGE / NO V102**
- **DEV RUNTIME VERIFIED: no** (deploy smoke Pending)

### Menu / UX (2026-08)

- `AdminMenuService` TOPPING_REMOVE 메뉴명 정책 (부분 일치)
- 옵션 시트: 마요 REMOVE 넓은 버튼 · 냉모밀세트 tall sheet · `HorizontalScrollHintRow`
- iPhone keyboard/viewport 보정 (`appHeight`, Saved Menu popup keyboard)

### Not in repo

- Android 프린터 앱 · CPP-3000/ESC-POS · QR 코드

---

## 2. Recently Changed

| 일자 | 영역 | 내용 |
|------|------|------|
| 2026-08-25 | Incident | Pickup: **primary** max(pickup) not createdAt-latest · **secondary** TX-bound `GET_LOCK`+JVM · FE post-payment load-before-nav · push exists derived · link dedupe. **DEPLOY READY · NO V102** |
| 2026-08-24 | Order API | `PUT /api/orders/{id}/status` canonical — duplicate `@PatchMapping` 제거 (FE `adminOrderService` PUT 계약 유지). **CODE READY** |
| 2026-08-24 | Security | Exclude `UserDetailsServiceAutoConfiguration` — Spring default generated password warning 제거 (Admin/JWT auth 유지). **CODE READY** |
| 2026-08-24 | Docs | Admin/Developer responsibility boundary (ARCHITECTURE §5) · Feature Responsibility decision process (CONVENTIONS §2) |
| 2026-08-24 | Observability | `NoResourceFoundException` → HTTP 404 `RESOURCE_NOT_FOUND` · backend_errors 미기록 (was 500 noise). **CODE READY** |
| 2026-08-24 | Security | Application rate limiting (CODE READY): targeted POSTs · client+IP / login IP · 429 RATE_LIMIT_EXCEEDED · Caffeine in-memory · **no V102** · **dev runtime smoke Pending** |
| 2026-08-24 | Dev Console | Reconciliation Admin→Developer 책임 이전: `/dev/reconciliation` · `/api/dev/reconciliation/**` · Admin UI/API 제거 (compat adapter 없음) |
| 2026-08-24 | Payment | Reconciliation rule refine: cancel 정상상태 false-positive 제거. `ORDER_ACTIVATED_WITHOUT_PAYMENT` / `ORDER_ACTIVE_WITH_CANCELED_PAYMENT`. V101 schema 변경 없음 |
| 2026-08-24 | Payment | Reconciliation Phase B: persisted OPEN/RESOLVED lifecycle · `V101` · scan/issues/Toss verify. **dev MySQL V101 runtime verified** |
| 2026-08-21 | DB | Flyway baseline 도입. `ddl-auto: validate`. baseline v100. 신규 schema는 `db/migration`만 |
| 2026-08-21 | Payment | Order↔Payment 정합성 Phase A (DETECT→DISPLAY snapshot) |
| 2026-08-20 | Security | 고객 주문 ACL: `X-Order-Access-Token` + `orders.access_token_hash`(SHA-256). Admin JWT bypass. production schema 적용 완료(v1.2.21) |
| 2026-08-20 | Dev Console | `client_errors` stack/component_stack → TEXT (MySQL ERROR 1118 재발 방지). **dev** `babi_order_dev`: table 생성·`/api/dev/errors`·`/overview` 200 확인 |
| 2026-08-20 | Dev Console | Overview API/Dashboard · menu-options analytics · errors sort null-safe · `create-developer-error-tables.sql` |
| 2026-08-20 | Menu policy | TOPPING_REMOVE canonical sync · `sync-menu-topping-remove-policies.sql` |
| 2026-08-20 | FE UX | 마요 REMOVE · 냉모밀 시트 · scroll hint · user guide step 11 |
| 2026-08 (이전) | Observability | Request tracking · client errors · events · dev console 1~8단계 · analytics funnel |

---

## 3. Status Matrix

### Confirmed (코드·테스트로 확인)

- Developer package tests: `./gradlew test --tests "com.gdgoc.babi_order.dev.*"` **PASS** (43 tests, 2026-08-20)
- FE `npm run build` **PASS**
- `OPTION_SELECTED` metadata에 `menuId` 포함 (`eventHelpers.ts`)
- `/api/dev/analytics/options` response shape **미변경**
- **dev DB `babi_order_dev`:** `backend_errors` 존재 · `client_errors`는 VARCHAR(8000) DDL로 ERROR 1118 → `TEXT`로 생성 후 `/api/dev/errors`·`/api/dev/overview` 200

### Pending (구현됐으나 운영·실데이터 검증 남음)

- **Rate limit:** code ready — **dev deploy smoke** (order/login/telemetry 429 · polling 미영향 · `/dev/errors`에 RATE_LIMIT 미적재)
- **HTTP 404 classification:** code ready — **dev smoke** (`GET /definitely-not-existing-resource` → 404 · `/dev/errors`에 미적재 · `/dev/requests` status 404)
- **Reconciliation Dev exposure:** code in repo — **dev deploy smoke** 미실행 (`/dev/reconciliation` · DEVELOPER API · Admin payments에 recon 네트워크 없음)
- **Flyway V101:** **dev MySQL verified** · prod 적용 여부는 배포 상태 확인
- **Fresh empty MySQL bootstrap** (full CREATE snapshot) 후속
- Slack/Discord/Email reconciliation alert (Phase B는 createdIssueIds만 준비)
- `BE/scripts/sync-menu-topping-remove-policies.sql` **운영 DB 미적용 가능**
- Developer Overview / menu-options KPI **운영 데이터 spot check**
- iPhone keyboard **전 기종 regression**
- Developer 계정 bootstrap / role 운영 절차

### Known Issue (현재 존재하는 문제)

| 이슈 | 설명 |
|------|------|
| FE lint | **0 errors** (2026-08-21). Warnings 3건 잔여(OrderStatus/PaymentFail/PaymentSuccess intentional deps) |
| Production schema | Flyway baseline **code ready**, 실 DB 미적용. Fresh MySQL bootstrap 미제공 |
| Customer API ACL | `X-Order-Access-Token` 코드 적용됨. Android/브라우저 smoke 미실행 |
| Cart | 메모리 only — 새로고침 시 유실 |

---

## 4. TOPPING_REMOVE 정책 (요약)

Backend `AdminMenuService` only — FE `MenuOptionModal`은 API 그대로 표시.

| 조건 | REMOVE |
|------|--------|
| 메뉴명에 `김치삼겹볶음밥` | 없음 |
| `삼겹소금` / `삼겹양념` 포함 | 김치·고추장 소스·참기름·김가루 (4) |
| `마요` 포함 (위보다 후순위) | 단무지·김가루 (2) |
| 그 외 컵밥형 | 김치·고추장 소스 (2) |
| `참치불닭비빔우동` | 전용 3종 + PACKAGING |

운영 DB: `BE/scripts/sync-menu-topping-remove-policies.sql` 또는 메뉴 저장/heal 시 동기화.

---

## 5. Business Rules (Must Not Break)

상세 flow는 [ARCHITECTURE.md](ARCHITECTURE.md) 참고. 변경 시 특히:

1. 결제 전 `pickupNumber=0` · 결제 후 발급  
2. Backend 주문 금액 source of truth · Payment 3중 검증  
3. OrderItem/Option **snapshot**  
4. SavedMenu `X-Client-Key` · `resolveStatus()`  
5. Observability 실패가 주문/결제 rollback 유발하면 안 됨  
6. Analytics Menu×Option: **시간순 menu↔option 추론 금지**

---

## 6. Test State (2026-08-24)

| Command | Result |
|---------|--------|
| `cd BE && ./gradlew clean test` | **PASS** (405 tests) — NoResourceFound → 404 + rate-limit suite |
| `cd FE && npm run lint` | **PASS** (0 errors, 3 intentional warnings) |
| `cd FE && npm test` | **PASS** (42 tests) |
| `cd FE && npm run build` | **PASS** |

---

## 7. Current Priorities

1. **Rate limit / Reconciliation:** dev deploy smoke
2. 고객 주문 API 접근 제어 **운영 smoke**
3. 결제·Checkout E2E
4. Fresh MySQL bootstrap (optional)
5. Alert sender (Slack 등) — `createdIssueIds` / CRITICAL only
6. Auto reconciliation **계속 금지**
7. Horizontal scale 시 distributed rate limiter 재검토

---

## 8. Working Rules

- 수정 전 entity/service/controller **실제 호출 관계** 확인  
- 결제: Order + Payment + Webhook + SSE  
- SavedMenu: snapshot + `resolveStatus()`  
- Observability 연동 flow: event/error/request  
- 프린터: FE bridge ≠ Android 앱 repo  

---

## 9. Update Policy

다음 변경 시 **반드시 이 파일 갱신**:

- 핵심 기능 추가/제거  
- DB·auth·배포 변경  
- Critical/High bug fix 또는 Pending → Confirmed 전환  
- 테스트/lint 상태 significant change  

Completed work를 Known Issue로 남기지 않는다.
