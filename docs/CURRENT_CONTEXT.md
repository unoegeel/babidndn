# BabiOrder — Current Context

> **기준일: 2026-08-28**
> 구조: [ARCHITECTURE.md](ARCHITECTURE.md) · 실행: [README.md](../README.md)

---

## 1. Deployment Snapshot

| | Git `main` | Git `dev` |
|--|------------|-----------|
| **최신 commit** | `bcfb169` — v1.2.25 | `d3a9a42` — recent orders v2 (+1 vs main) |
| **BE** | prod `babi-order` | dev `babi-order-dev` |
| **FE** | Vercel prod | Vercel dev |

### API base (application-facing)

| 환경 | FE | API base (FE가 사용) |
|------|-----|----------------------|
| **Prod** | `www.babidndn.shop` | `https://babidndn.shop` |
| **Dev** | `dev.babidndn.shop` | `https://dev-api.babidndn.shop` |

`api.babidndn.shop` — Cloudflare/Nginx production alias로 존재 · 동일 backend origin · **현재 FE 코드에서는 미사용**

### Verification labels

| Label | 의미 |
|-------|------|
| **IMPLEMENTED** | 코드 merge됨 |
| **TESTED** | repo test/lint/build 통과 |
| **DEV RUNTIME VERIFIED** | dev 환경 실제 동작 확인 |
| **PROD RUNTIME VERIFIED** | prod 환경 실제 동작 확인 |
| **PENDING** | 배포 또는 smoke 미완료 |

---

## 2. Test State (repo)

| Command | Result |
|---------|--------|
| `cd BE && ./gradlew test` | PASS (로컬) |
| `cd FE && npm test` | 66 passed |
| `cd FE && npm run lint` | 0 errors |
| `cd FE && npm run build` | PASS |

---

## 3. Recently Completed (`main`)

| 영역 | 상태 |
|------|------|
| Developer Analytics v1 | IMPLEMENTED · TESTED · **PROD RUNTIME VERIFIED** |
| Observability semantics (404, SSE timeout, actionable KPI) | IMPLEMENTED · TESTED on main |
| Order queue/pickup hotfix (V102/V103) | **PROD RUNTIME VERIFIED** |
| API rate limiting | IMPLEMENTED · TESTED · deploy smoke **PENDING** |
| Payment reconciliation (Dev exposure) | IMPLEMENTED · dev MySQL verified · prod smoke **PENDING** |

상세 구조: [ARCHITECTURE.md](ARCHITECTURE.md)

---

## 4. Recent Orders Stale Invalidation (`dev` only)

commit `d3a9a42` — `main` 미반영

| 단계 | 상태 |
|------|------|
| IMPLEMENTED | `dev` branch |
| TESTED | FE 66 pass · lint 0 · build OK |
| DEV RUNTIME VERIFIED | **PENDING** |
| PROD RUNTIME VERIFIED | **PENDING** |

구현: `userOrdersStorage.ts` v2 migration · `ORDER_NOT_FOUND` stale cleanup · `OrderHistoryPage` 서버 검증

---

## 5. Operational History

### PROD data baseline reset

Business + observability transaction 테이블 0건 초기화 완료. menus/admins 등 기준 데이터 유지.

### Cloudflare

**Done:** NS 전환 · `babidndn.shop` / `dev-api.babidndn.shop` / `api.babidndn.shop` proxied · www/dev Vercel DNS-only · Full (strict) · Nginx real client IP · Cloudflare CIDR SG allow · SSH 22 world-open 제거 (관리자 IP `/32`) · prod/dev API + SSE runtime verified

**Pending — origin lock:** 일부 ISP old NS cache · SG `80/443` `0.0.0.0/0` 제거 보류 · final verification 필요 (repo에서 현재 SG/DNS 상태 확인 불가)

### EC2 disk (2026-08, 일회성)

ECR image 누적 → `docker image prune -a --filter until=168h` → disk ~98%→~43% · running container 유지

**Pending:** unused image cleanup automation · Docker localhost binding hardening (origin lock 이후)

---

## 6. Known Gaps

Fresh MySQL bootstrap · rate limit / reconciliation smoke · customer ACL 전면 smoke · Cart 메모리 only · Analytics `from > to` nginx log (investigate only, 미재현)

---

## 7. Pending / Next Actions

1. **Recent orders** — dev deploy → DEV RUNTIME VERIFIED → merge main → prod deploy → PROD RUNTIME VERIFIED
2. **Cloudflare origin lock** — DNS propagation · SG world-open 제거 · direct origin 차단 smoke
3. **Docker cleanup automation**
4. **Container port hardening** (`127.0.0.1` binding, origin lock 이후)
5. **Rolling smokes** — rate limit · reconciliation · customer ACL E2E

---

## 8. Update Policy

prod/dev deploy 전환 · 운영 조치 · critical fix · branch 차이 발생 시 갱신.
장기 구조는 ARCHITECTURE, 규칙은 CONVENTIONS로 이동한다.
