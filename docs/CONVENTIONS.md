# 바비든든 스마트 오더 — Development Conventions

> 목적: **실제 코드에서 확인된 규칙** + 유지해야 할 프로젝트 관례  
> 시스템 구조: [ARCHITECTURE.md](ARCHITECTURE.md) · 현재 상태: [CURRENT_CONTEXT.md](CURRENT_CONTEXT.md)

문서에 **「권장」** 이라고 표기된 항목은 팀 합의 관례이며, 코드 전역에 100% 강제되지 않을 수 있습니다.

---

## 1. General Principles

1. 기존 package·naming·패턴을 우선한다.
2. 동일 문제를 푸는 기존 구현이 있으면 새 패턴을 도입하지 않는다.
3. unrelated refactor 금지 — 목적에 맞는 최소 diff.
4. **Business rule은 Backend source of truth** — FE는 API 결과를 표시·입력 검증만.
5. 변경 후 관련 테스트·영향 범위 확인.

---

## 2. Backend Layering

```text
Controller  → HTTP contract, validation trigger
Service     → business rule, @Transactional
Repository  → persistence (JpaRepository / native query)
Entity      → DB model
DTO         → API request/response
```

- Domain package별 분리: `menu/`, `order/`, `dev/`, `clientevent/` 등
- Developer Console: `dev/overview`, `dev/error`, `dev/request`, `dev/event`, `dev/analytics`
- Analytics 집계: `AnalyticsQueryRepository` — native SQL, Java 전체 로드 금지 (기존 패턴 유지)

---

## 3. Frontend Layout

```text
pages/        # route-level (user / owner / developer)
components/   # UI
services/     # backend 호출
api/          # HTTP client
store/        # Context
utils/        # 공통 로직
types/        # 공유 타입
```

- Developer Console: `pages/developer/`, `components/developer/`, `services/developer/`
- 유사 기능은 기존 파일 위치를 따른다.

---

## 4. Naming

| 대상 | 규칙 |
|------|------|
| React component | PascalCase |
| TS 함수/변수 | camelCase |
| Java class | PascalCase |
| Service | `*Service` |
| Controller | `*Controller` |
| Repository | `*Repository` |

---

## 5. API Conventions

- 기존 endpoint path 유지 (`/api/admin/*`, `/api/dev/*`, …)
- breaking DTO change 금지 — 확장은 optional field 또는 **새 endpoint** (예: `/menu-options` vs `/options`)
- 인증: `SecurityConfig` + FE `RequireAdminAuth` / `RequireDeveloperAuth` 동시 확인
- Error response: `ApiException` → `ErrorResponse` (domain별 handler 우선순위 존재)

---

## 6. State Management

- 전역: **React Context** (`UserDataContext`, `AdminDataContext`) — Zustand/Redux 도입 전 기존 Context로 해결
- `localStorage` / `sessionStorage` key는 기존 naming (`babi_user_orders`, `gdgoc-admin-token`, …)
- 민감 정보 localStorage 저장 금지

---

## 7. Observability (확인된 패턴)

새 핵심 사용자 flow 추가 시 연결 검토:

| 계층 | FE | BE |
|------|----|----|
| Event | `trackEvent()` / `eventHelpers` | `POST /api/client-events` |
| Client error | `reportFrontendError` | `POST /api/client-errors` |
| Request | `X-Request-Id` | `RequestIdFilter`, `http_request_records` |

- Event metadata: allow-list `ClientEventType` · `sanitizeMetadata`
- Analytics 집계 키: **`anonymousId`** (sessionId로 임의 변경하지 않음)
- Menu×Option: `OPTION_SELECTED.metadata.menuId` 필수 — 시간순 추론 금지

---

## 8. Order / Payment / SavedMenu

변경 시 반드시 검토:

- Backend 금액 source of truth
- OrderItem snapshot
- Payment 3중 검증 · webhook 재조회
- `pickupNumber` 발급 시점
- SSE event
- SavedMenu `resolveStatus()`, `X-Client-Key`
- 고객 order-scoped API: `X-Order-Access-Token` 검증 (`OrderAccessGuard`). raw token 로그/URL 금지. `ROLE_ADMIN`만 bypass
- `X-Client-Key`를 주문 authorization credential로 쓰지 않음

---

## 9. Database / Schema

변경 체크리스트: Entity → Relation → Service → DTO → **Flyway migration** → Test

### Ownership

| Layer | Responsibility |
|-------|----------------|
| **Flyway** | Schema mutation (`classpath:db/migration`) |
| **Hibernate** | `ddl-auto: validate` (dev/prod) — mutation 금지 |
| **H2 tests** | `ddl-auto: create-drop`, `spring.flyway.enabled=false` |

### Flyway baseline (existing DB)

- `baseline-on-migrate: true`, `baseline-version: 100`
- Non-empty DB: 현재 schema를 baseline으로 **등록만** 한다. 과거 `BE/scripts` SQL을 재실행하지 않는다.
- 다음 실제 schema 변경: `V101__...sql` 부터
- **배포된 migration 수정 금지** — rollback/수정은 새 version
- schema 변경과 data backfill은 가능한 분리
- destructive change 전 `BE/scripts` precheck 또는 drift audit 필수
- idempotent SQL에 의존하지 말고 Flyway history로 실행 여부 관리

### Legacy scripts

- `BE/scripts/*.sql` 유지 (LEGACY / DATA_MAINTENANCE / PRECHECK) — 분류는 `BE/scripts/README.md`
- 신규 schema 변경은 **`BE/src/main/resources/db/migration`에만** 추가
- Fresh empty MySQL full bootstrap은 후속 task (현재는 existing DB + H2 test)

---

## 10. Mobile UI

iOS keyboard 관련 변경 시 확인:

- `appHeight.ts`, `useSavedMenuPopupKeyboard.ts`
- `visualViewport`, `--app-height`, keyboard freeze
- `ContactPage`, `ReviewPage`, Saved Menu popup

임의 제거·우회 금지.

---

## 11. Testing

### Backend

- Business logic: `@DataJpaTest` + `@Import(Service)` 또는 service unit test (프로젝트 선례 따름)
- Controller: `@WebMvcTest` + Security import
- **WebMvc slice 공통 mock:** `@Import(WebMvcSliceTestConfig.class)` — `ApiExceptionHandler`(`@RestControllerAdvice` 자동 포함)용 `BackendErrorRecordService`, `RequestIdFilterConfig`용 `RequestRecordService`. 개별 `@MockitoBean`도 동일 목적이면 허용
- Analytics native SQL: H2 `JSON_EXTRACT` 미지원 → service layer mock test

### Frontend

- `npm run build` (tsc + vite)
- `npm run lint` — `eslint-plugin-react-hooks` v7 recommended (set-state-in-effect / purity / refs 포함)
- prop→local state sync: effect 대신 render 중 조정(React 권장) 또는 fetch는 `await Promise.resolve()` 후 setState
- 폴링 콜백: `useEffectEvent` (ref 렌더 접근 회피)
- `npm test` (vitest) — utility 위주

---

## 12. Git / Change Scope

- 한 commit/PR = 하나의 명확한 목적 (권장)
- migration/seed/script 변경은 deploy 영향 명시
- 문서: 기능·schema·auth·배포 변경 시 [CURRENT_CONTEXT.md](CURRENT_CONTEXT.md) 갱신

---

## 13. Definition of Done

1. 기존 구조·naming 일치  
2. Business rule 미파괴  
3. FE/BE 호출부 반영  
4. 관련 test/build 가능  
5. 필요 시 ARCHITECTURE / CURRENT_CONTEXT 갱신  

---

## 14. Documentation Maintenance

| 변경 유형 | 갱신 문서 |
|-----------|-----------|
| 실행·배포·env | README |
| 구조·domain·API | ARCHITECTURE |
| 코딩 규칙 | CONVENTIONS |
| 최근 작업·리스크·Pending | CURRENT_CONTEXT |

CONVENTIONS 자체가 바뀔 때만 CONVENTIONS 수정.
