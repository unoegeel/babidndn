import type { ReactNode } from "react";
import DeveloperHeader from "./DeveloperHeader";
import DeveloperSidebar from "./DeveloperSidebar";

interface DeveloperShellProps {
  children: ReactNode;
}

/** Developer Console 공통 레이아웃 */
export default function DeveloperShell({ children }: DeveloperShellProps) {
  return (
    <div
      className="flex w-full overflow-hidden bg-[#0f1117] text-gray-100"
      style={{
        height: "var(--app-height)",
        maxHeight: "var(--app-height)",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <DeveloperSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <DeveloperHeader />
        <main className="min-h-0 flex-1 overflow-auto overscroll-contain p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
