import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const pad = (n: number) => String(n).padStart(2, "0");

const NAV = [
  { to: "/admin/orders", label: "주문 현황" },
  { to: "/admin/menus", label: "메뉴 관리" },
  { to: "/admin/payments", label: "결제 내역" },
  { to: "/admin/store", label: "매장 관리" },
  { to: "/admin/settings", label: "설정" },
];

interface AdminShellProps {
  /** 사이드바 상단 슬롯 (주문 현황 대시보드의 주문 상세 패널) */
  sidebarTop?: ReactNode;
  children: ReactNode;
}

function isAdminNavActive(to: string, pathname: string): boolean {
  if (to === "/admin/payments") {
    return pathname === "/admin/payments" || pathname === "/admin/sales";
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

/** 관리자 공통 레이아웃 (사이드바 + 메인) — 피그마 기준 */
export default function AdminShell({ sidebarTop, children }: AdminShellProps) {
  const { pathname } = useLocation();

  return (
    // --app-height: 태블릿 브라우저 상·하단 바를 제외한 실제 가시 높이
    <div
      className="flex w-full overflow-hidden bg-canvas"
      style={{
        height: "var(--app-height)",
        maxHeight: "var(--app-height)",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      {/* 사이드바 (기존 대비 폭 70%) — 하단 네비/시계가 항상 보이도록 상단 슬롯만 스크롤 */}
      <aside
        className="flex w-[168px] shrink-0 flex-col overflow-hidden bg-panel px-[10px] pt-[16px] short:pt-[10px] md:w-[210px] lg:w-[238px]"
        style={{
          paddingBottom: "max(20px, env(safe-area-inset-bottom, 0px))",
        }}
      >
        {/* 상단 슬롯 (내용이 길면 이 영역만 스크롤 → 하단 메뉴는 항상 보임) */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{sidebarTop}</div>

        {/* 구분선 */}
        <div className="my-[12px] shrink-0 border-t border-black/40 short:my-[6px]" />

        {/* 네비게이션: 매장 관리(기존 설정 자리) + 설정(기존 로그아웃 자리) */}
        <nav className="flex shrink-0 flex-col gap-[20px] short:gap-[8px]">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className="block">
              {() => (
                <NavPill
                  label={item.label}
                  active={isAdminNavActive(item.to, pathname)}
                />
              )}
            </NavLink>
          ))}
        </nav>

        {/* 날짜 / 현재 시각 (실시간 갱신) */}
        <SidebarClock />
      </aside>

      {/* 메인 */}
      <main className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain">{children}</main>
    </div>
  );
}

/** 사이드바 하단 날짜/시각 — 실제 현재 시간과 동기화 */
function SidebarClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // 다음 "분"이 바뀌는 시점에 맞춘 뒤 1분 주기로 갱신
    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(
      () => {
        setNow(new Date());
        intervalId = window.setInterval(() => setNow(new Date()), 60_000);
      },
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds(),
    );

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) window.clearInterval(intervalId);
    };
    // 최초 마운트 시 한 번만 타이머를 건다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const date = `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} (${WEEKDAYS[now.getDay()]})`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  return (
    // 화면이 낮을 때는 날짜/시각을 한 줄로 붙여 표시해 상단 상세 영역을 확보
    <div className="mt-[12px] shrink-0 text-center font-medium leading-tight text-black short:mt-[6px] short:flex short:items-baseline short:justify-center short:gap-[8px]">
      <p className="text-[16px] short:text-[14px]">{date}</p>
      <p className="mt-[4px] text-[28px] font-bold tracking-wide short:mt-0 short:text-[22px]">{time}</p>
    </div>
  );
}

function NavPill({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`flex h-[66px] items-center gap-[18px] rounded-[15px] px-[16px] text-[22px] font-medium tracking-[0.5px] short:h-[51px] short:gap-[12px] short:rounded-[12px] short:px-[12px] short:text-[21px] ${
        active ? "bg-black text-canvas" : "bg-canvas text-black"
      }`}
    >
      <span className="size-[21px] shrink-0 rounded-full bg-danger short:size-[18px]" />
      {label}
    </span>
  );
}
