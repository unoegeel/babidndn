import { NavLink, useLocation } from "react-router-dom";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [{ to: "/dev", label: "Overview", end: true }],
  },
  {
    title: "Monitoring",
    items: [
      { to: "/dev/errors", label: "Errors" },
      { to: "/dev/requests", label: "Requests" },
    ],
  },
  {
    title: "Analytics",
    items: [
      { to: "/dev/events", label: "Events" },
      { to: "/dev/analytics", label: "Funnel / Analytics" },
    ],
  },
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
          Developer Console
        </p>
        <p className="mt-1 text-xs text-gray-500">Observability</p>
      </div>

      <nav className="flex flex-1 flex-col gap-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              {section.title}
            </p>
            <div className="flex flex-col gap-1">
              {section.items.map((item) => {
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
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
