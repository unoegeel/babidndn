# 바비든든 스마트 오더 — Development Conventions

> 목적: 코드 작성 시 일관된 개발 규칙을 적용하기 위한 문서
> 주의: 아래 규칙 중 "현재 코드에서 확인된 사실"과 "권장 규칙"을 구분한다.
> 이 문서는 Architecture/Current Context와 달리 코드 작성 방식에 집중한다.

## 1. General Principle

1. 기존 프로젝트의 구조와 naming을 우선한다.
2. 새로운 패턴을 도입하기 전에 동일한 문제를 해결하는 기존 패턴이 있는지 확인한다.
3. 단순한 변경을 위해 관련 없는 영역을 리팩토링하지 않는다.
4. business rule은 UI에서 임의로 중복 구현하지 않고 Backend source of truth를 우선한다.
5. 변경 후 관련 테스트와 영향 범위를 확인한다.

## 2. Architecture Conventions

### Backend

권장/현재 구조:

```text
Controller
  ↓
Service
  ↓
Repository
  ↓
Entity
```

- Controller: HTTP contract와 입력/출력에 집중
- Service: business rule 및 transaction 처리
- Repository: persistence
- DTO: API request/response contract
- Entity: persistence model

새 기능은 기존 domain package 구조를 우선적으로 따른다.

### Frontend

현재 구조:

```text
pages/
store/
services/
api/
utils/
types/
```

기능 위치를 결정할 때 기존 유사 기능의 위치를 우선한다.

- Page: route-level UI
- Store/Context: 여러 화면에서 공유되는 상태
- Service/API: backend 호출
- Utils: 공통 로직
- Types: 공유 타입 계약

## 3. Naming

기본적으로 현재 코드의 naming style을 유지한다.

- React Component: PascalCase
- TypeScript 변수/함수: camelCase
- Java class: PascalCase
- Java method/field: camelCase
- Java service: `*Service`
- Java controller: `*Controller`
- Java repository: `*Repository`

새 이름을 만들 때 동일 domain 내부 기존 이름과 일관성을 유지한다.

## 4. API Conventions

- 기존 endpoint naming을 우선한다.
- request/response DTO 구조를 임의로 깨지 않는다.
- 인증이 필요한 endpoint는 SecurityConfig 및 frontend auth flow를 함께 확인한다.
- API 변경 시 FE 호출부와 Backend controller/service를 함께 확인한다.
- 결제/주문 API는 idempotency와 상태 전이를 반드시 검토한다.

## 5. State Management

현재 전역 상태는 Context 기반이다.

- `UserDataContext`
- `AdminDataContext`

새로운 전역 상태 도구(Zustand/Redux 등)를 도입하지 않고 기존 Context 구조로 해결 가능한지 먼저 검토한다.

localStorage/sessionStorage 사용 시:
- key naming을 기존 규칙과 맞춘다.
- 민감한 값을 저장하지 않는다.
- 만료/cleanup 조건이 필요한지 검토한다.

## 6. Error Handling

- 기존 `ApiError` 및 frontend error reporting 흐름을 우선한다.
- 사용자에게 표시되는 오류와 개발용 로그를 분리한다.
- 새로운 핵심 flow는 가능한 경우 ClientEvent / ClientError / request tracing과 연결한다.

## 7. Database / Entity Changes

DB schema를 수정하는 경우:
1. Entity
2. Relation
3. Service
4. DTO
5. Migration/seed/script
6. Test

의 영향을 함께 확인한다.

현재 production은 Hibernate `ddl-auto: update`를 사용하므로 schema 변경 시 실제 운영 영향도 별도로 검토한다.

## 8. Order / Payment Safety

다음 규칙을 깨지 않는다.

- Backend가 금액의 source of truth
- 주문/결제 상태 전이 규칙 유지
- OrderItem snapshot 보존
- Payment webhook 재검증
- 결제 완료 후 픽업번호 발급
- 관련 SSE event 영향 확인

## 9. SavedMenu Safety

SavedMenu 변경 시:
- `X-Client-Key`
- Menu/Option snapshot
- `resolveStatus()`
- `DISCONTINUED`
- `OPTIONS_STALE`
- `SOLDOUT`

의 영향을 함께 검토한다.

## 10. Mobile UI

iOS keyboard 관련 코드는 임의 삭제/우회를 하지 않는다.

변경 전 확인:
- `visualViewport`
- `--app-height`
- keyboard freeze
- SavedMenu popup translation
- fixed/sticky layout
- safe area
- input focus behavior

## 11. Testing

새로운 핵심 business logic은 가능하면 Backend unit/service test를 추가한다.

핵심 UI flow 변경 시:
- 기존 utility tests 확인
- 페이지 regression 여부 확인
- 가능하면 E2E 대상 여부 검토

특히:
- Checkout
- Payment
- SavedMenu
- Order
- Admin dashboard

변경은 테스트 추가 필요성을 우선 검토한다.

## 12. Git / Change Scope

권장:
- 하나의 작업은 하나의 명확한 목적에 집중
- 기능 수정과 무관한 대규모 formatting은 피함
- migration/seed 변경은 별도 영향 검토
- breaking change는 작업 설명에 명시

## 13. Before Editing Checklist

```text
[ ] 기존 구현 위치 확인
[ ] 호출 관계 확인
[ ] 관련 business rule 확인
[ ] FE/BE 영향 범위 확인
[ ] DB 영향 확인
[ ] 테스트 존재 여부 확인
[ ] observability 영향 확인
[ ] 모바일/결제/실시간 연동 영향 확인
```

## 14. Definition of Done

작업 완료 시 최소한 다음을 확인한다.

1. 코드가 기존 구조와 일관되는가?
2. 기존 business rule을 깨지 않았는가?
3. 관련 호출부가 모두 반영되었는가?
4. 테스트/빌드가 가능한가?
5. 새로운 오류가 없는가?
6. 문서화가 필요한 변경인가?
7. `CURRENT_CONTEXT.md` 갱신이 필요한가?

## 15. Important Note

이 문서는 코딩 규칙 문서다.

Architecture가 변경되면 `ARCHITECTURE.md`를 갱신하고,
현재 개발 상태가 변경되면 `CURRENT_CONTEXT.md`를 갱신한다.

세 문서를 서로 다른 목적의 문서로 유지한다.
