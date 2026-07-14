# 바비든든 스마트 오더

한국외국어대학교 글로벌캠퍼스 후생관 컵밥 전문점 **바비든든**을 위한 QR 기반 스마트 오더 MVP입니다. 현재 1차 목표인 메뉴 조회, 장바구니, 주문 생성, 관리자 주문 확인/상태 변경이 동작합니다.

## 구조

```text
backend/   Spring Boot + Spring Security + JPA
frontend/  React + TypeScript + Vite + Tailwind CSS
```

## 로컬 실행

### 백엔드

기본값은 H2 인메모리 DB라 별도 DB 없이 실행됩니다.

```bash
cd backend
mvn spring-boot:run
```

MySQL을 사용할 때는 환경변수를 지정합니다.

```bash
export DB_URL='jdbc:mysql://localhost:3306/babidndn?serverTimezone=Asia/Seoul&characterEncoding=UTF-8'
export DB_USERNAME='babidndn'
export DB_PASSWORD='password'
export DB_DRIVER='com.mysql.cj.jdbc.Driver'
cd backend && mvn spring-boot:run
```

JPA `ddl-auto: update`가 개발용 스키마를 자동 반영합니다. 운영 배포 전에는 Flyway/Liquibase 마이그레이션으로 전환하는 것을 권장합니다.

### 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

- 학생용: <http://localhost:5173>
- 관리자용: <http://localhost:5173/admin>
- API 서버 주소 변경: `VITE_API_BASE_URL=http://localhost:8080 npm run dev`

## 주요 API 예시

### 메뉴 목록

```http
GET /api/menus
```

```json
[
  { "id": 1, "name": "제육 컵밥", "price": 5500, "category": { "id": 1, "name": "기본 컵밥" }, "soldOut": false }
]
```

### 장바구니 추가

```http
POST /api/cart
Content-Type: application/json
```

```json
{ "menuId": 1, "quantity": 1, "optionSummary": "스팸 추가", "optionPrice": 1500 }
```

### 주문 생성

현재 MVP는 서버 장바구니 전체를 주문으로 변환하고 장바구니를 비웁니다.

```http
POST /api/orders
```

```json
{
  "id": 1,
  "orderNumber": "BBD-0714123000",
  "status": "ORDERED",
  "totalAmount": 7000,
  "items": [{ "menuName": "제육 컵밥", "quantity": 1 }]
}
```

### 관리자 주문 조회 / 상태 변경

```http
GET /api/admin/orders
PATCH /api/admin/orders/1
Content-Type: application/json
```

```json
{ "status": "COOKING" }
```

## 확장 TODO

- Toss Payments: `PaymentGateway` 인터페이스와 `TossPaymentGateway` 구현체에 결제 요청/승인/웹훅 검증 로직 추가
- WebSocket: 현재 관리자 화면은 5초 폴링이며, 주문 상태 브로드캐스트용 STOMP 설정과 프론트 구독으로 교체
- 인증/인가: MVP에서는 모든 API를 허용하며, 관리자 로그인과 Spring Security 권한 분리는 운영 전 필수
- 장바구니 세션: 현재는 MVP 검증용 서버 공용 장바구니이며, QR/기기별 세션 또는 익명 토큰 기반 장바구니로 분리 필요
