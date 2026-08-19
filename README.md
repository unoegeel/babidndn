# 바비든든 스마트 오더 (BabiOrder)

**바비든든** 매장을 위한 웹 주문·결제·매장 관리 서비스입니다.  
서비스 표시명: **바비오더**

고객용 PWA와 관리자 웹으로 주문부터 결제, 조리, 픽업, 메뉴·매장 운영까지 연결하는 **FE + BE 모노레포**입니다.

---

## 프로젝트 소개

| 항목 | 내용 |
|------|------|
| 목적 | 매장 내 픽업 주문의 디지털화 (메뉴 조회 → 결제 → 픽업번호 → 상태 추적) |
| 주요 사용자 | 매장 고객(모바일 웹/PWA), 매장 관리자(태블릿·PC) |
| 해결하는 문제 | 대기·주문·결제·호출·픽업 과정의 수기 처리를 줄이고, 메뉴·옵션·주문을 한 시스템에서 관리 |

고객 계정 로그인은 없으며, 관리자만 JWT로 인증합니다. QR 생성·스캔 코드는 저장소에 포함되어 있지 않습니다(URL 안내 등은 운영 측에서 처리).

---

## 주요 기능

### 사용자 (`/user`)

| 기능 | 설명 |
|------|------|
| 메뉴 조회 | 카테고리별 메뉴·옵션·배지·품절 표시 |
| 옵션 선택 | 바텀시트 옵션 모달, 사이즈·토핑·포장 선택 |
| 장바구니 | 수량·옵션 유지, 퀵 장바구니 바 |
| 결제 | Toss Payments 결제창 연동 |
| 주문 현황 | HTTP 폴링, 픽업번호·단계 표시 |
| 주문 완료·전자영수증 | 준비 완료 후 완료 화면, 영수증 조회 |
| 최근 주문 내역 | 과거 주문 목록 |
| 나만의 메뉴 | 옵션 조합 저장·수정·삭제·재주문 |
| 리뷰 | 사장님께 의견 전하기 |
| 서비스 문의 | SMTP 메일 전송 |
| 공지 | 팝업 광고 목록 화면 |
| Web Push | 주문 준비 완료 알림(브라우저 권한·구독) |
| PWA | `vite-plugin-pwa`, 홈 화면 추가 지원 |

### 관리자 (`/admin`)

| 기능 | 설명 |
|------|------|
| JWT 로그인·회원가입 | 관리자 계정 인증 |
| 주문 대시보드 | SSE + 폴링, 조리·호출·픽업 처리 |
| 주방 티켓 | Android WebView 브릿지로 출력 **요청** (프린터 앱은 외부) |
| 메뉴·카테고리·옵션 | CRUD, 순서 변경, `toppingEnabled` 설정 |
| 메뉴 배지 | 인기·NEW·추천 |
| 이미지 업로드 | S3 Presigned URL |
| 결제 내역 | 조회·필터·취소·CSV/TXT 내보내기 |
| 매출 분석 | 기간·메뉴별 매출 |
| 팝업 광고·리뷰 | 매장 콘텐츠 관리 |

---

## 시스템 아키텍처

```text
[고객 PWA / 관리자 웹]
        ↓ REST (관리자: Bearer JWT)
[Spring Boot API]
        ↓
    [MySQL]

[Toss Payments] ← 결제 요청/승인/취소/웹훅 → [Backend]
[AWS S3]        ← Presigned 업로드
[Web Push]      ← VAPID
[SMTP]          ← 서비스 문의 메일
```

**실시간 주문 알림**

| 구분 | 방식 |
|------|------|
| 관리자 | **SSE** (`GET /api/orders/stream`, `ROLE_ADMIN`) |
| 사용자 | 주문 현황 **HTTP 폴링** |
| 준비 완료 | Web Push (`READY` 상태) |

WebSocket·Redis는 사용하지 않습니다.

---

## 기술 스택

### Frontend (`FE/package.json`)

| 항목 | 버전/구성 |
|------|-----------|
| React / React DOM | ^19.2.7 |
| TypeScript | ~6.0.2 |
| Vite | ^8.1.1 |
| React Router | ^7.18.1 |
| Tailwind CSS | ^4.3.2 |
| @dnd-kit | 메뉴·카테고리 드래그 정렬 |
| html2canvas, jspdf | 영수증 PDF 등 |
| vite-plugin-pwa | PWA |

Toss SDK: npm 패키지가 아니라 `FE/index.html`의 `js.tosspayments.com/v1/payment` 스크립트.

### Backend (`BE/build.gradle`)

| 항목 | 버전/구성 |
|------|-----------|
| Java | 21 |
| Spring Boot | 4.1.0 |
| Spring Data JPA, Security, Mail, Validation, WebMVC | Boot BOM |
| springdoc OpenAPI | 2.8.8 |
| AWS SDK S3 | BOM 2.29.29 |
| web-push | 5.1.2 |
| MySQL Connector/J | runtime |
| 테스트 | JUnit 5, H2 (test) |

### Database·인프라

| 구분 | 근거 |
|------|------|
| MySQL 8.4 | `BE/compose.yml` (로컬) |
| JPA `ddl-auto: update` | `application.yml` (스키마 자동 반영) |
| 운영 SQL | `BE/scripts/*.sql` (수동 1회 실행용) |
| Toss Payments | BE + FE 연동 |
| AWS S3 | 메뉴·팝업 이미지 |
| AWS ECR · EC2 | `.github/workflows/deploy-backend.yml` |
| Vercel | `FE/vercel.json` (호스트별 `/api` rewrite) |

PortOne은 코드베이스에 없습니다.

---

## 프로젝트 구조

```text
babidndn/
├── FE/
│   ├── src/
│   │   ├── api/              # HTTP 클라이언트
│   │   ├── components/       # user / owner 공통 UI
│   │   ├── pages/            # user / owner 페이지
│   │   ├── services/         # API 호출
│   │   ├── store/            # React Context (User/Admin)
│   │   └── utils/            # optionSort, appHeight, 영수증 등
│   ├── public/
│   ├── index.html
│   ├── vercel.json
│   └── package.json
├── BE/
│   ├── src/main/java/com/gdgoc/babi_order/
│   │   ├── admin/            # JWT 인증
│   │   ├── menu/             # 메뉴·옵션
│   │   ├── order/            # 주문·SSE
│   │   ├── payment/          # Toss 결제
│   │   ├── savedmenu/        # 나만의 메뉴
│   │   ├── push/             # Web Push
│   │   ├── store/            # 팝업·리뷰
│   │   ├── sales/            # 매출
│   │   ├── contact/          # 문의
│   │   └── config/           # CORS, S3, Swagger 등
│   ├── scripts/              # 운영/초기 데이터 SQL
│   ├── compose.yml           # 로컬 MySQL
│   ├── Dockerfile
│   └── .env.example
├── .github/workflows/
│   └── deploy-backend.yml
└── README.md
```

---

## 주요 도메인

| Entity | 역할 |
|--------|------|
| `Category` | 메뉴 카테고리 (이름, 표시 순서) |
| `Menu` | 메뉴 (가격, 배지, 판매 상태, **`toppingEnabled`**) |
| `MenuOption` | 메뉴별 옵션 (그룹 타입, 이름, 추가 금액) |
| `Order` | 주문 (픽업번호, 상태, Toss order id) |
| `OrderItem` | 주문 항목 (메뉴 snapshot) |
| `OrderItemOption` | 주문 옵션 (**`option_name_snapshot`**) |
| `Payment` | 결제 (Toss payment key, 상태) |
| `SavedMenu` | 나만의 메뉴 (클라이언트 키, 커스텀 이름, 메뉴 snapshot) |
| `SavedMenuOption` | 저장 옵션 (**`option_name_snapshot`**) |
| `PopupAd` / `StoreReview` | 팝업 광고·리뷰 |
| `Admin` | 관리자 계정 |

### 주문·결제 상태

**OrderStatus:** `PREPARING` → `READY` → `COMPLETED` / `CANCELED`

**PaymentStatus:** `DONE`, `CANCELED`, `PARTIAL_CANCELED`

### Snapshot

주문·나만의 메뉴 생성 시점의 메뉴/옵션 이름이 snapshot 컬럼에 저장됩니다. 이후 `menu_options.name`이 변경되어도 과거 주문·저장 메뉴의 표시는 snapshot을 따릅니다. 운영 SQL은 **현재** `menu_options`만 정리하며 snapshot은 변경하지 않습니다.

---

## 주문·결제 흐름

```text
메뉴 선택 → 장바구니 → POST /api/orders (미결제 주문)
    → Toss requestPayment
    → BE 결제 승인 (confirm / webhook)
    → Payment 저장, activateAfterPayment
    → 당일 픽업번호 발급, SSE ORDER_CREATED
    → 관리자: 조리 → 호출(READY) → 픽업(COMPLETED)
    → 사용자: 폴링으로 상태 확인, READY 시 Web Push
```

| 단계 | 동작 |
|------|------|
| 미결제 주문 | 픽업번호 미부여, 관리자 보드·SSE 미노출 |
| 결제 확정 후 | 픽업번호 발급, 관리자 목록·SSE 노출 |
| 결제 취소 | Toss cancel + 주문 `CANCELED` |
| 웹훅 | `POST /api/payments/webhook` — Toss 재조회로 동기화 |

---

## 옵션 시스템

### OptionGroupType

```text
SIZE
TOPPING_ADD
TOPPING_REMOVE
PACKAGING
```

BE `OptionGroupType.enablesOptionSheet()`: `TOPPING_ADD`, `TOPPING_REMOVE`, `PACKAGING`일 때 유저 옵션 시트를 엽니다. `SIZE`만 있으면 시트 없이 바로 담기(FE `optionSort.enablesOptionSheet` 동일).

### 공통 표시 순서

FE `optionSort.ts` / BE 옵션 `displayOrder` 기준:

```text
SIZE → TOPPING_ADD → TOPPING_REMOVE → PACKAGING
```

TOPPING_ADD 표시 순: 계란후라이, 햄구이, 밥 추가, 삼겹소금 추가, …  
과거 snapshot의 `스팸`은 정렬 시 `햄구이` alias로 처리.

### toppingEnabled

| 구분 | 설명 |
|------|------|
| `menus.topping_enabled` | 관리자가 저장한 ON/OFF (**DB 컬럼**, GET 시 그대로 반환) |
| `menu_options` | 실제 선택 가능한 옵션 데이터 |

관리자에서 `toppingEnabled`를 변경하면 `AdminMenuService`가 메뉴 유형에 맞게 옵션을 동기화합니다. GET heal은 **`toppingEnabled=true`일 때만** 누락 옵션을 보강합니다.

### 컵밥형 카테고리 판별

`AdminMenuService.isCupbapLikeCategory`:

- 이름이 **`컵밥`** 이거나
- 이름이 **`세트`로 끝나는** 카테고리 (예: `세트`, `바비우동세트`, `냉모밀세트`)

`면`/`우동`/`음료수` 등은 컵밥형이 아닙니다.

### 메뉴별 옵션 정책 (`AdminMenuService`)

| 유형 | 조건 | 옵션 |
|------|------|------|
| **컵밥형 일반** | 컵밥형 + `toppingEnabled=true` | SIZE, TOPPING_ADD, TOPPING_REMOVE |
| **냉모밀 단품** | 메뉴명 `냉모밀`, 컵밥형 아님 | PACKAGING만 (매장/포장) |
| **냉모밀 세트** | 컵밥형 + 메뉴명에 `냉모밀` 포함 | SIZE, TOPPING_ADD, TOPPING_REMOVE, **PACKAGING** |
| **삼겹소금 계열** | 정확한 메뉴명 4개 | TOPPING_REMOVE에 **참기름 제외** 추가 |
| **참치불닭비빔우동** | 메뉴명 일치 | TOPPING_REMOVE(불닭소스/김가루/파 제외) + PACKAGING |
| **음료수 등** | 컵밥형 아님, 특수 규칙 없음 | `toppingEnabled` 플래그만 저장, 옵션 자동 생성 없음 |

**삼겹소금 계열 (참기름 제외 대상, 정확 일치)**

- `삼겹소금`
- `삼겹소금+바비우동`
- `삼겹소금+김치우동`
- `삼겹소금+냉모밀`

**스팸 → 햄구이:** 라이브 `menu_options`의 TOPPING_ADD `스팸`을 `햄구이`로 교정. 이미 `햄구이`가 있으면 중복 생성하지 않음.

**바비우동세트 / 김치우동세트:** 컵밥형이므로 SIZE·토핑 동기화 대상. PACKAGING은 **냉모밀 세트**에만 자동 추가.

---

## 나만의 메뉴 (Saved Menu)

| API | 설명 |
|-----|------|
| `POST /api/saved-menus` | 등록 |
| `GET /api/saved-menus` | 목록 |
| `GET /api/saved-menus/{id}` | 상세 |
| `PUT /api/saved-menus/{id}` | 수정 (커스텀 이름·옵션) |
| `DELETE /api/saved-menus/{id}` | 삭제 |

- 클라이언트 식별: **`X-Client-Key`** 헤더 (UUID)
- FE: 옵션 시트에서 하트 등록, **나만의 메뉴** 페이지에서 수정·삭제·재주문·옵션 재설정
- 메뉴·옵션 snapshot: `menu_name_snapshot`, `menu_price_snapshot`, `option_name_snapshot` 등

---

## 관리자 기능

| 경로 | 기능 |
|------|------|
| `/admin/orders` | 주문 보드, SSE, 상태 변경, 주방 티켓 |
| `/admin/menus` | 카테고리·메뉴·옵션 CRUD, 순서, `toppingEnabled`, 배지 |
| `/admin/payments` | 결제 내역·취소·내보내기 |
| `/admin/sales` | 매출 분석 |
| `/admin/store` | 팝업 광고 |
| `/admin/store/reviews` | 리뷰 관리 |
| `/admin/settings` | 설정 |

주요 API prefix: `/api/admin`, `/api/admin/auth`, `/api/admin/sales`, `/api/admin/popup-ads`, `/api/admin/reviews`

---

## 실행 방법

### 사전 요구

- **Backend:** Java 21, Docker(Compose), Gradle Wrapper
- **Frontend:** Node.js, npm

### Backend

```bash
cd BE
docker compose up -d          # MySQL 8.4
cp .env.example .env          # 로컬 값으로 수정
./gradlew bootRun             # Windows: gradlew.bat bootRun
```

- 기본 프로파일: `dev` (`application.yml`)
- 포트: `SERVER_PORT` (미설정 시 8080)
- Swagger: `/swagger-ui.html` 또는 `/swagger-ui/index.html` (springdoc)

### Frontend

```bash
cd FE
npm install
npm run dev
npm run build
npm run lint
```

**API 연결 (코드 기준)**

- `VITE_API_BASE_URL` 미설정 + 로컬 개발: Vite `/api` 프록시 (기본 target은 `vite.config.ts` 참고)
- 로컬 BE: `VITE_API_BASE_URL=http://localhost:8080`
- 결제 테스트: `VITE_TOSS_CLIENT_KEY` 필요

---

## 환경 변수

비밀 값·키는 README에 넣지 않습니다.

### Backend (`.env.example`, `application.yml`)

| 변수 | 용도 |
|------|------|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` | JDBC |
| `TOSS_SECRET_KEY`, `TOSS_BASE_URL` | Toss Payments |
| `AWS_REGION`, `AWS_S3_BUCKET` | S3 (자격 증명은 IAM/런타임 체인) |
| `ALLOWED_ORIGINS` | CORS |
| `ADMIN_LOGIN_ID`, `ADMIN_PASSWORD` | 부트스트랩 관리자 |
| `JWT_SECRET`, `JWT_EXPIRATION_SECONDS` | 관리자 JWT |
| `PUSH_ENABLED`, `VAPID_*` | Web Push |
| `MAIL_*` | 서비스 문의 SMTP |
| `SERVER_PORT`, `SPRING_PROFILES_ACTIVE` | 서버·프로파일 |

### Frontend

| 변수 | 용도 |
|------|------|
| `VITE_API_BASE_URL` | API base URL |
| `VITE_TOSS_CLIENT_KEY` | Toss 클라이언트 키 |

알려진 웹 호스트(`www.babidndn.shop`, `dev.babidndn.shop` 등)는 FE에서 API 호스트로 매핑됩니다.

---

## 테스트

### Backend

```bash
cd BE
./gradlew test
```

JUnit 5 기반. 패키지별 `*Test`, `*ControllerTest` (menu, order, payment, savedmenu, admin, sales 등).

### Frontend

```bash
cd FE
npm run build    # tsc -b && vite build
npm run lint
```

이 README 작성 시점에 위 명령은 로컬에서 실행 가능하며, **실기기·운영 환경 E2E 결과는 포함하지 않습니다.**

---

## 데이터베이스 및 Migration

- **로컬:** JPA `ddl-auto: update`로 엔티티 기반 스키마 반영
- **초기 데이터:** `BE/scripts/initial-menu-data.sql` (카테고리: 컵밥/우동/세트/음료수, 메뉴·옵션 seed)
- **운영 1회 SQL:** `BE/scripts/` 아래 개별 파일 (기존 migration 수정 없이 추가)

| 스크립트 (예) | 용도 |
|---------------|------|
| `add-menu-badge.sql` | 메뉴 배지 |
| `add-saved-menus.sql` | 나만의 메뉴 테이블 |
| `add-menu-topping-enabled.sql` | `topping_enabled` 컬럼 |
| `add-naengmomil-packaging-options.sql` | 냉모밀 단품 PACKAGING |
| `add-naengmomil-set-packaging-options.sql` | 냉모밀 세트 PACKAGING |
| `sync-cupbap-like-set-options.sql` | 컵밥형 세트: 스팸→햄구이, 참기름 제외, PACKAGING |
| `rename-spam-to-ham-grill.sql` | TOPPING_ADD 스팸→햄구이 |
| `fix-bibim-udon-topping-removes.sql` | 참치불닭 옵션 정리 |

운영 DB에는 JPA 이후 **필요한 SQL만 1회씩** 실행합니다. 모든 파일을 매 배포마다 실행하지 않습니다.

---

## 배포

### Backend — GitHub Actions (`deploy-backend.yml`)

| 브랜치 | Profile | 컨테이너 | DB |
|--------|---------|----------|-----|
| `main` | `prod` | `babi-order` | `babi_order` |
| `dev` | `dev` | `babi-order-dev` | `babi_order_dev` |

Docker 빌드 → **AWS ECR** push → **EC2** SSH `docker run`.

### Frontend

- `FE/vercel.json`: 도메인별 `/api` → 백엔드 rewrite, SPA fallback
- 프론트 전용 CI 워크플로는 저장소에 없음 (Vercel 프로젝트 연결은 배포 환경에서 확인)

---

## 주요 구현 특징

| 영역 | 내용 |
|------|------|
| 옵션 정렬 | FE/BE 공통 순서, `optionSort.ts` |
| 메뉴 유형별 옵션 동기화 | `AdminMenuService` — 컵밥형/냉모밀/참치불닭/삼겹소금 |
| `toppingEnabled` | DB 영속화 + 관리자 저장 시 옵션 sync |
| Snapshot | 주문·나만의 메뉴 옵션명 보존 |
| 실시간 주문 | 관리자 SSE, 사용자 폴링 |
| PWA·Push | Workbox + VAPID Web Push |
| 모바일 UX | `interactive-widget=overlays-content`, `--app-height` (`appHeight.ts`) |
| 옵션 시트 | `MenuOptionModal` → `#user-app-frame` portal, 헤더까지 딤 |
| 나만의 메뉴 팝업 | `useSavedMenuPopupKeyboard` — 카드만 `translateY`, 페이지 scroll 고정 |
| 이미지 | S3 Presigned, FE 크롭(메뉴) |
| 주방 출력 | FE → `window.Android` 브릿지 (앱 소스는 저장소 외부) |

---

## 알려진 제약

- QR 생성·스캔 코드 없음
- WebSocket 없음 (SSE 사용)
- 고객 로그인 없음
- Android 프린터 앱은 외부 시스템
- 배달·쿠폰·Toss Payment Widget 미구현
- Flyway/Liquibase 없음 — 운영 schema는 JPA + 수동 SQL 병행

---

## API 문서

- springdoc OpenAPI: `/swagger-ui/**`, `/v3/api-docs/**`
- Security에서 Swagger 경로 허용

---

## 라이선스

저장소에 별도 라이선스 파일은 없습니다.
