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
│   ├── clientevent/ clienterror/ backenderror/ httprequest/
│   ├── dev/                  # overview, error, request, event, analytics
│   └── config/
├── BE/scripts/
├── BE/compose.yml
├── .github/workflows/deploy-backend.yml
└── vercel.json
```

## 3. Technology Stack

**Frontend:** React 19 · Vite 8 · Tailwind 4 · React Router 7 · Context (Zustand/Redux 없음) · PWA · vitest

**Backend:** Java 21 · Spring Boot 4.1 · JPA · JWT Security · SSE · MySQL 8.4

**Infrastructure:** Vercel(FE) · GitHub Actions → ECR → EC2 Docker(BE) · `ddl-auto: update` (Flyway 없음)

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
- 결제 전 `pickupNumber=0` · 결제 후 `activateAfterPayment()`로 픽업번호(1–99, Asia/Seoul 당일)

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

Schema: Hibernate `ddl-auto: update` + `BE/scripts/*.sql` (운영 1회)

## 13. Observability

### Request tracing

```text
RequestIdFilter → MDC → access log → http_request_records
```

### Error tracking

```text
POST /api/client-errors → client_errors (+ structured log)
Uncaught BE exception → backend_errors (+ ApiExceptionHandler)
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
- Developer Analytics는 MySQL native SQL·JSON metadata에 의존 — DB vendor 변경 시 영향 큼.
- 프린터·Android 앱은 FE bridge와 별도 lifecycle.
