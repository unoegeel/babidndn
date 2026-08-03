## 🌳 Git 브랜치 규칙

### Branch Strategy
main
<br>>ㅤdevelop
ㅤ<br>ㅤ>>ㅤfeature/~
ㅤ<br>ㅤ>>ㅤfeature/~
ㅤ<br>ㅤ>>ㅤfeature/~

### Branch Rule
main
- 배포 가능한 코드
- 직접 Push 금지
- develop에서 Merge
develop
- 개발 통합 브랜치
- feature 브랜치만 Merge
feature
- 기능 단위 개발
ex) feature/fe-menu, feature/be-order, feature/be-payment

### Workflow
develop Pull
<br>↓
<br>feature 생성
<br>↓
<br>개발
<br>↓
<br>Commit
<br>↓
<br>Push
<br>↓
<br>PR 생성
<br>↓
<br>Review
<br>↓
<br>develop Merge
<br>↓
<br>feature 삭제

### Commit Convention
feat: 기능 추가
<br>fix: 버그 수정
<br>refactor: 리팩토링
<br>docs: 문서 수정
<br>style: 코드 스타일
<br>test: 테스트
<br>chore: 설정 변경

### Commit Message

```text
<type>: <변경 내용>
```

예시:

```text
feat: 주문 생성 API 구현
fix: 결제 취소 시 상태 변경 오류 수정
chore: 로컬 MySQL 및 JPA 환경 설정
docs: 로컬 DB 실행 방법 추가
```

### Pull Request

PR 제목은 커밋 메시지와 같은 형식을 사용합니다.

```text
<type>: <작업 내용>
```

PR 본문 템플릿:

```markdown
## 작업 내용

- 구현하거나 변경한 내용을 작성합니다.

## 테스트

- 수행한 테스트와 결과를 작성합니다.

## 참고

- 리뷰에 필요한 사항이나 후속 작업을 작성합니다.
```

로컬 DB 설정 PR 예시:

```text
chore: 로컬 MySQL 및 JPA 환경 설정
```

<br><br>

## 🚨 프로젝트 규칙

### 개발 규칙
- 모든 기능은 feature/* 브랜치에서 개발한다.
- main 브랜치 직접 Push 금지
- develop 브랜치 직접 Push 금지 (PR을 통해 Merge)
- 기능 개발 전 최신 develop을 Pull한다.
- Merge는 Squash and Merge를 사용한다.
  
### 완료 기준 (Definition of Done)
기능 구현 완료
API 연동 완료
예외 처리 완료
로컬 테스트 완료
PR 생성 및 리뷰 완료
develop 브랜치에 Merge 완료

<br><br>

## 🗄️ 로컬 DB 실행

### 준비

- Docker Desktop 또는 Docker Engine
- Java 21

### 실행 방법

```bash
cp .env.example .env
docker compose up -d
./gradlew bootRun
```

MySQL은 기본적으로 `localhost:3306`에서 실행되며, DB 이름은 `babi_order`입니다.
개인별 접속 정보와 Toss Secret Key는 `.env`에서 변경하고 `.env`는 Git에 커밋하지 않습니다.

### 종료

```bash
docker compose down
```

DB 데이터까지 초기화해야 할 때만 다음 명령을 사용합니다.

```bash
docker compose down -v
```

<br><br>

## 초기 메뉴 데이터

실제 서비스에서 사용할 메뉴 및 토핑 데이터는 `scripts/initial-menu-data.sql`에 정의되어 있습니다.

### 데이터 구성

- 카테고리: 컵밥, 우동, 세트, 음료수
- 메뉴: 총 45개
- 토핑: 총 6종
- 토핑별 최대 선택 수량: 3개

### 토핑 적용 기준

- 컵밥 메뉴에 토핑을 적용합니다.
- 세트 메뉴는 세트에 포함된 컵밥에 토핑을 적용합니다.
- 우동 및 음료 메뉴에는 토핑을 적용하지 않습니다.
- 메뉴 이미지와 설명은 자료 확정 전까지 비워둡니다.

### 참고 사항

- 초기 데이터 SQL은 중복 삽입을 방지하도록 작성되어 있습니다.
- 주문 및 결제 데이터는 초기 데이터에 포함하지 않습니다.
- 메뉴, 가격, 토핑 정보가 변경되면 초기 데이터 SQL도 함께 수정해야 합니다.

<br><br>

## API 안내

- 로컬 API 기본 주소: `http://localhost:8080`
- 자세한 API 요청·응답 형식 및 에러 코드는 팀 Notion 하단의 API 명세서를 참고해 주세요.
