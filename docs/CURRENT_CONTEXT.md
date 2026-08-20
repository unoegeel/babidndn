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
- `/dev` Overview Dashboard · `/dev/errors|requests|events|analytics`
- `GET /api/dev/overview` · `GET /api/dev/analytics/menu-options`
- Menu×Option 선택률 (분모 `MENU_OPTION_OPEN`, 분자 `OPTION_SELECTED` + `menuId`)

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

- **production `babi_order`:** `client_errors` / `backend_errors` 존재 여부 및 `stack`/`component_stack` 타입 확인 — 수정된 `create-developer-error-tables.sql` 적용 여부는 main 배포 전 별도 검증
- `BE/scripts/sync-menu-topping-remove-policies.sql` **운영 DB 미적용 가능**
- Developer Overview / menu-options KPI **운영 데이터 spot check**
- iPhone keyboard **전 기종 regression**
- Developer 계정 bootstrap / role 운영 절차

### Known Issue (현재 존재하는 문제)

| 이슈 | 설명 |
|------|------|
| BE full test suite | `./gradlew test` 시 다수 실패 (~71, 2026-08-20) — WebMvcTest 등 `BackendErrorRecordService` mock 누락 등 **기존 테스트 infra** |
| FE lint | `npm run lint` **53 errors** (기존, 이번 Dev Console 변경과 무관) |
| Production schema | Flyway 없음 · `ddl-auto: update` only · migration 추적/rollback 부족 |
| Customer API ACL | 대부분 `permitAll` · `orderId` 타인 접근 가능성 **미재검증** |
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

## 6. Test State (2026-08-20)

| Command | Result |
|---------|--------|
| `cd BE && ./gradlew test --tests "com.gdgoc.babi_order.dev.*"` | PASS |
| `cd BE && ./gradlew test` (full) | FAIL (~71) |
| `cd FE && npm run build` | PASS |
| `cd FE && npm run lint` | FAIL (53 errors) |
| `cd FE && npm test` | (utility tests — CI 미고정) |

---

## 7. Current Priorities

1. 고객 주문 API 접근 제어 재검토  
2. Production `babi_order` error tables schema 확인 및 수정 DDL 적용 여부  
3. BE WebMvcTest infra 정리 (`BackendErrorRecordService` mock 일괄)  
4. FE lint 점진적 해소  
5. 결제·Checkout E2E  
6. Analytics index/volume (데이터 증가 후)  
7. 모바일 keyboard regression  

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
