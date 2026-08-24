import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../../components/BrandLogo";
import { signInAdmin } from "../../constants/adminAccount";
import { authService } from "../../services/admin/authService";
import { ApiError } from "../../api/client";

export default function LoginPage() {
  const navigate = useNavigate();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 서버 관리자 계정으로 로그인 — POST /api/admin/auth/login
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setError(null);
      const { accessToken, role } = await authService.login({
        loginId: id.trim(),
        password: pw,
      });
      signInAdmin(accessToken);
      navigate(role === "DEVELOPER" ? "/dev" : "/admin/orders", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError(err.message || "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
      } else if (err instanceof ApiError && (err.status === 401 || err.status === 400)) {
        setError("아이디 또는 비밀번호가 올바르지 않습니다.");
      } else {
        console.error("로그인 실패:", err);
        setError("로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
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
          className="mb-[24px] h-[48px] w-full rounded-[10px] border border-black/50 bg-canvas px-[16px] text-[16px] outline-none focus:border-black"
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
          className="h-[48px] w-full rounded-[10px] border border-black/50 bg-canvas px-[16px] text-[16px] outline-none focus:border-black"
        />

        {error ? (
          <p className="mt-[10px] mb-[18px] text-[14px] font-medium tracking-[0.5px] text-danger">
            {error}
          </p>
        ) : (
          <div className="mb-[28px]" />
        )}

        <button
          type="submit"
          disabled={submitting}
          className="h-[48px] w-full rounded-[10px] text-[16px] font-medium text-canvas disabled:opacity-60"
          style={{ backgroundColor: "rgba(189,146,59,0.75)" }}
        >
          {submitting ? "로그인 중..." : "로그인"}
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
