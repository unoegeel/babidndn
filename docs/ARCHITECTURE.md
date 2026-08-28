# BabiOrder — Architecture

> Source of truth: 실제 `babidndn` 저장소 코드  
> 실행·환경: [README.md](../README.md) · 규칙: [CONVENTIONS.md](CONVENTIONS.md) · 운영 상태: [CURRENT_CONTEXT.md](CURRENT_CONTEXT.md)

## 1. Project Overview

바비오더는 매장 픽업 주문 PWA + Spring Boot API 모노레포입니다.

| 영역 | Route | 인증 |
|------|-------|------|
| 고객 | `/user/*` | 없음 |
| 관리자 | `/admin/*` | JWT `ROLE_ADMIN` |
| 개발자 | `/dev/*` | JWT `ROLE_DEVELOPER` |

외부 연동: Toss Payments · AWS S3 · Web Push (VAPID) · SMTP · Android WebView printer bridge

## 2. Repository Structure

```text
babidndn/
├── FE/src/
│   ├── pages/user|owner|developer/
│   ├── components/ services/ store/ api/ utils/ types/
├── BE/src/main/java/com/gdgoc/babi_order/
│   ├── admin/ menu/ order/ payment/ savedmenu/ sales/ store/ push/
│   ├── ratelimit/ clientevent/ clienterror/ backenderror/ httprequest/
│   ├── dev/                  # Developer Console exposure
│   └── config/
├── BE/src/main/resources/db/migration/   # V101+
├── BE/scripts/               # 운영·점검 SQL (Flyway 대체 아님)
├── .github/workflows/deploy-backend.yml
└── vercel.json
```

## 3. Technology Stack

| Layer | Stack |
|-------|-------|
| FE | React 19 · Vite 8 · Tailwind 4 · React Router 7 · Context · PWA (vite-plugin-pwa) · vitest |
| BE | Java 21 · Spring Boot 4.1 · JPA · JWT Security · SSE · MySQL 8.4 |
| Infra | Vercel (FE) · GitHub Actions → ECR → EC2 Docker (BE) · RDS MySQL · Flyway baseline v100 |

## 4. Deployment Topology

### Frontend hosts

| Host | Role | CDN |
|------|------|-----|
| `www.babidndn.shop` | Prod FE (Vercel) | DNS only |
| `dev.babidndn.shop` | Dev FE (Vercel) | DNS only |

### Production API hosts

**Application-facing (FE가 실제 사용)**

| Host | 용도 |
|------|------|
| `https://babidndn.shop` | Production API base — `www.babidndn.shop` FE의 canonical endpoint |

- `FE/src/api/client.ts` hostname map: `www.babidndn.shop` → `https://babidndn.shop` ( `VITE_API_BASE_URL`보다 우선)
- REST · Admin SSE · Toss payment success callback (`/api/payments/success`)
- `orderApiBaseUrl` (localStorage/session)도 prod에서는 동일 host 저장
- Vercel `/api/*` rewrite · Vite dev proxy도 동일 대상

**Infrastructure alias (FE 미사용)**

| Host | 용도 |
|------|------|
| `https://api.babidndn.shop` | Cloudflare/Nginx production backend alias — 동일 Spring Boot origin |

- 저장소 코드·설정에 문자열 참조 없음
- 운영 인프라에서 vhost/alias로 존재 · application-facing endpoint와 혼동하지 않음

### Development API

| Host | 용도 |
|------|------|
| `https://dev-api.babidndn.shop` | `dev.babidndn.shop` FE의 API base |

FE mapping: `dev.babidndn.shop` → `https://dev-api.babidndn.shop`

### Request path (API)

```text
Client → Cloudflare (SSL Full strict) → Nginx (EC2) → Spring Boot Docker
         prod :8080  /  dev :8081
```

Nginx·Cloudflare 세부 설정은 EC2 호스트에 있으며 이 저장소에는 포함되지 않습니다.
운영 적용·미완료 항목(origin lock 등)은 [CURRENT_CONTEXT.md](CURRENT_CONTEXT.md)를 참고합니다.

### Backend containers

| Branch | Profile | Container | Host port | DB |
|--------|---------|-----------|-----------|-----|
| `main` | `prod` | `babi-order` | 8080 | `babi_order` |
| `dev` | `dev` | `babi-order-dev` | 8081 | `babi_order_dev` |

배포: `.github/workflows/deploy-backend.yml` — ECR push → EC2 `docker run` · env: `/opt/babi-order/.env`, `/opt/babi-order-dev/.env`

### Environment config

| 파일 | 용도 |
|------|------|
| `BE/.env.example` | 로컬·문서용 변수 이름 |
| `BE/src/main/resources/application.yml` | 공통 + rate-limit 등 |
| `BE/src/main/resources/application-prod.yml` | prod 프로파일 |
| `BE/src/main/resources/application-dev.yml` | dev 프로파일 |
| EC2 `/opt/babi-order/.env` | prod secret·DB_HOST 등 (저장소 외부) |

## 5. Application Architecture

```text
Customer PWA (/user) ──REST──┐
Admin (/admin) ──JWT─────────┼──► Spring Boot
Developer (/dev) ──JWT───────┘         │
                                       ├── MySQL (RDS)
                                       ├── Toss Payments
                                       ├── AWS S3 · Web Push · SMTP
                                       └── Observability tables

Admin order updates: SSE GET /api/orders/stream (30min timeout → reconnect)
Customer order status: HTTP polling ~3s (PREPARING/READY)
```

## 6. Routing & Authorization

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

고객 주문 ownership은 Security matcher가 아니라 **서비스 가드**로 검증합니다.

### Order access control

| 규칙 | 내용 |
|------|------|
| Credential | `X-Order-Access-Token` (create 시 1회 발급, URL 금지) |
| DB | `orders.access_token_hash` — SHA-256 hex만 저장 |
| FE 저장 | `localStorage` `babi_order_access_tokens` (`orderId → rawToken`) |
| Bypass | `ROLE_ADMIN` JWT만 · `ROLE_DEVELOPER` 불가 |
| 실패 | 잘못된 token / 없는 주문 → HTTP 404 `ORDER_NOT_FOUND` |
| 적용 API | `GET /api/orders/{id}`, unpaid delete, payment-by-order, push link-order 등 |

### Admin / Developer boundary

역할은 domain 이름이 아니라 **누가 판단·조치하는가**로 구분합니다. 절차는 [CONVENTIONS.md](CONVENTIONS.md) §2.

- **Domain ownership ≠ Exposure ownership** — core logic은 `payment/`, `order/` 등에 둘 수 있으나 UI/API는 actor에 맞게 `/admin` vs `/dev`로 분리합니다.

### Rate limiting

`BE/.../ratelimit/` — targeted POST만 (order create, payment confirm, telemetry, auth login).
Order GET polling · Admin SSE · Toss webhook · `/api/dev/reconciliation/**` 제외.
429 `RATE_LIMIT_EXCEEDED` → `backend_errors` 미기록.

## 7. Order Lifecycle

```text
POST /api/orders (UNPAID, pickupNumber=0)
→ Toss 결제 → confirm/webhook
→ Payment 저장 → activateAfterPayment() → 픽업번호(1–99, KST 당일)
→ Admin: PREPARING → READY → COMPLETED / CANCELED
→ Customer: polling + READY 시 Web Push
```

| 상태 | 의미 |
|------|------|
| 결제 전 | `pickupNumber = 0` |
| 결제 후 | `pickup_assigned_at` 기록 · 당일 `max(pickup_number)` + 활성 번호 skip |
| PREPARING / READY | 매장 처리 중 |
| COMPLETED / CANCELED | 종료 |

**처리시간 (Analytics):** `called_at` − `pickup_assigned_at`
- `called_at`: **`POST /api/orders/{id}/call` 성공 시만** 최초 1회
- generic `PUT …/status` → READY는 호출과 동일하지 않음 (Admin UI에서 call과 연동)

## 8. Payment

- Backend가 주문 금액의 authority
- Toss confirm + webhook · 금액 3중 검증 · webhook 시 Toss 재조회
- `PaymentStatus`: DONE / CANCELED / PARTIAL_CANCELED
- **Reconciliation:** core `payment/reconciliation/` · exposure `/dev/reconciliation`, `/api/dev/reconciliation/**`

## 9. Real-time & Notifications

| 대상 | 방식 |
|------|------|
| 관리자 주문 | SSE `/api/orders/stream` — `ORDER_CREATED`, `ORDER_STATUS_CHANGED` |
| SSE timeout | 30분 `AsyncRequestTimeoutException` — **expected lifecycle**, `backend_errors` 미기록 |
| 고객 주문 | HTTP polling (`useOrderPolling`, ~3s, PREPARING/READY) |
| 준비 완료 | Web Push (VAPID) |

`http_request_records`는 SSE path를 의도적으로 제외합니다 (장시간 요청이 latency KPI를 오염시키지 않도록).

## 10. Frontend State (Customer)

| 상태 | 위치 | 영속 |
|------|------|------|
| Cart | `UserDataContext` / `useCartState` | 메모리 (결제 중 backup) |
| Orders | `UserDataContext` | `localStorage` `babi_user_orders_v2` |
| Order access token | `utils/orderAccessToken.ts` | `localStorage` `babi_order_access_tokens` |
| Orders migration | `utils/userOrdersStorage.ts` | marker `babi_user_orders_storage_migration` = `2` |
| SavedMenu clientKey | `utils/clientKey.ts` | `localStorage` |
| Admin data | `AdminDataContext` | 서버 |

**Stale recent orders:** 서버 `ORDER_NOT_FOUND` 404일 때만 로컬 주문·token entry 제거. 네트워크/5xx는 유지. 상세 운영 이력은 [CURRENT_CONTEXT.md](CURRENT_CONTEXT.md).

## 11. Observability

### Request tracing

```text
RequestIdFilter → MDC → access log → http_request_records
```

### Error classification

| 유형 | HTTP | backend_errors | 비고 |
|------|------|----------------|------|
| Expected API (`ApiException` 4xx) | 4xx | X | |
| `NoResourceFoundException` | 404 `RESOURCE_NOT_FOUND` | X | scanner/unmapped path |
| `RateLimitExceededException` | 429 | X | |
| SSE `AsyncRequestTimeoutException` on `/api/orders/stream` | 503 | X | reconnect lifecycle |
| Other `AsyncRequestTimeoutException` | 503 | O | |
| Uncaught unexpected | 5xx | O | |

### Analytics vs raw diagnostics

- **Raw `/dev/errors`:** `backend_errors` 전체 (historical noise 포함) — 변조하지 않음
- **Analytics “서버 오류” KPI:** *actionable* subset only (`ActionableBackendErrorCriteria`)
  - Exclude: `NoResourceFoundException`
  - Exclude: `AsyncRequestTimeoutException` **where** `path = /api/orders/stream`
  - Include: 기타 `backend_errors` (Toss 502, non-SSE async timeout 등)
- **HTTP 5xx rate:** `http_request_records.status` — actionable filter와 별개

### User events

`POST /api/client-events` → `client_events` · allow-list `ClientEventType` · 집계 기본 키 `anonymousId`

### Developer Console

Flat nav: 개요 → 분석 → 사용자 이벤트 → 요청 → 오류 → 결제 정합성

| FE Route | BE API | 역할 |
|----------|--------|------|
| `/dev` | `/api/dev/analytics/{overview,operations,insights}` (오늘) | 서비스 현황·경고 요약 |
| `/dev/analytics` | `/api/dev/analytics/*` | Analytics Control Center |
| `/dev/events` | `/api/dev/events` | 행동 이벤트 조사 |
| `/dev/requests` | `/api/dev/requests` | HTTP / requestId 추적 |
| `/dev/errors` | `/api/dev/errors` | FE/BE 실패 원인 조사 |
| `/dev/reconciliation` | `/api/dev/reconciliation/**` | 결제 정합성 |

`GET /api/dev/overview` — legacy 요약 API (유지). `/dev` UI는 Control Center API를 재사용합니다.

### Analytics Control Center API

Period: `from` / `to` ISO-8601 `Instant` (`AnalyticsRange`). 기본 = KST 오늘 00:00 → now.

| Endpoint | 용도 |
|----------|------|
| `/api/dev/analytics/overview` | KPI 요약 |
| `/sales` | 주문·매출 |
| `/funnel` | aggregate + sequential session funnel |
| `/menus` | 메뉴 성과 |
| `/payments` | 결제 행동·상태 |
| `/operations` | 큐·처리시간 |
| `/performance` | API latency·volume |
| `/reliability` | 오류율·추이 |
| `/insights` | rule-based 인사이트 |

Legacy: `/behavior-overview`, `/funnel-legacy`, `/menus-behavior`, `/options`, `/menu-options`

Observability 저장 실패는 주문/결제 트랜잭션과 분리합니다.

## 12. Database

```text
Category → Menu → MenuOption
Order → OrderItem → OrderItemOption, Payment
SavedMenu → SavedMenuOption
Observability: client_events, client_errors, backend_errors, http_request_records
payment_reconciliation_issues
```

| Layer | Responsibility |
|-------|----------------|
| **Flyway** | `classpath:db/migration` — baseline v100, 현재 V101–V104 |
| **Hibernate** | `ddl-auto: validate` (dev/prod) |
| **Tests** | H2 `create-drop`, Flyway disabled |
| **BE/scripts/** | historical / data maintenance — Flyway 대체 아님 |

주요 migration: V101 reconciliation issues · V102 `pickup_assigned_at` · V103 re-sync · V104 `called_at`

## 13. Android Printer

Repository에 프린터 앱 없음. FE → `window.Android.printKitchenTicket` / `printCustomerReceipt` → 외부 WebView 앱.

Contract: `FE/src/types/android.ts`

## 14. Architecture Rules

- Order/Payment/SavedMenu snapshot·상태 전이 규칙을 임의 변경하지 않는다.
- 메뉴/옵션 business rule은 Backend `AdminMenuService` 우선.
- Admin vs Developer exposure는 §6 boundary를 따른다.
- Analytics는 MySQL native SQL·JSON metadata에 의존 — DB vendor 변경 시 영향 큼.
- 프린터·Android 앱은 FE bridge와 별도 lifecycle.
