import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import BrandLogo from "../../components/BrandLogo";

export default function SignupPage() {
  const navigate = useNavigate();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");

  // 회원가입 API 미제공 — 가입 후 로그인 화면으로 이동 (UI 전용)
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate("/login");
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-8">
      <form onSubmit={handleSubmit} className="w-full max-w-[460px]">
        <h1 className="mb-[40px] text-center text-[32px] font-medium tracking-[2px] text-black">
          회원가입
        </h1>

        <label className="mb-[6px] block text-[16px] font-medium tracking-[1px] text-black">
          아이디
        </label>
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="mb-[24px] h-[48px] w-full rounded-[10px] border border-black/50 bg-canvas px-[16px] text-[16px] outline-none focus:border-black"
        />

        <label className="mb-[6px] block text-[16px] font-medium tracking-[1px] text-black">
          비밀번호
        </label>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="mb-[28px] h-[48px] w-full rounded-[10px] border border-black/50 bg-canvas px-[16px] text-[16px] outline-none focus:border-black"
        />

        <button
          type="submit"
          className="h-[48px] w-full rounded-[10px] text-[16px] font-medium tracking-[1px] text-canvas"
          style={{ backgroundColor: "rgba(189,146,59,0.75)" }}
        >
          가입
        </button>

        <p className="mt-[36px] text-center text-[16px] font-medium tracking-[1px]">
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
