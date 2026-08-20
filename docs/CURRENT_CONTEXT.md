# 바비든든 스마트 오더 — Current Development Context

> 기준일: 2026-08-20
> 목적: 현재 개발 상태와 최근 변경 맥락을 보존하는 살아있는 개발 문서
> 주의: 코드가 변경되면 이 문서의 상태도 함께 갱신한다.

## 1. Current Snapshot

현재 바비오더는 다음 핵심 기능이 구현된 상태다.

- 고객 메뉴 조회
- 메뉴 옵션/토핑 선택
- 장바구니
- 주문 생성
- Toss Payments 결제
- 주문 상태 추적
- 관리자 주문 대시보드
- 관리자 SSE
- 메뉴/옵션 관리
- 결제 취소
- 매출 분석
- Saved Menu(나만의 메뉴)
- Web Push
- PWA
- Developer Console
- User Event Analytics
- FE/BE Error Tracking
- Request Tracking

## 2. Recently Changed / Important Context

### TOPPING_REMOVE 메뉴명 정책 (2026-08-20)
- Backend `AdminMenuService` canonical sync로 반영 완료
- FE는 메뉴명 필터 없이 `MenuOptionModal` 레이아웃만 ADD와 동일한 고정폭 스크롤로 맞춤
- 신규 설치: `BE/scripts/initial-menu-data.sql`
- 기존 DB: `BE/scripts/sync-menu-topping-remove-policies.sql` (운영 미적용, 파일만 추가)
- 관련 테스트: `AdminMenuServiceTest`

### Saved Menu
- CRUD 구현 완료
- `X-Client-Key` 기반 식별
- snapshot 기반 저장
- `resolveStatus()` 런타임 상태 계산
- 원본 메뉴/옵션 변경 시 `DISCONTINUED`, `OPTIONS_STALE`, `SOLDOUT` 등 상태가 계산됨

### Menu / Option / Topping
- 별도 Topping Entity는 없음
- `MenuOption` + `OptionGroupType` + `Menu.toppingEnabled`로 토핑 표현
- 주요 그룹:
  - `SIZE`
  - `PACKAGING`
  - `TOPPING_ADD`
  - `TOPPING_REMOVE`
- 옵션은 메뉴 소속 여부 및 수량 제한을 검증함
- 컵밥형 `TOPPING_REMOVE`는 메뉴명 부분 일치 정책으로 동기화한다.
  - `김치삼겹볶음밥` → 0개
  - `삼겹소금` / `삼겹양념` → 4개(김치, 고추장 소스, 참기름, 김가루)
  - `마요` → 2개(단무지, 김가루)
  - 그 외 컵밥형 → 기본 2개
  - `참치불닭비빔우동` 전용 3종은 기존 분기 유지
- 정책은 `AdminMenuService`에만 있으며 FE `MenuOptionModal`은 API 옵션을 그대로 표시한다.
- `TOPPING_REMOVE` 버튼은 `TOPPING_ADD`와 동일하게 `108px × 56px` 고정폭 + 가로 스크롤이다.
- 운영 DB 반영은 `BE/scripts/sync-menu-topping-remove-policies.sql`을 환경별로 실행해야 한다. 애플리케이션 코드만으로는 기존 row가 즉시 바뀌지 않고, 메뉴 저장/상세 heal 시점에 동기화된다.

### Mobile Keyboard
최근 iPhone 키보드/viewport 관련 수정 이력이 존재한다.

핵심 파일:
- `FE/src/utils/appHeight.ts`
- `FE/src/utils/useSavedMenuPopupKeyboard.ts` 또는 실제 repository의 동일 역할 파일
- `FE/src/pages/user/ContactPage.tsx`
- `FE/src/pages/user/ReviewPage.tsx`

과거 증상:
- iPhone Chrome에서 input focus 시 키보드로 페이지가 밀림
- 리뷰/문의 화면은 수정 이력이 있음
- Saved Menu popup에도 keyboard 보정 로직이 적용됨

주의:
- 실제 모든 기기에서 완전히 해결되었다고 단정하지 않는다.
- UI 수정 시 기존 visualViewport / height freeze 로직을 우회하지 않는다.

### Printer
현재 물리 CPP-3000 프린터 코드는 repository에 없음.

현재 존재:
- Android WebView bridge 계약
- `window.Android.printKitchenTicket`
- `window.Android.printCustomerReceipt`

현재 미존재:
- CPP-3000 USB/Serial 구현
- ESC/POS 실제 구현
- Android 프린터 앱 소스

따라서 프린터 기능 변경 시 bridge contract와 실제 Android 앱을 별도 범위로 관리한다.

### Observability / Developer Console
최근 8단계 수준의 관찰성 구조가 들어가 있다.

- Request ID
- HTTP request records
- Client errors
- Backend errors
- Client events
- Developer Console
- Analytics
- Error → Request 연결
- Event → Request 연결

이 기능은 신규 기능 개발 시 사용자 행동/오류 추적을 연결할 수 있는 기반으로 취급한다.

## 3. Current Risks

### Critical
1. 고객 주문 API 접근 제어 재검토 필요
   - 현재 고객 API 대부분이 `permitAll`
   - `orderId` 기반 주문 조회의 타인 접근 가능성 확인 필요
   - 실제 ID 생성 방식과 응답 민감정보를 추가 검증해야 함

2. Production DB schema 관리
   - Hibernate `ddl-auto: update`
   - Flyway/Liquibase 미사용
   - 운영 migration 추적/rollback 전략 부족

### High
3. Developer role/bootstrap 흐름 검증 필요
4. 장바구니가 메모리 only
5. Analytics가 MySQL native SQL에 의존

### Medium
6. FE UI/E2E 테스트 부족
7. SavedMenu stale 상태의 UX 보강 필요
8. SSE 장기 연결 동작/운영 모니터링 검토

### Low
9. Dead code / placeholder 정리
10. `pages/owner` 폴더와 `/admin` URL 명칭 불일치

## 4. Current Test State

### Backend
- Order
- Payment
- Menu
- SavedMenu
- Developer Console
- Observability

에 대한 Controller/Service 테스트 존재

### Frontend
- 일부 utility 테스트 존재
- 핵심 UI flow 테스트 부족

### Missing / Recommended
- Checkout UI test
- Cart UI test
- SavedMenu UI test
- Admin dashboard test
- Toss sandbox E2E
- 전체 user/admin E2E
- iOS/mobile keyboard regression

## 5. Business Rules That Must Not Be Broken

1. 결제 전 `pickupNumber=0`
2. 결제 완료 시 `activateAfterPayment()`에서 픽업번호 발급
3. 픽업번호는 Asia/Seoul 기준 당일 순환
4. Backend가 주문 총액의 source of truth
5. 결제 confirm은 주문/요청/Toss 응답 금액을 검증
6. 불일치 시 Toss cancel
7. webhook payload를 직접 신뢰하지 않고 Toss 재조회
8. 미결제 주문만 `/unpaid` 삭제 가능
9. 품절 메뉴는 주문 생성 거부
10. 옵션 수량 제한 준수
11. 같은 `menuOptionId` 중복 선택 금지
12. 옵션은 해당 Menu에 속해야 함
13. OrderItem/OrderItemOption은 생성 시점 snapshot 보존
14. SavedMenu는 `X-Client-Key` 사용
15. SavedMenu status는 DB 저장하지 않고 런타임 계산
16. 원본 Menu 삭제 시 SavedMenu는 `DISCONTINUED`
17. 원본 Option 변경/삭제 시 `OPTIONS_STALE` 가능
18. 관리자 주문 실시간 이벤트는 SSE
19. 고객 주문 추적은 polling
20. 고객 로그인은 의도적으로 없음
21. 관리자/개발자는 JWT role 기반 접근
22. Observability 저장 실패가 비즈니스 트랜잭션을 깨뜨리면 안 됨

## 6. Current Development Priorities

1. 고객 주문 API 접근 제어 재검토
2. Developer 계정 bootstrap / role 흐름 확인
3. Production schema migration 전략 검토
4. 결제 E2E 강화
5. Checkout / Payment FE 테스트
6. SavedMenu stale UX
7. Analytics 성능/index 검토
8. 모바일 keyboard regression 검증
9. Android printer bridge/실제 앱 경계 정리
10. 핵심 user/admin E2E 도입

## 7. Working Rules For Future Changes

- 수정 전 관련 entity/service/controller/component의 실제 호출 관계를 확인한다.
- 이미 존재하는 business rule을 임의로 제거하지 않는다.
- 결제 관련 수정은 Order + Payment + Webhook + SSE 흐름을 함께 확인한다.
- SavedMenu 수정은 Menu/Option snapshot과 `resolveStatus()` 영향을 함께 확인한다.
- 모바일 UI 수정은 기존 `visualViewport` 처리와 충돌 여부를 확인한다.
- observability 대상 기능은 event/error/request 추적 연결 여부를 함께 검토한다.
- 물리 프린터 관련 작업에서는 FE bridge와 외부 Android 앱을 같은 repository에 있다고 가정하지 않는다.

## 8. Update Policy

이 파일은 살아있는 문서다.

기능이 크게 변경되면:
- Current Snapshot
- Recently Changed
- Current Risks
- Business Rules
- Priorities

를 갱신한다.

특히 아래 상황에서는 반드시 갱신한다.
- 새로운 핵심 기능 추가
- DB 구조 변경
- 결제 flow 변경
- 인증/권한 변경
- SavedMenu/Menus/Orders 구조 변경
- 모바일 keyboard 처리 변경
- 배포 구조 변경
- Critical/High bug 수정
