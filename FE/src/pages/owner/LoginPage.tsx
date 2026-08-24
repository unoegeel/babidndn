import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../../components/BrandLogo";
import { signInAdmin } from "../../constants/adminAccount";
import { authService } from "../../services/admin/authService";
import { ApiError } from "../../api/client";
import {
  LOGIN_RATE_LIMIT_GENERIC_MESSAGE,
  clearLoginBlockedUntil,
  formatLoginRetryMessage,
  readLoginBlockedUntil,
  remainingSecondsUntil,
  writeLoginBlockedUntil,
} from "../../utils/loginRateLimit";

export default function LoginPage() {
  const navigate = useNavigate();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(() => readLoginBlockedUntil());
  const [nowMs, setNowMs] = useState(() => Date.now());

  const remainingSeconds =
    blockedUntil != null ? remainingSecondsUntil(blockedUntil, nowMs) : 0;
  const isRateLimited = remainingSeconds > 0;
  const rateLimitMessage = isRateLimited ? formatLoginRetryMessage(remainingSeconds) : null;
  const error = rateLimitMessage ?? formError;

  useEffect(() => {
    if (blockedUntil == null) {
      return;
    }

    const timerId = window.setInterval(() => {
      const current = Date.now();
      setNowMs(current);
      if (remainingSecondsUntil(blockedUntil, current) <= 0) {
        clearLoginBlockedUntil();
        setBlockedUntil(null);
      }
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [blockedUntil]);

  const applyBlockedUntil = (untilMs: number) => {
    writeLoginBlockedUntil(untilMs);
    setFormError(null);
    setBlockedUntil(untilMs);
    setNowMs(Date.now());
  };

  // 서버 관리자 계정으로 로그인 — POST /api/admin/auth/login
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || isRateLimited) return;

    try {
      setSubmitting(true);
      setFormError(null);
      const { accessToken, role } = await authService.login({
        loginId: id.trim(),
        password: pw,
      });
      clearLoginBlockedUntil();
      setBlockedUntil(null);
      signInAdmin(accessToken);
      navigate(role === "DEVELOPER" ? "/dev" : "/admin/orders", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        const retryAfter = err.retryAfterSeconds;
        if (retryAfter != null) {
          applyBlockedUntil(Date.now() + retryAfter * 1000);
        } else {
          setFormError(err.message || LOGIN_RATE_LIMIT_GENERIC_MESSAGE);
        }
      } else if (err instanceof ApiError && (err.status === 401 || err.status === 400)) {
        setFormError("아이디 또는 비밀번호가 올바르지 않습니다.");
      } else {
        console.error("로그인 실패:", err);
        setFormError("로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-8">
      <form onSubmit={handleSubmit} className="w-full max-w-[460px]" autoComplete="on">
        <h1 className="mb-[40px] text-center text-[32px] font-medium tracking-wide text-black">
          로그인
        </h1>

        <label className="mb-[6px] block text-[16px] font-medium text-black" htmlFor="admin-login-id">
          아이디
        </label>
        <input
          id="admin-login-id"
          name="username"
          autoComplete="username"
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={id}
          onChange={(e) => setId(e.target.value)}
          disabled={isRateLimited}
          className="mb-[24px] h-[48px] w-full rounded-[10px] border border-black/50 bg-canvas px-[16px] text-[16px] outline-none focus:border-black disabled:opacity-60"
        />

        <label className="mb-[6px] block text-[16px] font-medium text-black" htmlFor="admin-login-password">
          비밀번호
        </label>
        <input
          id="admin-login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          disabled={isRateLimited}
          className="h-[48px] w-full rounded-[10px] border border-black/50 bg-canvas px-[16px] text-[16px] outline-none focus:border-black disabled:opacity-60"
        />

        {error ? (
          <p className="mt-[10px] mb-[18px] whitespace-pre-line text-[14px] font-medium tracking-[0.5px] text-danger">
            {error}
          </p>
        ) : (
          <div className="mb-[28px]" />
        )}

        <button
          type="submit"
          disabled={submitting || isRateLimited}
          className="h-[48px] w-full rounded-[10px] text-[16px] font-medium text-canvas disabled:opacity-60"
          style={{ backgroundColor: "rgba(189,146,59,0.75)" }}
        >
          {submitting ? "로그인 중..." : isRateLimited ? "잠시 후 다시 시도" : "로그인"}
        </button>

        <p className="mt-[36px] text-center text-[16px] font-medium">
          <span className="text-black/50">계정이 없습니까?</span>
          {"   "}
          <button
            type="button"
            onClick={() => navigate("/signup")}
            className="text-black hover:underline"
          >
            가입
          </button>
        </p>
        <p className="mt-[12px] text-center text-[16px] font-medium text-black">
          계정에 문제가 있습니까?
        </p>
      </form>

      <div className="mt-[48px]">
        <BrandLogo width={150} />
      </div>
    </div>
  );
}
