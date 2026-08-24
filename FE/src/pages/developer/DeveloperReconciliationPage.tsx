import { useCallback, useEffect, useState } from "react";
import DeveloperShell from "../../components/developer/DeveloperShell";
import { DEV_LABELS } from "../../constants/developerLabels";
import { developerReconciliationService } from "../../services/developer/reconciliationService";
import type {
  PaymentTossVerifyResponse,
  PersistedReconciliationIssue,
  ReconciliationIssue,
  ReconciliationScanResponse,
} from "../../types/api";

type ReconciliationPeriod = "1d" | "7d" | "30d";

const ISSUE_TYPE_LABEL: Record<ReconciliationIssue["type"], string> = {
  PAYMENT_DONE_ORDER_NOT_ACTIVATED: "PAYMENT_DONE_ORDER_NOT_ACTIVATED",
  ORDER_ACTIVATED_WITHOUT_VALID_PAYMENT: "ORDER_ACTIVATED_WITHOUT_VALID_PAYMENT (deprecated)",
  ORDER_ACTIVATED_WITHOUT_PAYMENT: "ORDER_ACTIVATED_WITHOUT_PAYMENT",
  ORDER_ACTIVE_WITH_CANCELED_PAYMENT: "ORDER_ACTIVE_WITH_CANCELED_PAYMENT",
  PAYMENT_AMOUNT_MISMATCH: "PAYMENT_AMOUNT_MISMATCH",
  MULTIPLE_VALID_PAYMENTS: "MULTIPLE_VALID_PAYMENTS",
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
  const [openIssues, setOpenIssues] = useState<PersistedReconciliationIssue[]>([]);
  const [scanSummary, setScanSummary] = useState<ReconciliationScanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanLoading, setScanLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyByPaymentId, setVerifyByPaymentId] = useState<
    Record<number, PaymentTossVerifyResponse | "loading" | "error">
  >({});

  const loadOpenIssues = useCallback(async (nextPeriod: ReconciliationPeriod) => {
    await Promise.resolve();
    setLoading(true);
    setError(null);
    try {
      const issues = await developerReconciliationService.listIssues("OPEN", nextPeriod);
      setOpenIssues(issues);
    } catch (err) {
      console.error(err);
      setError("OPEN issue 목록을 불러오지 못했습니다.");
      setOpenIssues([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const runScan = async () => {
    setScanLoading(true);
    setError(null);
    try {
      const summary = await developerReconciliationService.scan(period);
      setScanSummary(summary);
      await loadOpenIssues(period);
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
      await loadOpenIssues(period);
    })();
  }, [loadOpenIssues, period]);

  return (
    <DeveloperShell>
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">{DEV_LABELS.reconciliation}</h2>
            <p className="text-sm text-gray-500">
              Order↔Payment DB consistency · Toss remote diagnostics (read-only). Scan은 수동 실행만.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as ReconciliationPeriod)}
              className="h-9 rounded-md border border-gray-700 bg-gray-900 px-3 text-sm text-gray-100"
            >
              <option value="1d">1d</option>
              <option value="7d">7d</option>
              <option value="30d">30d</option>
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

        <div className="rounded-lg border border-gray-800 bg-gray-950/60 px-4 py-3">
          <p className="text-sm font-medium text-gray-200">
            {loading ? DEV_LABELS.loading : `현재 OPEN issue ${openIssues.length}건`}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Persisted incidents만 표시합니다. 페이지 진입만으로 scan을 실행하지 않습니다. 자동 환불·상태
            변경 없음.
          </p>
          {scanSummary && (
            <p className="mt-2 text-xs text-gray-400">
              최근 스캔 ({scanSummary.period}): detected {scanSummary.detectedCount} · created{" "}
              {scanSummary.createdCount} · updated {scanSummary.updatedCount} · resolved{" "}
              {scanSummary.resolvedCount} · openCount {scanSummary.openCount}
            </p>
          )}
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>

        <ul className="space-y-3">
          {!loading && openIssues.length === 0 && (
            <li className="rounded-lg border border-gray-800 px-4 py-8 text-center text-sm text-gray-500">
              {DEV_LABELS.noData}
            </li>
          )}
          {openIssues.map((issue) => {
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
                    {issue.status}
                  </span>
                  <span className="font-mono text-xs text-gray-200">
                    {ISSUE_TYPE_LABEL[issue.type] ?? issue.type}
                  </span>
                </div>
                <p className="mt-2 text-gray-300">{issue.message}</p>
                <p className="mt-1 font-mono text-xs text-gray-500">
                  Order #{issue.orderId}
                  {issue.paymentId != null ? ` / Payment #${issue.paymentId}` : ""} · occurrence{" "}
                  {issue.occurrenceCount}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  first {formatDateTime(issue.firstDetectedAt)} · last{" "}
                  {formatDateTime(issue.lastDetectedAt)}
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
                        Toss 조회 실패 (Payment/Order/Issue mutation 없음)
                      </p>
                    )}
                    {verifyState && verifyState !== "loading" && verifyState !== "error" && (
                      <div className="mt-2 rounded-md border border-gray-800 bg-gray-900/80 px-3 py-2 text-xs text-gray-300">
                        <p className="font-medium text-gray-200">
                          Toss verify result (diagnostics only · not repaired)
                        </p>
                        <p className="mt-1">
                          internal {verifyState.internalStatus} / toss {verifyState.tossStatus} —{" "}
                          {verifyState.statusMatches ? "status OK" : "status mismatch"}
                        </p>
                        <p className="mt-0.5">
                          internal {formatWon(verifyState.internalAmount)} / toss{" "}
                          {formatWon(verifyState.tossAmount)} —{" "}
                          {verifyState.amountMatches ? "amount OK" : "amount mismatch"}
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
