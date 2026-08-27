import { NavLink, useLocation } from "react-router-dom";
import { DEV_LABELS } from "../../constants/developerLabels";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

/** Flat IA: 개요 → 분석 → 진단 */
const NAV_ITEMS: NavItem[] = [
  { to: "/dev", label: DEV_LABELS.overview, end: true },
  { to: "/dev/analytics", label: DEV_LABELS.analytics },
  { to: "/dev/events", label: DEV_LABELS.events },
  { to: "/dev/requests", label: DEV_LABELS.requests },
  { to: "/dev/errors", label: DEV_LABELS.errors },
  { to: "/dev/reconciliation", label: DEV_LABELS.reconciliation },
];

function isActivePath(to: string, pathname: string, end?: boolean): boolean {
  if (end) {
    return pathname === to;
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

export default function DeveloperSidebar() {
  const { pathname } = useLocation();

  return (
    <aside
      className="flex w-[200px] shrink-0 flex-col border-r border-white/10 bg-[#12151d] px-3 py-4 md:w-[240px]"
      style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="mb-6 px-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-300/80">
          {DEV_LABELS.consoleTitle}
        </p>
        <p className="mt-1 text-xs text-gray-500">{DEV_LABELS.observability}</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(item.to, pathname, item.end);
          return (
            <NavLink key={item.to} to={item.to} end={item.end} className="block">
              <span
                className={`block rounded-md px-2 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-indigo-500/15 font-medium text-indigo-200"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                }`}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
