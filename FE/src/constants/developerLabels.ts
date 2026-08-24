/** Developer Console UI labels (한국어) */

export const DEV_LABELS = {
  consoleTitle: "개발자 콘솔",
  consoleSubtitle: "오류 · 요청 · 이벤트 · 정합성 · 분석",
  observability: "운영 관측",

  overview: "개요",
  monitoring: "모니터링",
  analytics: "분석",
  errors: "오류",
  requests: "요청",
  reconciliation: "결제 정합성",
  events: "사용자 이벤트",
  funnelAnalytics: "주문 퍼널 / 분석",

  search: "검색",
  filter: "필터",
  apply: "적용",
  refresh: "새로고침",
  previous: "이전",
  next: "다음",
  close: "닫기",
  copy: "복사",
  copied: "복사됨",
  loading: "불러오는 중...",
  noData: "데이터 없음",
  notFound: "찾을 수 없음",

  ready: "준비됨",
  planned: "연결 예정",
  inProgress: "준비 중",

  time: "시간",
  timestamp: "발생 시간",
  source: "발생 위치",
  status: "상태",
  route: "경로",
  path: "경로",
  method: "메서드",
  error: "오류",
  requestId: "요청 ID",
  relatedRequestId: "관련 요청 ID",
  duration: "처리 시간",
  browser: "브라우저",
  message: "메시지",
  stackTrace: "스택 트레이스",
  detail: "상세",
  viewRequest: "요청 보기",

  allSources: "전체",
  frontend: "프론트엔드",
  backend: "백엔드",

  errorMonitoring: "오류 모니터링",
  errorDetail: "오류 상세",
  requestMonitoring: "요청 모니터링",
  requestDetail: "요청 상세",
  eventMonitoring: "사용자 이벤트",
  eventDetail: "사용자 이벤트 상세",
  eventType: "이벤트",
  eventId: "이벤트 ID",
  anonymousId: "익명 사용자 ID",
  sessionId: "세션 ID",
  metadata: "메타데이터",
  viewRelatedRequest: "관련 요청 보기",
  allEventTypes: "전체 이벤트",

  pageOf: (page: number, total: number) => `${page} / ${total} 페이지`,
  totalErrors: (n: number) => `${n}건`,
  totalRequests: (n: number) => `${n}건`,
  totalEvents: (n: number) => `${n}건`,
} as const;

export function sourceLabelKo(source: "FRONTEND" | "BACKEND"): string {
  return source === "FRONTEND" ? DEV_LABELS.frontend : DEV_LABELS.backend;
}
