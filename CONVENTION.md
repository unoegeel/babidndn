# Project Convention

바비든든 스마트 오더 프로젝트의 프론트엔드와 백엔드는 동일한 Git 규칙을 따릅니다.

## 프로젝트 소개

한국외국어대학교 글로벌캠퍼스 후생관 컵밥 전문점 **바비든든**을 위한 QR 기반 스마트 오더 MVP입니다. 메뉴 조회, 장바구니, 주문 생성, 결제, 관리자 주문 확인 및 상태 변경 기능을 제공합니다.

## 프로젝트 구조

```text
BE/  Spring Boot + Spring Security + JPA + Gradle
FE/  React + TypeScript + Vite + Tailwind CSS
```

## 브랜치 전략

```text
main
└── dev
    └── 작업 브랜치
```

### `main`

- 운영 환경에 배포 가능한 코드만 유지합니다.
- 직접 push하지 않습니다.
- 운영 배포가 준비된 변경사항을 `dev`에서 Pull Request로 병합합니다.

### `dev`

- 프론트엔드와 백엔드의 개발 내용을 통합하고 검증하는 브랜치입니다.
- 직접 push하지 않습니다.
- 작업 브랜치의 변경사항을 Pull Request로 병합합니다.

### 작업 브랜치

- 모든 작업은 GitHub Issue를 먼저 생성한 뒤 진행합니다.
- 최신 `dev`에서 이슈에 연결된 새 브랜치를 생성합니다.
- 브랜치 이름은 `<type>/<이슈번호>-<작업명>` 형식으로 작성합니다.

| 접두사 | 용도 | 예시 |
| --- | --- | --- |
| `feat/` | 새로운 기능 | `feat/12-order-create` |
| `fix/` | 버그 수정 | `fix/23-payment-cancel` |
| `refactor/` | 코드 구조 개선 | `refactor/31-order-service` |
| `docs/` | 문서 변경 | `docs/42-project-docs` |
| `test/` | 테스트 변경 | `test/51-order-service` |
| `chore/` | 설정 및 기타 작업 | `chore/63-docker-config` |

영문 작업명은 소문자와 하이픈을 사용해 간결하게 작성합니다.

## Issue 규칙

- 코드나 문서를 변경하기 전에 작업 목적과 범위를 담은 Issue를 생성합니다.
- Issue 하나에는 하나의 작업 목적만 작성합니다.
- 생성된 Issue 번호를 브랜치 이름에 포함합니다.
- Pull Request 본문에 `Closes #<이슈번호>`를 작성해 병합 시 Issue가 자동으로 닫히도록 연결합니다.
- Issue 생성 시 작업 성격에 맞는 템플릿을 사용합니다.
- Issue 제목은 `[TYPE] 작업 내용` 형식으로 작성합니다.

```text
[FEAT] 주문 생성 기능 구현
[FIX] 결제 취소 오류 수정
[BUG] 품절 메뉴 주문 가능 현상
[REFACTOR] 주문 서비스 구조 개선
```

## 작업 흐름

1. 작업할 내용으로 GitHub Issue를 생성합니다.
2. 최신 `dev`를 가져옵니다.
3. `<type>/<이슈번호>-<작업명>` 형식으로 브랜치를 생성합니다.
4. 구현과 로컬 테스트를 진행합니다.
5. 커밋한 뒤 원격 작업 브랜치에 push합니다.
6. 작업 브랜치에서 `dev`를 대상으로 Pull Request를 생성하고 Issue를 연결합니다.
7. 리뷰와 테스트를 통과하면 Squash and Merge합니다.
8. 통합된 기능이 개발 환경에서 정상 동작하는지 확인합니다.
9. 운영 배포가 준비되면 `dev`에서 `main`으로 Pull Request를 생성합니다.

## 커밋 컨벤션

```text
<type>: <변경 내용>
```

| type | 설명 |
| --- | --- |
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 |
| `refactor` | 기능 변경 없는 코드 구조 개선 |
| `docs` | 문서 수정 |
| `style` | 코드 동작에 영향을 주지 않는 형식 변경 |
| `test` | 테스트 추가 또는 수정 |
| `chore` | 빌드, 설정, 의존성 등 기타 변경 |

예시:

```text
feat: 주문 생성 API 구현
fix: 결제 취소 시 상태 변경 오류 수정
docs: 프로젝트 컨벤션 정리
chore: 개발 환경 설정 변경
```

## Pull Request 규칙

- PR 제목은 Issue와 동일하게 `[TYPE] 작업 내용` 형식을 사용합니다.
- 사용할 수 있는 TYPE은 `FEAT`, `FIX`, `BUG`, `REFACTOR`, `DOCS`, `TEST`, `CHORE`입니다.
- PR 제목 형식이 맞지 않으면 GitHub Actions 검사가 실패합니다.
- 하나의 PR에는 하나의 작업 목적만 담습니다.
- 변경 내용과 테스트 결과를 리뷰어가 확인할 수 있도록 작성합니다.
- PR 작성자 외 팀원 1명 이상의 승인 리뷰를 받아야 합니다.
- 요청된 변경사항과 리뷰 대화를 모두 해결한 뒤 병합합니다.
- 리뷰와 테스트가 끝난 PR은 Squash and Merge합니다.
- 저장소의 Pull Request 템플릿 항목을 빠짐없이 작성합니다.

```markdown
## 작업 내용

Closes #<이슈번호>

- 구현하거나 변경한 내용을 작성합니다.

## 테스트 결과

- 수행한 테스트와 결과를 작성합니다.

## 리뷰 참고 내용

- 리뷰어가 확인해야 할 내용이나 참고 사항을 작성합니다.
```

## 배포 기준

- 작업 브랜치에 push하는 것만으로는 공용 서버에 반영되지 않습니다.
- `dev`에 병합된 변경사항은 개발 환경에서 확인합니다.
- 충분히 검증된 변경사항만 `main`에 병합해 운영 환경에 반영합니다.
- 배포 후 GitHub Actions의 실행 결과와 실제 서비스 동작을 확인합니다.

## 완료 기준

- 요구사항에 맞는 기능 구현
- 예외 상황 처리
- 필요한 테스트 작성 및 로컬 테스트 통과
- 연동되는 파트에 변경사항 공유
- Pull Request 생성 및 리뷰 완료
- `dev` 병합 후 개발 환경 확인

## 백엔드 개발 안내

### 로컬 DB 실행

#### 준비 사항

- Docker Desktop 또는 Docker Engine
- Java 21

#### 실행 방법

프로젝트 루트에서 다음 명령을 실행합니다.

```bash
cd BE
cp .env.example .env
docker compose up -d
./gradlew bootRun
```

MySQL은 기본적으로 `localhost:3306`에서 실행되며 로컬 DB 이름은 `babi_order`입니다. 개인별 접속 정보와 Toss Secret Key는 `BE/.env`에서 변경하고, `.env` 파일은 Git에 커밋하지 않습니다.

#### 운영·개발 DB 분리

| 환경 | 브랜치 | EC2 환경변수 파일 | DB 이름 | Spring 프로파일 | API 포트 |
| --- | --- | --- | --- | --- | --- |
| 운영 | `main` | `/opt/babi-order/.env` | `babi_order` | `prod` | 8080 |
| 개발 | `dev` | `/opt/babi-order-dev/.env` | `babi_order_dev` | `dev` | 8081 |

백엔드 배포 워크플로는 환경에 따라 `DB_NAME`과 `SPRING_PROFILES_ACTIVE`를 지정합니다. 개발 DB가 없다면 MySQL에서 다음 스크립트를 한 번 실행합니다.

```bash
mysql -u root -p < BE/scripts/create-dev-database.sql
```

EC2 개발 환경의 `/opt/babi-order-dev/.env`에는 `DB_NAME=babi_order_dev`를 설정해야 합니다. 개발 환경이 운영 DB인 `babi_order`를 사용하도록 설정되어 있으면 배포가 중단됩니다.

#### 종료 방법

```bash
cd BE
docker compose down
```

DB 데이터까지 초기화해야 할 때만 다음 명령을 사용합니다.

```bash
cd BE
docker compose down -v
```

### 초기 메뉴 데이터

서비스에서 사용하는 메뉴와 토핑의 초기 데이터는 `BE/scripts/initial-menu-data.sql`에 정의되어 있습니다.

#### 데이터 구성

- 카테고리: 컵밥, 우동, 세트, 음료수
- 메뉴: 총 45개
- 토핑: 총 6종
- 토핑별 최대 선택 수량: 3개

#### 토핑 적용 기준

- 컵밥 메뉴에 토핑을 적용합니다.
- 세트 메뉴는 세트에 포함된 컵밥에 토핑을 적용합니다.
- 우동과 음료 메뉴에는 토핑을 적용하지 않습니다.
- 메뉴 이미지와 설명은 자료가 확정되기 전까지 비워둡니다.

#### 초기 데이터 관리 규칙

- 초기 데이터 SQL은 중복 삽입을 방지하도록 유지합니다.
- 주문 및 결제 데이터는 초기 데이터에 포함하지 않습니다.
- 메뉴, 가격 또는 토핑 정보가 변경되면 초기 데이터 SQL도 함께 수정합니다.

## 프론트엔드 로컬 실행

```bash
cd FE
npm install
npm run dev
```

- 학생용 화면: `http://localhost:5173/user`
- 관리자용 화면: `http://localhost:5173/admin`
- 로그인 화면: `http://localhost:5173/login`

API 서버 주소를 변경하려면 다음과 같이 실행합니다.

```bash
VITE_API_BASE_URL=http://localhost:8080 npm run dev
```

## 주요 API 예시

### 메뉴 목록

```http
GET /api/menus
```

```json
[
  {
    "categoryId": 1,
    "categoryName": "컵밥",
    "menus": [
      {
        "id": 1,
        "name": "제육 컵밥",
        "basePrice": 5500,
        "saleStatus": "AVAILABLE"
      }
    ]
  }
]
```

### 장바구니

장바구니는 프론트엔드에서 관리하며 주문 시 선택한 메뉴와 옵션을 주문 생성 API로 전달합니다.

### 주문 생성

```http
POST /api/orders
Content-Type: application/json
```

```json
{
  "items": [
    {
      "menuId": 1,
      "quantity": 1,
      "options": [
        { "menuOptionId": 2, "quantity": 1 }
      ]
    }
  ]
}
```

### 관리자 주문 조회 및 상태 변경

```http
GET /api/orders
PATCH /api/orders/1/status
Content-Type: application/json
```

```json
{ "status": "PREPARING" }
```

## API 안내

- 로컬 API 기본 주소: `http://localhost:8080`
- 자세한 요청·응답 형식과 에러 코드는 팀 Notion의 API 명세서를 확인합니다.

## 확장 및 개선 TODO

- DB 스키마 변경을 안전하게 관리할 수 있도록 Flyway 또는 Liquibase 도입을 검토합니다.
- Toss Payments 결제 승인, 취소 및 웹훅 처리의 운영 환경 검증을 강화합니다.
- SSE 연결 실패 시 사용하는 폴링과 실시간 주문 갱신 로직을 개선합니다.
- 관리자 인증·인가 정책과 보안 설정을 운영 기준에 맞게 강화합니다.
- QR 또는 기기별 장바구니와 주문 흐름을 검증하고 필요한 식별 정책을 보완합니다.
