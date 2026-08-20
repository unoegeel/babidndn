import { Component, type ErrorInfo, type ReactNode } from "react";
import { reportFrontendError } from "../utils/frontendError/reportFrontendError";
import { sanitizeRoute } from "../utils/frontendError/sanitize";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

/**
 * React render tree 오류를 수집하고 fallback UI를 표시합니다.
 * tracking 실패가 fallback UI를 깨지 않도록 reportFrontendError는 try/catch 내부에서 처리됩니다.
 */
export default class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const route = typeof window !== "undefined"
      ? sanitizeRoute(window.location.pathname)
      : "/";

    reportFrontendError({
      source: "react",
      error,
      componentStack: info.componentStack ?? undefined,
      route,
    });
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[var(--app-height,100dvh)] flex-col items-center justify-center gap-4 bg-[#f5f5f5] px-6 text-center">
          <p className="text-lg font-semibold text-[#333]">화면을 불러오지 못했습니다</p>
          <p className="text-sm text-[#666]">
            일시적인 오류가 발생했습니다. 다시 시도해 주세요.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            className="rounded-lg bg-[#ff6b00] px-5 py-2.5 text-sm font-semibold text-white"
          >
            다시 시도
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
