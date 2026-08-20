# 바비든든 스마트 오더 (BabiOrder)

**바비든든** 매장 픽업 주문·결제·운영을 위한 **FE + BE 모노레포**입니다.  
서비스 표시명: **바비오더**

---

## 문서

| 문서 | 용도 |
|------|------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 시스템·도메인·데이터 흐름 |
| [docs/CONVENTIONS.md](docs/CONVENTIONS.md) | 코딩·API·테스트 규칙 |
| [docs/CURRENT_CONTEXT.md](docs/CURRENT_CONTEXT.md) | 현재 개발 상태·최근 변경·리스크 |

**Source of truth는 항상 실제 코드입니다.** 문서와 코드가 다르면 코드를 따릅니다.

---

## 프로젝트 소개

| 항목 | 내용 |
|------|------|
| 목적 | 매장 픽업 주문 디지털화 (메뉴 → 결제 → 픽업번호 → 상태 추적) |
| 사용자 | **고객** (`/user`, PWA), **관리자** (`/admin`, JWT), **개발자** (`/dev`, JWT) |
| 인증 | 고객 로그인 없음 · 관리자/개발자 JWT (`ROLE_ADMIN` / `ROLE_DEVELOPER`) |

---

## 주요 기능 (요약)

### 고객 `/user`

메뉴·옵션·장바구니 · Toss 결제 · 주문 현황(폴링) · Web Push · PWA · 나만의 메뉴 · 리뷰/문의 · 공지

### 관리자 `/admin`

주문 대시보드(SSE) · 메뉴/옵션 CRUD · 결제/취소 · 매출 분석 · 팝업/리뷰 · S3 이미지 · Android 주방티켓 **브릿지 호출**

### 개발자 `/dev`

운영 관측 콘솔: **오류 · 요청 · 이벤트 · Analytics** · Overview Dashboard · Menu×Option 분석  
(상세: [ARCHITECTURE.md — Observability](docs/ARCHITECTURE.md))

---

## 기술 스택

| 영역 | 구성 |
|------|------|
| FE | React 19, TypeScript, Vite 8, Tailwind 4, React Router 7, Context, PWA |
| BE | Java 21, Spring Boot 4.1, JPA, Security(JWT), SSE, Mail, S3, Web Push |
| DB | MySQL 8.4 · Hibernate `ddl-auto: update` (Flyway/Liquibase 없음) |
| 결제 | Toss Payments |
| 배포 | FE Vercel · BE GitHub Actions → ECR → EC2 Docker |

Toss SDK는 `FE/index.html`의 CDN 스크립트로 로드합니다.

---

## Repository 구조

```text
babidndn/
├── FE/src/
│   ├── pages/user/          # 고객
│   ├── pages/owner/         # 관리자 UI (/admin 라우트)
│   ├── pages/developer/     # Developer Console (/dev)
│   ├── components/ services/ store/ api/ utils/ types/
├── BE/src/main/java/com/gdgoc/babi_order/
│   ├── admin/ menu/ order/ payment/ savedmenu/ sales/ store/ push/
│   ├── clientevent/ clienterror/ backenderror/ httprequest/  # Observability
│   ├── dev/                 # Developer Console API
│   └── config/
├── BE/scripts/              # seed·운영 1회 SQL
├── BE/compose.yml           # 로컬 MySQL
├── .github/workflows/       # BE 배포
├── vercel.json              # FE 빌드·API rewrite
└── docs/
```

---

## 로컬 실행

### 사전 요구

- **BE:** Java 21, Docker(Compose), Gradle Wrapper  
- **FE:** Node.js, npm

### Backend

```bash
cd BE
docker compose up -d
cp .env.example .env    # 값 수정
./gradlew bootRun       # Windows: gradlew.bat bootRun
```

- 기본 프로파일: `dev` · 포트: `8080` (미설정 시)  
- Swagger: `/swagger-ui/index.html`

### Frontend

```bash
cd FE
npm install
npm run dev
npm run build
npm run lint
npm test
```

- 로컬 BE: `VITE_API_BASE_URL=http://localhost:8080`  
- 결제 테스트: `VITE_TOSS_CLIENT_KEY` 필요  
- `VITE_API_BASE_URL` 미설정 시 Vite `/api` 프록시 (`vite.config.ts`)

---

## 환경 변수 (이름만)

비밀 값은 README에 넣지 않습니다. 전체 목록: `BE/.env.example`, `BE/src/main/resources/application.yml`

| 구분 | 예시 |
|------|------|
| DB | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` |
| Toss | `TOSS_SECRET_KEY`, `TOSS_BASE_URL` / `VITE_TOSS_CLIENT_KEY` |
| AWS | `AWS_REGION`, `AWS_S3_BUCKET` |
| Auth | `JWT_SECRET`, `ADMIN_LOGIN_ID`, `ADMIN_PASSWORD` |
| Push | `PUSH_ENABLED`, `VAPID_*` |
| Mail | `MAIL_*` |
| CORS | `ALLOWED_ORIGINS` |

---

## 테스트 · 빌드

```bash
# Backend
cd BE && ./gradlew test

# Frontend
cd FE && npm run build && npm run lint && npm test
```

테스트·lint 현황은 [CURRENT_CONTEXT.md](docs/CURRENT_CONTEXT.md)를 참고하세요.

---

## 데이터베이스

- **로컬:** JPA `ddl-auto: update`  
- **초기 seed:** `BE/scripts/initial-menu-data.sql`  
- **운영 1회 SQL:** `BE/scripts/*.sql` (필요한 파일만 환경별 실행)

---

## 배포

### Backend (`deploy-backend.yml`)

| 브랜치 | Profile | 컨테이너 | DB (기본) |
|--------|---------|----------|-----------|
| `main` | `prod` | `babi-order` :8080 | `babi_order` |
| `dev` | `dev` | `babi-order-dev` :8081 | `babi_order_dev` |

ECR push → EC2 SSH → `docker run`

### Frontend

- 루트 `vercel.json`: `FE` 빌드, 호스트별 `/api` → 백엔드 rewrite, SPA fallback  
- 도메인 예: `www.babidndn.shop`, `dev.babidndn.shop`, `dev-api.babidndn.shop`

---

## 범위 밖 / 제약

- QR 생성·스캔 코드 없음  
- WebSocket 없음 (관리자 SSE 사용)  
- Android **프린터 앱·ESC/POS** 소스 없음 (`window.Android` 브릿지만)  
- Flyway/Liquibase 없음  
- PortOne 미사용  

---

## API 문서

springdoc: `/swagger-ui/index.html`, `/v3/api-docs/**`

---

## 라이선스

저장소에 별도 LICENSE 파일 없음.
