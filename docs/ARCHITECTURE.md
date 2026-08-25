# 바비든든 스마트 오더 — Architecture

> 기준일: 2026-08-20  
> Source of truth: 실제 `babidndn` 저장소 코드  
> 입문·실행: [README.md](../README.md) · 코딩 규칙: [CONVENTIONS.md](CONVENTIONS.md) · 현재 상태: [CURRENT_CONTEXT.md](CURRENT_CONTEXT.md)

## 1. Project Overview

바비오더는 매장 픽업 주문 PWA + Spring Boot API 모노레포입니다.

| 영역 | Route | 인증 |
|------|-------|------|
| 고객 | `/user/*` | 없음 |
| 관리자 | `/admin/*` | JWT `ROLE_ADMIN` |
| 개발자 | `/dev/*` | JWT `ROLE_DEVELOPER` |

외부 연동: Toss Payments · AWS S3 · Web Push(VAPID) · SMTP · Android WebView printer bridge

## 2. Repository Structure

```text
babidndn/
├── FE/src/
│   ├── pages/user/           # 고객
│   ├── pages/owner/          # 관리자 (URL은 /admin)
│   ├── pages/developer/      # Developer Console
│   ├── components/           # user / owner / developer
│   ├── services/             # API 호출
│   ├── store/                # UserDataContext, AdminDataContext
│   ├── api/client.ts         # HTTP + JWT
│   ├── utils/                # optionSort, appHeight, userEvent, …
│   └── types/
├── BE/src/main/java/com/gdgoc/babi_order/
│   ├── admin/ menu/ order/ payment/ savedmenu/ sales/ store/ push/ contact/
│   ├── ratelimit/            # application-level API rate limiting
│   ├── clientevent/ clienterror/ backenderror/ httprequest/
│   ├── dev/                  # overview, error, request, event, analytics, reconciliation (exposure)
│   └── config/
├── BE/scripts/
├── BE/compose.yml
├── .github/workflows/deploy-backend.yml
└── vercel.json
```

## 3. Technology Stack

**Frontend:** React 19 · Vite 8 · Tailwind 4 · React Router 7 · Context (Zustand/Redux 없음) · PWA · vitest

**Backend:** Java 21 · Spring Boot 4.1 · JPA · JWT Security · SSE · MySQL 8.4

**Infrastructure:** Vercel(FE) · GitHub Actions → ECR → EC2 Docker(BE) · **Flyway** (baseline v100) · Hibernate `ddl-auto: validate`

## 4. System Architecture

```text
Customer PWA (/user) ──REST──┐
Admin (/admin) ──JWT─────────┼──► Spring Boot :8080
Developer (/dev) ──JWT───────┘         │
                                       ├── MySQL
                                       ├── Toss Payments
                                       ├── AWS S3
                                       ├── Web Push / SMTP
                                       └── Observability tables

Admin SSE: GET /api/orders/stream
Customer polling: ~3s (주문 현황)
Android: window.Android.printKitchenTicket / printCustomerReceipt
```

## 5. Routing & Authorization

### Frontend (`FE/src/main.tsx`)

| Prefix | Shell | Guard |
|--------|-------|-------|
| `/user/*` | `UserShell` | 없음 |
| `/admin/*` | Admin layout | `RequireAdminAuth` |
| `/dev/*` | `DeveloperShell` | `RequireDeveloperAuth` |

관리자 JWT: `sessionStorage` `gdgoc-admin-token`

### Backend (`SecurityConfig`)

| Pattern | Role |
|---------|------|
| 대부분 고객 API | `permitAll` |
| `/api/admin/**` | `ROLE_ADMIN` |
| `/api/dev/**` | `ROLE_DEVELOPER` |

고객 주문 ownership은 Security matcher가 아니라 **서비스 가드**로 검증한다.

| 규칙 | 내용 |
|------|------|
| Credential | `X-Order-Access-Token` (create 시 1회 발급, URL 금지) |
| DB | `orders.access_token_hash` SHA-256 hex만 저장. raw 미저장 |
| Bypass | `ROLE_ADMIN` JWT만. `ROLE_DEVELOPER` 불가 |
| Legacy NULL hash | customer 거부 (404 `ORDER_NOT_FOUND`와 동일) |
| 적용 API | `GET /api/orders/{id}`, `DELETE /api/orders/{id}/unpaid`, `GET /api/payments/orders/{orderId}`, `GET /api/payments/{paymentKey}`, `POST /api/push/subscriptions/link-order` |
| 결제 취소 | `POST /api/payments/{paymentKey}/cancel` → `ROLE_ADMIN` 필수 |

FE: raw token은 `localStorage` `babi_order_access_tokens` (`orderId → token`). Admin 주문/결제조회는 `adminApi`(Bearer).

### Admin / Developer Responsibility Boundary

역할은 **관련 데이터 domain 이름**이 아니라 **누가 확인하고·판단하고·조치하는가**로 나눈다. 구현 절차는 [CONVENTIONS.md](CONVENTIONS.md)의 Feature Responsibility 절을 따른다.

| Actor | 책임 | 대표 영역 |
|-------|------|-----------|
| **Admin** | 매장 운영자가 이해하고 business action을 수행하는 운영 기능 | 메뉴 · 주문 상태 · 결제 내역 · 정상 취소/환불 · 매출 · 매장 설정 |
| **Developer** | 시스템 내부 상태 진단 · technical cause 분석 · observability | errors · requests · events · diagnostics analytics · Order/Payment/Toss consistency · incident severity/occurrence |

Admin UI에 technical consistency·장애 진단 정보를, “Payment/Order와 같은 domain”이라는 이유만으로 올리지 않는다. Developer Console에 일상 매장 운영 workflow를 올리지 않는다.

**Domain ownership ≠ Exposure ownership**

- Core domain logic(service/repository/model)은 해당 비즈니스 package에 둘 수 있다 (예: reconciliation core → `payment/reconciliation/`).
- UI route · navigation · API namespace · authorization은 actor responsibility에 맞춘다 (예: 동일 기능 exposure → `/dev/**`, `/api/dev/**`, `ROLE_DEVELOPER`).
- Actor가 정해지면 FE(route/nav/page/state/API client) · BE(controller/API/auth) · Core를 **함께** 검토한다. Core가 공용 domain이면 불필요하게 `dev/` package로 옮기지 않는다.
- 역할이 겹치되 필요한 정보·조치가 다르면 동일 technical UI를 공유하지 말고 exposure를 분리한다.

### Application Rate Limiting

Actor = **SYSTEM** · Feature type = infrastructure/security. Enforcement는 Backend만 (`ratelimit/` · `HandlerInterceptor`).

- Targeted POST만: order create · payment confirm · contact · client-errors · client-events · auth login
- Public mutation: valid `X-Client-Key`(UUID) + IP layered buckets · key 없/비정상 → IP only · raw key 로그/응답 금지(SHA-256 identity)
- Login (`POST /api/admin/auth/login`, Admin+Developer 공유): **IP only** (`AUTH_LOGIN`)
- 제외: order GET polling · Admin SSE · Toss webhook · `/api/dev/reconciliation/**` · broad `/api/**`
- Client IP: `server.forward-headers-strategy=none` + `ClientIpResolver` — trusted proxy일 때만 XFF/X-Real-IP (기본: loopback only · RFC1918 전체 trust 금지 · VPC/proxy CIDR은 환경별 명시)
- Storage: Caffeine in-memory (bounded) · **per-instance** — horizontal scale 시 distributed limiter 재검토
- 429 `RATE_LIMIT_EXCEEDED` + `Retry-After` · `ApiException` 경로 → **backend_errors 미기록**
- WAF/CDN/DDoS 대체 아님

정책 숫자는 `app.rate-limit` (`application.yml`) — ARCHITECTURE에 복사하지 않음.

## 6. Core Domains

### Menu / Option

- Entity: `Category` → `Menu` → `MenuOption`
- `OptionGroupType`: `SIZE`, `TOPPING_ADD`, `TOPPING_REMOVE`, `PACKAGING`
- 별도 Topping Entity 없음 · `Menu.toppingEnabled` + 옵션 row로 표현
- **TOPPING_REMOVE 정책 source of truth:** `AdminMenuService` (FE는 API 응답 그대로 렌더)
- 메뉴명 **부분 일치** 우선순위: `김치삼겹볶음밥`(REMOVE 없음) → `삼겹소금`/`삼겹양념`(4종) → `마요`(2종) → 컵밥형 기본(2종) · `참치불닭비빔우동` 전용 분기 유지
- 옵션 삭제 시 주문/SavedMenu의 FK는 detach, **snapshot 컬럼 유지**

### Order / Payment

- `Order` → `OrderItem` → `OrderItemOption` (생성 시 snapshot)
- `Payment` · Toss confirm/webhook · 금액 3중 검증 · webhook은 Toss 재조회
- 결제 전 `pickupNumber=0` · 결제 후 `activateAfterPayment()`로 픽업번호(1–99, Asia/Seoul 당일).
  - **Primary fix:** 당일 `max(pickup_number)` 기준 다음 번호 (createdAt 최신 주문 번호 사용 금지 — 결제 순서가 생성 순서와 어긋나면 활성 번호 재할당되던 사고)
  - **Secondary:** `PickupNumberLock`(JVM + MySQL `GET_LOCK` on TX-bound JDBC connection)로 할당 직렬화 · 활성(PREPARING/READY) 번호 skip
  - **Queue chronology:** `orders.pickup_assigned_at` (V102) — Admin 목록·고객 waitingAhead의 canonical 대기열 시각. createdAt/updatedAt/pickup_number 숫자 정렬 사용 금지.
  - **First call:** `orders.called_at` (V104) — **`POST /api/orders/{id}/call` 성공 시만** 1회 설정. generic `PUT …/status` → READY·재호출·complete/cancel로는 변경하지 않음. 처리시간 = `calledAt − pickupAssignedAt` (둘 다 non-null만). `updated_at`은 lifecycle metric 금지.
- **Order↔Payment reconciliation:** core `payment/reconciliation/` (detect · OPEN/RESOLVED · `logical_key`/`active_key` · Toss read-only verify). Exposure는 Developer (§5 Responsibility Boundary) — `/dev/reconciliation`, `/api/dev/reconciliation/**`, `ROLE_DEVELOPER`. Admin `/admin/payments`는 결제 운영만.

### Developer Analytics Control Center

- Exposure: `/dev/analytics` · `/api/dev/analytics/**` · `ROLE_DEVELOPER` · **read-only**
- Domain ownership ≠ exposure: Sales SQL은 `sales/` 재사용, Order/Payment 정본은 각 domain. Developer는 observe/analyze만.
- Source-of-truth: behavior→`client_events` · revenue→`payments`/`order_items` · queue→`pickup_assigned_at`/`called_at` · HTTP→`http_request_records` · FE/BE errors→error tables · consistency→reconciliation
- Insights: rule-based only (no LLM). QR analytics deferred.

### Saved Menu

- `SavedMenu` / `SavedMenuOption` · 식별: `X-Client-Key`
- status는 DB 저장 안 함 · `SavedMenuService.resolveStatus()` 런타임: `DISCONTINUED`, `OPTIONS_STALE`, `SOLDOUT` 등

## 7. Order & Payment Flow

```text
Checkout → POST /api/orders (UNPAID)
→ Toss requestPayment → confirm/webhook
→ Payment 저장 → activateAfterPayment → SSE ORDER_CREATED
→ Admin: PREPARING → READY → COMPLETED / CANCELED
→ Customer: polling + READY 시 Web Push
```

## 8. Real-time & Notifications

| 대상 | 방식 |
|------|------|
| 관리자 주문 | SSE `ORDER_CREATED`, `ORDER_STATUS_CHANGED` |
| 고객 주문 | HTTP polling |
| 준비 완료 | Web Push (VAPID) |

## 9. Frontend State

| 상태 | 위치 | 영속 |
|------|------|------|
| Cart | `UserDataContext` / `useCartState` | 메모리 (결제 중 backup) |
| Orders | `UserDataContext` | `localStorage` |
| Order access token | `utils/orderAccessToken.ts` | `localStorage` `babi_order_access_tokens` |
| SavedMenu clientKey | `utils/clientKey.ts` | `localStorage` |
| Admin data | `AdminDataContext` | 서버 |

## 10. Mobile / Option Sheet UX

- Viewport: `interactive-widget=overlays-content`, `--app-height` (`appHeight.ts`)
- 키보드: `visualViewport` freeze · Saved Menu popup `useSavedMenuPopupKeyboard.ts`
- 옵션 시트: `MenuOptionModal` (portal) · 마요 REMOVE 넓은 버튼 · 냉모밀세트 tall sheet
- 가로 스크롤 힌트: `HorizontalScrollHintRow` (`scrollWidth > clientWidth`일 때 edge `‹`/`›`)

기기별 완전 해결은 코드만으로 단정하지 않음.

## 11. Android Printer

Repository에 CPP-3000/ESC-POS 구현 없음.

```text
FE → window.Android.printKitchenTicket(JSON)
   → window.Android.printCustomerReceipt(JSON)
   → 외부 Android WebView 앱 → 물리 프린터
```

Contract: `FE/src/types/android.ts`

## 12. Database

```text
Category → Menu → MenuOption
Order → OrderItem → OrderItemOption, Payment
SavedMenu → SavedMenuOption
Observability: client_events, client_errors, backend_errors, http_request_records
```

Schema ownership:

- **Flyway** — mutations under `classpath:db/migration` (baseline **100**, `V101__create_payment_reconciliation_issues`)
- **Hibernate** — `ddl-auto: validate` (dev/prod); tests: H2 `create-drop`, Flyway off
- **Legacy** — `BE/scripts/*.sql` historical/precheck/data maintenance only (not re-run as V1…)
- **Reconciliation issues:** `payment_reconciliation_issues` — scalar `order_id`/`payment_id` (no FK; audit history must not block Order hard-delete)

## 13. Observability

### Request tracing

```text
RequestIdFilter → MDC → access log → http_request_records
```

### Error tracking

```text
POST /api/client-errors → client_errors (+ structured log)
Expected client outcomes (ApiException 4xx, RATE_LIMIT_EXCEEDED, NoResourceFoundException 404)
  → ErrorResponse only · backend_errors 미기록
Uncaught unexpected BE exception → 500 + backend_errors (+ ApiExceptionHandler)
```

### User events

```text
POST /api/client-events → client_events (JSON metadata)
```

FE: `utils/userEvent/trackEvent.ts`, `eventHelpers.ts` · BE allow-list: `ClientEventType`

### Developer Console

| FE Route | BE API | 역할 |
|----------|--------|------|
| `/dev` | `GET /api/dev/overview` | Dashboard KPI (오류 24h, 요청·이벤트 오늘, funnel 위임) |
| `/dev/errors` | `GET /api/dev/errors`, `/{id}` | FE/BE 오류 merge 목록·상세 |
| `/dev/requests` | `GET /api/dev/requests`, `/{id}` | HTTP 요청 기록 |
| `/dev/reconciliation` | `/api/dev/reconciliation/**` | Order/Payment/Toss 정합성 진단 (core: `payment/reconciliation/`) |
| `/dev/events` | `GET /api/dev/events`, `/{id}` | Client events |
| `/dev/analytics` | `/api/dev/analytics/*` | KPI, funnel, menus, options, **menu-options** |

Observability 저장 실패는 주문/결제 트랜잭션과 분리 (비즈니스 flow에 영향 주지 않음).

## 14. Analytics

### Event identity (ClientEvent)

| 필드 | 용도 |
|------|------|
| `eventId` | 멱등 (unique) |
| `eventType` | allow-list enum |
| `anonymousId` | `getClientKey()` — **집계 기본 키** |
| `sessionId` | 세션 scoped |
| `metadata` | JSON (menuId, optionId, …) |
| `occurredAt` | 이벤트 시각 |

### OPTION_SELECTED metadata (FE → BE)

`menuId`, `optionId`, `optionGroup`, `quantity`, `additionalPrice`  
(`FE/src/utils/userEvent/eventHelpers.ts`)

### Menu × Option 분석 (`GET /api/dev/analytics/menu-options`)

**시간순 event matching 사용하지 않음.**

```text
engagedUsers = COUNT(DISTINCT anonymous_id)
  WHERE event_type = MENU_OPTION_OPEN AND metadata.menuId = M

selectedUsers = COUNT(DISTINCT anonymous_id)
  WHERE event_type = OPTION_SELECTED AND metadata.menuId = M AND optionId = O

selectionRate = selectedUsers / engagedUsers × 100  (분모 0 → 0%)
```

구현: `AnalyticsQueryRepository` (MySQL native, JSON_EXTRACT) · `DeveloperAnalyticsService.menuOptions()`

기존 `GET /api/dev/analytics/options`는 전역 옵션 선택 **횟수** 순위 (response contract 유지).

### Funnel

`DeveloperAnalyticsService.funnel()` — 기간 내 단계별 distinct `anonymousId` (sequential session funnel 아님).

## 15. Important Files

| 영역 | Path |
|------|------|
| FE routes | `FE/src/main.tsx` |
| API client | `FE/src/api/client.ts` |
| Checkout | `FE/src/pages/user/CheckoutPage.tsx` |
| Option modal | `FE/src/components/user/MenuOptionModal.tsx` |
| User events | `FE/src/utils/userEvent/trackEvent.ts` |
| Order | `BE/.../order/service/OrderService.java` |
| Payment | `BE/.../payment/service/PaymentService.java` |
| Menu policy | `BE/.../menu/service/AdminMenuService.java` |
| SavedMenu | `BE/.../savedmenu/service/SavedMenuService.java` |
| Security | `BE/.../config/SecurityConfig.java` |
| Dev overview | `BE/.../dev/overview/DeveloperOverviewService.java` |
| Dev analytics | `BE/.../dev/analytics/DeveloperAnalyticsService.java` |
| Deploy | `.github/workflows/deploy-backend.yml` |

## 16. Architecture Rules

- Order/Payment/SavedMenu snapshot·상태 전이 규칙을 임의 변경하지 않는다.
- 메뉴/옵션 business rule은 Backend `AdminMenuService` 우선.
- Admin vs Developer exposure는 §5 Responsibility Boundary를 따른다 (domain 이름 ≠ UI/API 위치).
- Developer Analytics는 MySQL native SQL·JSON metadata에 의존 — DB vendor 변경 시 영향 큼.
- 프린터·Android 앱은 FE bridge와 별도 lifecycle.
