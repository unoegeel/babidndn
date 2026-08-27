/** Developer Console UI labels (한국어) */

export const DEV_LABELS = {
  consoleTitle: "개발자 콘솔",
  consoleSubtitle: "개요 · 분석 · 이벤트 · 요청 · 오류 · 정합성",
  observability: "운영 관측",

  overview: "개요",
  analytics: "분석",
  errors: "오류",
  requests: "요청",
  reconciliation: "결제 정합성",
  events: "사용자 이벤트",

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
  noAnalyticsData: "분석 데이터 없음",
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

  errorMonitoring: "오류",
  errorDetail: "오류 상세",
  requestMonitoring: "요청",
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

  /** Metric help (한 번만 노출하는 짧은 설명) */
  processingTimeHelp:
    "결제 완료 후 매장 대기열 진입부터 최초 고객 호출까지 걸린 시간",
  paidOrdersHelp: "실제 결제가 완료된 주문",
  paymentProgressSuccessRate: "결제 진행 성공률",
  paymentProgressSuccessRateHelp:
    "결제 진행을 시작한 사용자 행동 중 결제 성공 이벤트까지 도달한 비율",
  sequentialFunnelHelp:
    "메뉴 조회 → 장바구니 → 주문 확인 → 결제 단계를 실제 순서대로 진행한 세션",
  aggregateFunnelHelp: "기간 내 각 단계를 한 번 이상 수행한 고유 사용자(비순차)",

  pageOf: (page: number, total: number) => `${page} / ${total} 페이지`,
  totalErrors: (n: number) => `${n}건`,
  totalRequests: (n: number) => `${n}건`,
  totalEvents: (n: number) => `${n}건`,
} as const;

export function sourceLabelKo(source: "FRONTEND" | "BACKEND"): string {
  return source === "FRONTEND" ? DEV_LABELS.frontend : DEV_LABELS.backend;
}

/** Funnel step primary labels (ClientEventType → 한국어) */
export const FUNNEL_STEP_LABELS: Record<string, string> = {
  MENU_VIEW: "메뉴 조회",
  ADD_TO_CART: "장바구니 추가",
  CHECKOUT_VIEW: "주문 확인",
  PAYMENT_START: "결제 진행",
};

export function funnelStepLabelKo(eventType: string, fallback?: string): string {
  return FUNNEL_STEP_LABELS[eventType] ?? fallback ?? eventType;
}
