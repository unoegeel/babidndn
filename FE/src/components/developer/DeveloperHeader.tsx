import { useNavigate } from "react-router-dom";
import { signOutAdmin } from "../../constants/adminAccount";
import { DEV_LABELS } from "../../constants/developerLabels";

export default function DeveloperHeader() {
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOutAdmin();
    navigate("/login", { replace: true });
  };

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-white/10 bg-[#12151d] px-4 py-3 md:px-6">
      <div>
        <h1 className="text-sm font-semibold text-gray-100">{DEV_LABELS.consoleTitle}</h1>
        <p className="text-xs text-gray-500">{DEV_LABELS.consoleSubtitle}</p>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
      >
        로그아웃
      </button>
    </header>
  );
}
