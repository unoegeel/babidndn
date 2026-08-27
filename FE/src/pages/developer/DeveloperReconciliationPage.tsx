import { useCallback, useEffect, useState } from "react";
import DeveloperShell from "../../components/developer/DeveloperShell";
import { DEV_LABELS } from "../../constants/developerLabels";
import { developerReconciliationService } from "../../services/developer/reconciliationService";
import type {
  PaymentTossVerifyResponse,
  PersistedReconciliationIssue,
  ReconciliationIssue,
  ReconciliationIssueStatus,
  ReconciliationScanResponse,
} from "../../types/api";

type ReconciliationPeriod = "1d" | "7d" | "30d";

const ISSUE_TYPE_LABEL: Record<
  ReconciliationIssue["type"],
  { primary: string; secondary: string }
> = {
  PAYMENT_DONE_ORDER_NOT_ACTIVATED: {
    primary: "결제 완료 · 주문 미활성화",
    secondary: "PAYMENT_DONE_ORDER_NOT_ACTIVATED",
  },
  ORDER_ACTIVATED_WITHOUT_VALID_PAYMENT: {
    primary: "유효 결제 없이 주문 활성화 (폐기 규칙)",
    secondary: "ORDER_ACTIVATED_WITHOUT_VALID_PAYMENT",
  },
  ORDER_ACTIVATED_WITHOUT_PAYMENT: {
    primary: "결제 없이 주문 활성화",
    secondary: "ORDER_ACTIVATED_WITHOUT_PAYMENT",
  },
  ORDER_ACTIVE_WITH_CANCELED_PAYMENT: {
    primary: "취소된 결제인데 주문 활성",
    secondary: "ORDER_ACTIVE_WITH_CANCELED_PAYMENT",
  },
  PAYMENT_AMOUNT_MISMATCH: {
    primary: "결제 금액 불일치",
    secondary: "PAYMENT_AMOUNT_MISMATCH",
  },
  MULTIPLE_VALID_PAYMENTS: {
    primary: "유효 결제 중복",
    secondary: "MULTIPLE_VALID_PAYMENTS",
  },
};

function formatWon(amount: number | null | undefined) {
  if (amount == null) return "-";
  return `${amount.toLocaleString("ko-KR")}원`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("ko-KR");
}

export default function DeveloperReconciliationPage() {
  const [period, setPeriod] = useState<ReconciliationPeriod>("7d");
  const [issueStatus, setIssueStatus] = useState<ReconciliationIssueStatus>("OPEN");
  const [issues, setIssues] = useState<PersistedReconciliationIssue[]>([]);
  const [scanSummary, setScanSummary] = useState<ReconciliationScanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanLoading, setScanLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyByPaymentId, setVerifyByPaymentId] = useState<
    Record<number, PaymentTossVerifyResponse | "loading" | "error">
  >({});

  const loadIssues = useCallback(
    async (nextPeriod: ReconciliationPeriod, status: ReconciliationIssueStatus) => {
      await Promise.resolve();
      setLoading(true);
      setError(null);
      try {
        const list = await developerReconciliationService.listIssues(status, nextPeriod);
        setIssues(list);
      } catch (err) {
        console.error(err);
        setError(
          status === "OPEN"
            ? "미해결 이슈 목록을 불러오지 못했습니다."
            : "해결된 이슈 목록을 불러오지 못했습니다.",
        );
        setIssues([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const runScan = async () => {
    setScanLoading(true);
    setError(null);
    try {
      const summary = await developerReconciliationService.scan(period);
      setScanSummary(summary);
      await loadIssues(period, issueStatus);
    } catch (err) {
      console.error(err);
      setError("스캔에 실패했습니다.");
    } finally {
      setScanLoading(false);
    }
  };

  const verifyToss = async (paymentId: number) => {
    setVerifyByPaymentId((prev) => ({ ...prev, [paymentId]: "loading" }));
    try {
      const result = await developerReconciliationService.verifyPayment(paymentId);
      setVerifyByPaymentId((prev) => ({ ...prev, [paymentId]: result }));
    } catch (err) {
      console.error(err);
      setVerifyByPaymentId((prev) => ({ ...prev, [paymentId]: "error" }));
    }
  };

  useEffect(() => {
    void (async () => {
      await Promise.resolve();
      await loadIssues(period, issueStatus);
    })();
  }, [loadIssues, period, issueStatus]);

  return (
    <DeveloperShell>
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">{DEV_LABELS.reconciliation}</h2>
            <p className="text-sm text-gray-500">
              주문·결제 DB 상태와 Toss 실상태를 대조합니다. 스캔은 수동 실행만 하며 자동
              환불·상태 변경은 하지 않습니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as ReconciliationPeriod)}
              className="h-9 rounded-md border border-gray-700 bg-gray-900 px-3 text-sm text-gray-100"
            >
              <option value="1d">1일</option>
              <option value="7d">7일</option>
              <option value="30d">30일</option>
            </select>
            <button
              type="button"
              disabled={scanLoading}
              onClick={() => void runScan()}
              className="h-9 rounded-md border border-gray-600 bg-gray-800 px-3 text-sm font-medium text-gray-100 disabled:opacity-50"
            >
              {scanLoading ? "스캔 중…" : "지금 검사"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIssueStatus("OPEN")}
            className={`rounded-md px-3 py-1.5 text-xs ${
              issueStatus === "OPEN"
                ? "bg-indigo-500/30 text-indigo-100"
                : "bg-white/5 text-gray-400"
            }`}
          >
            미해결 (OPEN)
          </button>
          <button
            type="button"
            onClick={() => setIssueStatus("RESOLVED")}
            className={`rounded-md px-3 py-1.5 text-xs ${
              issueStatus === "RESOLVED"
                ? "bg-indigo-500/30 text-indigo-100"
                : "bg-white/5 text-gray-400"
            }`}
          >
            해결됨 (RESOLVED)
          </button>
        </div>

        <div className="rounded-lg border border-gray-800 bg-gray-950/60 px-4 py-3">
          <p className="text-sm font-medium text-gray-200">
            {loading
              ? DEV_LABELS.loading
              : issueStatus === "OPEN"
                ? `정합성 미해결 ${issues.length}건`
                : `해결된 이슈 ${issues.length}건`}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            저장된 이슈만 표시합니다. 페이지 진입만으로 스캔을 실행하지 않습니다.
          </p>
          {scanSummary && (
            <p className="mt-2 text-xs text-gray-400">
              최근 스캔 ({scanSummary.period}): 탐지 {scanSummary.detectedCount} · 생성{" "}
              {scanSummary.createdCount} · 갱신 {scanSummary.updatedCount} · 해결{" "}
              {scanSummary.resolvedCount} · 미해결 {scanSummary.openCount}
            </p>
          )}
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>

        <ul className="space-y-3">
          {!loading && issues.length === 0 && (
            <li className="rounded-lg border border-gray-800 px-4 py-8 text-center text-sm text-gray-500">
              {DEV_LABELS.noData}
            </li>
          )}
          {issues.map((issue) => {
            const typeLabel = ISSUE_TYPE_LABEL[issue.type] ?? {
              primary: issue.type,
              secondary: issue.type,
            };
            const verifyState =
              issue.paymentId != null ? verifyByPaymentId[issue.paymentId] : undefined;
            return (
              <li
                key={issue.id}
                className="rounded-lg border border-gray-800 bg-gray-950/40 px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                      issue.severity === "CRITICAL"
                        ? "bg-red-950 text-red-300"
                        : "bg-amber-950 text-amber-300"
                    }`}
                  >
                    {issue.severity}
                  </span>
                  <span className="rounded bg-gray-800 px-2 py-0.5 text-[11px] text-gray-300">
                    {issue.status === "OPEN" ? "미해결" : "해결됨"}
                  </span>
                  <span className="text-xs font-medium text-gray-200">{typeLabel.primary}</span>
                </div>
                <p className="mt-1 font-mono text-[10px] text-gray-600">{typeLabel.secondary}</p>
                <p className="mt-2 text-gray-300">{issue.message}</p>
                <p className="mt-1 font-mono text-xs text-gray-500">
                  주문 #{issue.orderId}
                  {issue.paymentId != null ? ` / 결제 #${issue.paymentId}` : ""} · 발생{" "}
                  {issue.occurrenceCount}회
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  최초 {formatDateTime(issue.firstDetectedAt)} · 최근{" "}
                  {formatDateTime(issue.lastDetectedAt)}
                  {issue.resolvedAt ? ` · 해결 ${formatDateTime(issue.resolvedAt)}` : ""}
                </p>
                {issue.paymentId != null && (
                  <div className="mt-3">
                    <button
                      type="button"
                      disabled={verifyState === "loading"}
                      onClick={() => void verifyToss(issue.paymentId!)}
                      className="h-8 rounded-md border border-gray-700 bg-gray-900 px-3 text-xs text-gray-200 disabled:opacity-50"
                    >
                      {verifyState === "loading" ? "Toss 확인 중…" : "Toss에서 다시 확인"}
                    </button>
                    {verifyState === "error" && (
                      <p className="mt-2 text-xs text-red-400">
                        Toss 조회 실패 (결제·주문·이슈는 변경되지 않음)
                      </p>
                    )}
                    {verifyState && verifyState !== "loading" && verifyState !== "error" && (
                      <div className="mt-2 rounded-md border border-gray-800 bg-gray-900/80 px-3 py-2 text-xs text-gray-300">
                        <p className="font-medium text-gray-200">Toss 확인 결과 (진단 전용)</p>
                        <p className="mt-1">
                          내부 {verifyState.internalStatus} / Toss {verifyState.tossStatus} —{" "}
                          {verifyState.statusMatches ? "상태 일치" : "상태 불일치"}
                        </p>
                        <p className="mt-0.5">
                          내부 {formatWon(verifyState.internalAmount)} / Toss{" "}
                          {formatWon(verifyState.tossAmount)} —{" "}
                          {verifyState.amountMatches ? "금액 일치" : "금액 불일치"}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </DeveloperShell>
  );
}
