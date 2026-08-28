# BabiOrder — Development Conventions

> 목적: **실제 코드에서 확인된 규칙** + 유지해야 할 프로젝트 관례  
> 구조: [ARCHITECTURE.md](ARCHITECTURE.md) · 운영 상태: [CURRENT_CONTEXT.md](CURRENT_CONTEXT.md)

문서에 **「권장」** 이라고 표기된 항목은 팀 합의 관례이며, 코드 전역에 100% 강제되지 않을 수 있습니다.

---

## 1. General Principles

1. 기존 package·naming·패턴을 우선한다.
2. 동일 문제를 푸는 기존 구현이 있으면 새 패턴을 도입하지 않는다.
3. unrelated refactor 금지 — 목적에 맞는 최소 diff.
4. **Business rule은 Backend source of truth** — FE는 API 결과를 표시·입력 검증만.
5. 변경 후 관련 테스트·영향 범위 확인.
6. **기능 위치는 데이터 domain이 아니라 actor responsibility로 정한다** — §2.

---

## 2. Feature Responsibility Before Implementation

새 기능의 파일·route·controller를 정하기 **전에** 아래 순서로 판단한다.

### Decision order

1. **Actor** — `CUSTOMER` | `ADMIN` | `DEVELOPER` | `SYSTEM`
2. **Responsibility** — 누가 확인 · 판단 · 조치하는가
3. **Feature type** — `customer experience` | `business operation` | `observability / diagnostics` | `system automation`
4. **Exposure** — FE route · navigation · API namespace · authorization role
5. **Core ownership** — service / repository / domain package (공용 domain이면 actor package로 억지 이동 금지)

### Mandatory

| 예 | Actor |
|----|-------|
| Payment History / 정상 결제 취소 | ADMIN |
| Order Management (매장 운영) | ADMIN |
| Customer Order Tracking | CUSTOMER |
| Payment Reconciliation | DEVELOPER |
| Error / request diagnostics | DEVELOPER |

**Domain ownership ≠ Exposure ownership** — core는 `order/`, `payment/`에 두고 exposure만 `/admin` vs `/dev`로 분리할 수 있다.

구현 prompt·계획에서도 파일 경로보다 `Actor → Responsibility → Feature Type → Exposure → Core`를 먼저 적는다.

---

## 3. Backend Layering

```text
Controller  → HTTP contract, validation trigger
Service     → business rule, @Transactional
Repository  → persistence (JpaRepository / native query)
Entity      → DB model
DTO         → API request/response
```

- Developer Console exposure: `dev/overview`, `dev/analytics`, `dev/error`, `dev/request`, `dev/event`, `dev/reconciliation`
- Analytics 집계: native SQL repository — Java 전체 로드 금지 (기존 패턴 유지)

---

## 4. Frontend Layout

```text
pages/        # route-level (user / owner / developer)
components/   # UI
services/     # backend 호출
api/          # HTTP client
store/        # Context
utils/        # 공통 로직
types/        # 공유 타입
```

---

## 5. Naming

| 대상 | 규칙 |
|------|------|
| React component | PascalCase |
| TS 함수/변수 | camelCase |
| Java class | PascalCase |
| Service | `*Service` |
| Controller | `*Controller` |
| Repository | `*Repository` |

---

## 6. API Conventions

- 기존 endpoint path 유지 (`/api/admin/*`, `/api/dev/*`, …)
- breaking DTO change 금지 — 확장은 optional field 또는 **새 endpoint**
- 인증: `SecurityConfig` + FE `RequireAdminAuth` / `RequireDeveloperAuth` 동시 확인
- Error response: `ApiException` → `ErrorResponse`

### API base URL resolution (FE)

- `resolveApiBaseUrl()` 기존 우선순위를 따른다: **hostname map → `VITE_API_BASE_URL` → dev proxy → fallback**
- hostname map 변경 시 아래를 함께 검증한다:
  - `FE/src/api/client.ts`
  - `orderApiBaseUrl` 저장·복원 (`rememberOrderApiBaseUrl` / `getOrderApiBaseUrl`)
  - Toss payment success callback URL (`CheckoutPage`)
  - `vercel.json` `/api` rewrite
  - BE CORS `ALLOWED_ORIGINS` · payment redirect allowlist
- **Application-facing endpoint** (FE가 호출하는 host)와 **infrastructure alias** (Cloudflare/Nginx vhost)를 혼동하지 않는다 — host 역할은 [ARCHITECTURE.md](ARCHITECTURE.md) §4 참고

---

## 7. State Management & Client Storage

- 전역: **React Context** (`UserDataContext`, `AdminDataContext`)
- 민감 정보 localStorage 저장 금지 (JWT, Toss secret 등)

### Customer order storage (확인된 key)

| Key | 용도 |
|-----|------|
| `babi_user_orders_v2` | 최근 주문 metadata |
| `babi_user_orders_storage_migration` | cutover marker (`2`) |
| `babi_order_access_tokens` | `orderId → raw access token` |
| `babi_client_key` | Saved Menu anonymous id |
| `orderApiBaseUrl` | 결제 흐름 API base (session + local) |

- Legacy `babi_user_orders`는 migration v2에서 제거 — 신규 코드는 `userOrdersStorage.ts` 사용
- **서버 DB가 주문 존재의 최종 authority** — FE local cache는 보조
- Stale 제거: HTTP 404 **and** `code === ORDER_NOT_FOUND`일 때만 (`isOrderNotFoundError`) — 5xx·network·timeout은 삭제 금지
- `localStorage` 전체 clear 금지 — 주문 관련 key만 정확히 대상으로 한다

---

## 8. Observability

새 핵심 사용자 flow 추가 시 연결 검토:

| 계층 | FE | BE |
|------|----|----|
| Event | `trackEvent()` / `eventHelpers` | `POST /api/client-events` |
| Client error | `reportFrontendError` | `POST /api/client-errors` |
| Request | `X-Request-Id` | `RequestIdFilter`, `http_request_records` |

### Error recording policy

| | backend_errors | http_request_records |
|--|----------------|----------------------|
| Expected `ApiException` 4xx | X | O (status 기록) |
| `NoResourceFoundException` | X | O (404) |
| SSE stream `AsyncRequestTimeoutException` | X | skip (SSE path) |
| Uncaught unexpected | O | O |

### Analytics vs raw diagnostics

- **Raw `/dev/errors`:** historical row 변경·삭제하지 않음
- **Analytics KPI:** `ActionableBackendErrorCriteria`로 known noise 제외 — predicate는 한 곳에서 재사용
- HTTP 5xx metric은 `http_request_records` status 기준 — actionable filter와 혼동하지 않음
- FE에서 숫자만 숨기는 방식으로 observability semantics를 바꾸지 않음

### Analytics conventions

- 집계 기본 키: **`anonymousId`** (sessionId로 임의 대체 금지)
- Menu×Option: `OPTION_SELECTED.metadata.menuId` 필수 — 시간순 추론 금지
- Payment behavior success rate: session-sequential semantics (raw event count ≠ conversion rate)

---

## 9. Order / Payment / SavedMenu

변경 시 반드시 검토:

- Backend 금액 source of truth
- OrderItem snapshot
- Payment 3중 검증 · webhook 재조회
- `pickupNumber` 발급 시점 · `pickup_assigned_at` queue ordering
- `called_at` — **POST /call only**
- SSE event
- SavedMenu `resolveStatus()`, `X-Client-Key`
- 고객 order-scoped API: `X-Order-Access-Token` (`OrderAccessGuard`)
- `X-Client-Key`를 주문 authorization credential로 쓰지 않음

---

## 10. Database / Schema

변경 체크리스트: Entity → Relation → Service → DTO → **Flyway migration** → Test

| Layer | Responsibility |
|-------|----------------|
| **Flyway** | `classpath:db/migration` only |
| **Hibernate** | `ddl-auto: validate` — mutation 금지 |
| **H2 tests** | `create-drop`, Flyway off |

- **배포된 migration 수정 금지** — rollback/수정은 새 version
- `BE/scripts/*.sql` — data maintenance / precheck — Flyway 대체 아님
- prod/dev DB 분리: dev container는 `babi_order_dev` 강제 (`deploy-backend.yml`)

---

## 11. Mobile UI

iOS keyboard 관련 변경 시: `appHeight.ts`, `useSavedMenuPopupKeyboard.ts`, `visualViewport` — 임의 제거 금지.

---

## 12. Testing

### Backend

- Business logic: `@DataJpaTest` + `@Import` 또는 service unit test
- Controller: `@WebMvcTest` + Security import
- Analytics native SQL: repository integration test 또는 service mock
- Actionable error predicate: unit + `@DataJpaTest` query 실행 검증

### Frontend

- `npm run build` · `npm run lint` · `npm test` (vitest)
- Storage migration·error helper: unit test 추가

---

## 13. Git / Change Scope

- 한 commit/PR = 하나의 명확한 목적 (권장)
- migration/seed/script 변경은 deploy 영향 명시
- 기능·schema·auth·배포·운영 상태 변경 시 [CURRENT_CONTEXT.md](CURRENT_CONTEXT.md) 갱신

---

## 14. Definition of Done

1. §2 Feature Responsibility 판단 완료
2. 기존 구조·naming 일치
3. Business rule 미파괴
4. FE/BE 호출부 반영
5. 관련 test/build 가능
6. 필요 시 ARCHITECTURE / CURRENT_CONTEXT 갱신

---

## 15. Documentation Maintenance

| 변경 유형 | 갱신 문서 |
|-----------|-----------|
| 실행·배포·env | README |
| 구조·domain·API · infra topology | ARCHITECTURE |
| 코딩 규칙 · responsibility | CONVENTIONS |
| 최근 작업·운영 상태·Pending | CURRENT_CONTEXT |

CONVENTIONS는 규칙 자체가 바뀔 때만 수정한다. 버전별 changelog는 CURRENT_CONTEXT에 둔다.
