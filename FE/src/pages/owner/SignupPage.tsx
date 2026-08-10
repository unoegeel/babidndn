import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../../components/BrandLogo";
import { ApiError } from "../../api/client";
import { signInAdmin } from "../../constants/adminAccount";
import { authService } from "../../services/admin/authService";

export default function SignupPage() {
  const navigate = useNavigate();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const loginId = id.trim();
    if (!loginId) {
      setError("아이디를 입력해 주세요.");
      return;
    }
    if (pw.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (pw !== passwordConfirmation) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const { accessToken } = await authService.signup({
        loginId,
        password: pw,
      });
      signInAdmin(accessToken);
      navigate("/admin/orders", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 409 ? "이미 사용 중인 아이디입니다." : err.message);
      } else {
        console.error("회원가입 실패:", err);
        setError("회원가입 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-8">
      <form onSubmit={handleSubmit} className="w-full max-w-[460px]" autoComplete="on">
        <h1 className="mb-[40px] text-center text-[32px] font-medium tracking-wide text-black">
          회원가입
        </h1>

        <label className="mb-[6px] block text-[16px] font-medium text-black" htmlFor="admin-signup-id">
          아이디
        </label>
        <input
          id="admin-signup-id"
          name="username"
          autoComplete="username"
          inputMode="text"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="mb-[24px] h-[48px] w-full rounded-[10px] border border-black/50 bg-canvas px-[16px] text-[16px] outline-none focus:border-black"
        />

        <label className="mb-[6px] block text-[16px] font-medium text-black" htmlFor="admin-signup-password">
          비밀번호
        </label>
        <input
          id="admin-signup-password"
          name="new-password"
          required
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="mb-[24px] h-[48px] w-full rounded-[10px] border border-black/50 bg-canvas px-[16px] text-[16px] outline-none focus:border-black"
        />

        <label className="mb-[6px] block text-[16px] font-medium text-black" htmlFor="admin-signup-password-confirm">
          비밀번호 확인
        </label>
        <input
          id="admin-signup-password-confirm"
          name="new-password-confirm"
          required
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={passwordConfirmation}
          onChange={(e) => setPasswordConfirmation(e.target.value)}
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
          {submitting ? "가입 중..." : "가입"}
        </button>

        <p className="mt-[36px] text-center text-[16px] font-medium">
          <span className="text-black/50">계정이 이미 있습니까?</span>
          {"   "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-black hover:underline"
          >
            로그인
          </button>
        </p>
      </form>

      <div className="mt-[48px]">
        <BrandLogo width={150} />
      </div>
    </div>
  );
}
