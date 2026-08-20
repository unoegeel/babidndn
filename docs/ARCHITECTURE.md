# 바비든든 스마트 오더 — Architecture

> 기준일: 2026-08-20
> 분석 기준: Cursor가 실제 `d:\DEV\babidndn` 저장소를 분석해 작성한 인수인계 문서
> 원칙: 실제 코드에서 확인된 현재 구조를 기준으로 유지한다.

## 1. Project Overview

바비든든 스마트 오더(표시명: 바비오더)는 매장 픽업 주문을 위한 FE + BE 모노레포 PWA 서비스다.

- 고객: `/user/*`
- 관리자: `/admin/*`
- 개발자 콘솔: `/dev/*`
- 고객 로그인: 없음
- 관리자/개발자: JWT 인증
- 결제: Toss Payments
- 이미지: AWS S3 Presigned URL
- 알림: Web Push(VAPID)
- 문의: SMTP
- 관리자 실시간 주문: SSE
- 고객 주문 추적: 3초 polling
- 물리 프린터: 실제 프린터 코드는 미구현, Android WebView bridge만 존재

## 2. Repository Structure

```text
babidndn/
├── FE/
│   ├── src/
│   │   ├── pages/user/
│   │   ├── pages/owner/
│   │   ├── pages/developer/
│   │   ├── store/
│   │   ├── services/
│   │   ├── api/client.ts
│   │   └── utils/
│   ├── vite.config.ts
│   └── index.html
├── BE/
│   ├── src/main/java/com/gdgoc/babi_order/
│   │   ├── admin/
│   │   ├── menu/
│   │   ├── order/
│   │   ├── payment/
│   │   ├── savedmenu/
│   │   ├── store/
│   │   ├── sales/
│   │   ├── clientevent/
│   │   ├── clienterror/
│   │   ├── backenderror/
│   │   ├── httprequest/
│   │   ├── dev/
│   │   └── config/
│   ├── scripts/*.sql
│   ├── Dockerfile
│   └── compose.yml
├── .github/workflows/deploy-backend.yml
├── vercel.json
└── README.md
```

## 3. Technology Stack

### Frontend
- React 19
- Vite 8
- Tailwind 4
- React Router 7
- React Context 기반 전역 상태
- Zustand/Redux 없음
- PWA
- Toss Payments SDK
- Web Push

### Backend
- Spring Boot 4.1
- Java 21
- MySQL 8.4
- JPA / Spring Data JPA
- JWT 기반 관리자 인증
- REST API
- SSE
- SMTP
- AWS S3

### Infrastructure
- Frontend: Vercel
- Backend: GitHub Actions → ECR → EC2 Docker
- Domain: `babidndn.shop`, `dev.babidndn.shop`, `dev-api.babidndn.shop`
- Local DB/서비스 보조: Docker Compose
- Schema management: Hibernate `ddl-auto: update`
- Flyway/Liquibase: 사용하지 않음

## 4. System Architecture

```text
Customer PWA (/user)
        │
        ├── REST API ───────────────┐
        │                           │
Admin (/admin)                      ▼
        │                  Spring Boot API :8080
        └── Bearer JWT              │
                                    ├── MySQL
                                    ├── Toss Payments
                                    ├── AWS S3
                                    ├── Web Push
                                    └── SMTP

Admin SSE
GET /api/orders/stream
        │
        ▼
OrderEventService

Customer Order Polling
useOrderPolling (3 sec)
        │
        ▼
GET /api/orders/{id}

Android WebView
window.Android.*
        │
        ▼
외부 프린터 앱 / 물리 프린터
```

## 5. Routing & Authorization

| Prefix | Layout | 인증 |
|---|---|---|
| `/user/*` | `UserShell` + `UserDataContext` | 없음 |
| `/admin/*` | `AdminDataProvider` | `ROLE_ADMIN` |
| `/dev/*` | `DeveloperShell` | `ROLE_DEVELOPER` |
| `/login`, `/signup` | 없음 | 없음 |

Backend security:
- 고객 API: 대부분 `permitAll`
- `/api/admin/**`: `ROLE_ADMIN`
- `/api/dev/**`: `ROLE_DEVELOPER`
- 관리자 JWT 저장 위치: `sessionStorage: gdgoc-admin-token`

## 6. Core Business Domains

### Menu
- `Menu`
- `Category`
- `MenuOption`
- 옵션 그룹: `SIZE`, `PACKAGING`, `TOPPING_ADD`, `TOPPING_REMOVE`
- 별도 `Topping` Entity 없음
- 토핑은 `MenuOption` + `OptionGroupType` + `Menu.toppingEnabled`
- 컵밥형 메뉴의 `TOPPING_REMOVE`는 Backend `AdminMenuService`가 source of truth다. Frontend는 메뉴명으로 필터하지 않는다.
- 메뉴명 부분 일치 우선순위: `김치삼겹볶음밥` → `삼겹소금`/`삼겹양념` → `마요` → 기본
  - 김치삼겹볶음밥: `TOPPING_REMOVE` 없음 (`SIZE` + `TOPPING_ADD`만)
  - 삼겹소금/삼겹양념: `김치 제외`, `고추장 소스 제외`, `참기름 제외`, `김가루 제외`
  - 마요: `단무지 제외`, `김가루 제외`
  - 기본: `김치 제외`, `고추장 소스 제외`
- `참치불닭비빔우동`은 기존 전용 `TOPPING_REMOVE` 3종 분기를 유지한다.
- 저장/상세 조회 heal(`ensureDefaultOptions`)에서도 동일 canonical 목록으로 동기화한다.
- 옵션 삭제 시 주문/`SavedMenu`의 `menu_option_id`만 detach하고 snapshot 컬럼은 유지한다.

### Order
- `Order`
- `OrderItem`
- `OrderItemOption`
- 주문 아이템/옵션은 생성 시점 snapshot을 보존

### Payment
- `Payment`
- Toss Payments 연동
- 결제 승인 시 주문 금액 / 요청 금액 / Toss 응답 금액 3중 검증
- webhook payload를 직접 신뢰하지 않고 Toss 재조회

### Saved Menu
- `SavedMenu`
- `SavedMenuOption`
- `X-Client-Key`로 사용자 식별
- snapshot 저장
- status는 DB에 직접 저장하지 않고 `resolveStatus()`로 런타임 계산

### Observability
- `ClientEvent`
- `ClientError`
- `BackendError`
- `HttpRequestRecord`
- Request ID
- Developer Console
- Analytics

## 7. Order Lifecycle

```text
주문 생성
→ PREPARING / UNPAID / pickupNumber=0
→ Toss 결제
→ payment confirm
→ activateAfterPayment()
→ pickupNumber 발급
→ 관리자 SSE ORDER_CREATED
→ PREPARING / READY
→ 관리자 상태 변경
→ SSE ORDER_STATUS_CHANGED
→ COMPLETED 또는 CANCELED
```

중요 규칙:
- 결제 전 pickupNumber는 0
- 결제 완료 후 1~99 범위의 픽업번호 발급
- 완료/취소 이후 상태 변경 불가
- 품절 메뉴는 주문 생성 거부
- 옵션 수량 제한 검증
- 옵션은 해당 Menu 소속인지 검증

## 8. Payment Flow

```text
CheckoutPage
→ POST /api/orders
→ Toss requestPayment()
→ success redirect
→ /api/payments/confirm
→ 금액 3중 검증
→ Payment 저장
→ activateAfterPayment()
→ 주문 활성화
```

Webhook:
```text
Toss webhook
→ payload 직접 신뢰하지 않음
→ Toss API 재조회
→ 상태 동기화
```

## 9. Saved Menu Lifecycle

```text
SavedMenu
 ├── Menu FK
 ├── customName
 ├── snapshot
 └── SavedMenuOption
       ├── MenuOption FK
       └── snapshot
```

status:
- `DISCONTINUED`: 원본 Menu 삭제/null
- `OPTIONS_STALE`: 옵션 삭제/그룹 변경/수량 초과 등
- `SOLDOUT`: 원본 Menu가 품절
- status 자체는 DB 저장이 아닌 `resolveStatus()` 계산

## 10. Real-time

### Admin
- SSE: `GET /api/orders/stream`
- Event:
  - `ORDER_CREATED`
  - `ORDER_STATUS_CHANGED`

### Customer
- WebSocket 없음
- HTTP polling: 3초

## 11. Frontend State

| 상태 | 관리 위치 | 영속화 |
|---|---|---|
| Cart | `UserDataContext` / `useCartState` | 메모리 only, 결제 중 backup |
| Orders | `UserDataContext` | `localStorage: babi_user_orders` |
| Notifications | `useUserNotifications` | localStorage |
| SavedMenu clientKey | `utils/clientKey.ts` | localStorage |
| Admin JWT | sessionStorage | `gdgoc-admin-token` |
| Admin menus/orders | `AdminDataContext` | 서버 state |

## 12. Mobile / iOS

현재 확인된 핵심 파일:
- `index.html`
- `utils/appHeight.ts`
- `useSavedMenuPopupKeyboard.ts`
- `ContactPage.tsx`
- `ReviewPage.tsx`

현재 적용된 처리:
- `viewport-fit=cover`
- `interactive-widget=overlays-content`
- `visualViewport`
- `--app-height`
- keyboard-open 시 freeze
- SavedMenu popup input의 translateY 보정

모든 기기/브라우저에서 완전 해결됐다고 코드만으로 단정하지 않는다.

## 13. Android Printer

현재 repository에는 CPP-3000/ESC-POS 실제 구현이 없다.

현재 구조:
```text
FE
→ window.Android.printKitchenTicket()
→ window.Android.printCustomerReceipt()
→ 외부 Android 앱
→ 실제 프린터
```

따라서 프린터 작업 시 FE bridge contract와 실제 Android 앱 구현을 별개로 취급한다.

## 14. Database

주요 관계:

```text
Category
 └── Menu
      └── MenuOption

Order
 ├── OrderItem
 │    └── OrderItemOption
 └── Payment

SavedMenu
 └── SavedMenuOption
```

Schema:
- Flyway/Liquibase 미사용
- Hibernate `ddl-auto: update`
- 수동 SQL은 `BE/scripts/*.sql`

## 15. Observability

```text
RequestIdFilter
→ MDC
→ access log
→ http_request_records

POST /api/client-errors
→ client_errors

POST /api/client-events
→ client_events

/dev/errors
/dev/requests
/dev/events
/dev/analytics
```

관찰성 저장 실패는 비즈니스 트랜잭션에 영향을 주지 않도록 분리되어 있다.

## 16. Important Files

1. `FE/src/main.tsx`
2. `FE/src/api/client.ts`
3. `FE/src/store/UserDataContext.tsx`
4. `FE/src/store/AdminDataContext.tsx`
5. `FE/src/pages/user/CheckoutPage.tsx`
6. `FE/src/pages/user/PaymentSuccessPage.tsx`
7. `BE/.../order/service/OrderService.java`
8. `BE/.../payment/service/PaymentService.java`
9. `BE/.../config/SecurityConfig.java`
10. `BE/.../savedmenu/service/SavedMenuService.java`
11. `BE/.../menu/entity/MenuOption.java`
12. `BE/.../order/service/OrderEventService.java`
13. `FE/src/utils/appHeight.ts`
14. `FE/src/utils/userEvent/trackEvent.ts`
15. `FE/src/types/android.ts`
16. `BE/.../clientevent/entity/ClientEvent.java`
17. `BE/.../dev/analytics/DeveloperAnalyticsService.java`
18. `BE/src/main/resources/application.yml`
19. `.github/workflows/deploy-backend.yml`
20. `README.md`

## 17. Architecture Rules

- Frontend와 Backend의 실제 구조를 우선한다.
- Order/Payment/SavedMenu의 snapshot/business rule을 함부로 제거하지 않는다.
- 결제 금액은 Frontend 값을 신뢰하지 않고 Backend 계산값을 사용한다.
- 주문/결제 상태 변경 흐름을 직접 건드릴 때 관련 SSE 이벤트를 함께 검토한다.
- SavedMenu status는 `resolveStatus()`와 원본 Menu/Option 관계를 함께 고려한다.
- 프린터는 현재 FE bridge와 실제 Android 앱을 분리해서 본다.
