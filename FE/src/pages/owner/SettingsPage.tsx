import { useNavigate } from "react-router-dom";
import AdminShell from "../../components/AdminShell";
import { signOutAdmin } from "../../constants/adminAccount";

/** 계정·앱 설정 (사이드바 하단 설정 진입) */
export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <AdminShell>
      <div className="p-[20px] md:p-[32px]">
        <h1 className="text-[24px] font-bold text-black">설정</h1>
        <p className="mt-[12px] text-[15px] text-black/60">
          계정 및 앱 설정 화면입니다.
        </p>

        <div className="mt-[32px] max-w-[520px] space-y-[16px]">
          <div className="rounded-[25px] border border-black/50 bg-canvas p-[24px]">
            <h2 className="text-[18px] font-medium tracking-[1px] text-black">
              계정
            </h2>
            <p className="mt-[8px] text-[14px] leading-relaxed text-black/60">
              관리자 계정에서 로그아웃합니다.
            </p>
            <button
              type="button"
              onClick={() => {
                signOutAdmin();
                navigate("/login", { replace: true });
              }}
              className="mt-[16px] h-[48px] rounded-[10px] border border-danger bg-canvas px-[20px] text-[15px] font-medium tracking-[1px] text-danger"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
