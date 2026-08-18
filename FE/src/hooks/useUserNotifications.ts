import { useCallback, useEffect, useState } from "react";
import type { NotificationItem, NotificationType } from "../types/user";
import { dismissReadyBanner } from "../utils/readyCall";
import { seoulDateKey } from "../utils/serverDate";

const NOTIFS_STORAGE_KEY = "babi_user_notifications";
/** 마지막으로 알림을 유지한 서울 달력일 (YYYY-MM-DD). 날짜가 바뀌면 전체 삭제 */
const NOTIFS_DAY_KEY = "babi_user_notifications_day";
const SEOUL = "Asia/Seoul";

/** 다음 서울 자정까지 남은 ms */
function msUntilNextSeoulMidnight(nowMs: number = Date.now()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SEOUL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(nowMs));

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const h = get("hour");
  const min = get("minute");
  const s = get("second");

  // 서울 벽시계 → 다음 날 00:00 까지 남은 초
  const secondsToday = h * 3600 + min * 60 + s;
  const secondsInDay = 24 * 3600;
  let remainMs = (secondsInDay - secondsToday) * 1000;
  if (remainMs <= 0) remainMs = 1000;
  // 날짜 경계 직후 한 번 더 돌도록 약간의 버퍼
  return remainMs + 200;
}

function notificationCreatedAtMs(n: NotificationItem): number | null {
  if (typeof n.createdAtMs === "number" && Number.isFinite(n.createdAtMs)) {
    return n.createdAtMs;
  }
  // 구버전: id 앞부분이 Date.now()
  const ts = Number(String(n.id).split("-")[0]);
  if (Number.isFinite(ts) && ts > 1e12) {
    return ts;
  }
  return null;
}

/**
 * 서울 자정 기준 알림 정리.
 * - 달력일이 바뀌면 알림을 전부 삭제
 * - 같은 날이어도 오늘이 아닌 생성 시각 알림은 제거
 */
function pruneOldNotifications(list: NotificationItem[]): NotificationItem[] {
  const todayKey = seoulDateKey();
  try {
    const storedDay = localStorage.getItem(NOTIFS_DAY_KEY);
    if (storedDay !== todayKey) {
      localStorage.setItem(NOTIFS_DAY_KEY, todayKey);
      return [];
    }
  } catch {
    // localStorage 실패 시에도 일자 필터는 적용
  }

  return list.filter((n) => {
    const ms = notificationCreatedAtMs(n);
    if (ms == null) return false;
    return seoulDateKey(ms) === todayKey;
  });
}

function readStoredNotifications(): NotificationItem[] {
  try {
    const raw = localStorage.getItem(NOTIFS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NotificationItem[];
    if (!Array.isArray(parsed)) return [];
    return pruneOldNotifications(parsed);
  } catch {
    return [];
  }
}

/**
 * 앱 내 알림 상태·persistence·prune·CRUD만 담당한다.
 * Order polling / ReadyCall 오케스트레이션은 호출부 책임이다.
 */
export function useUserNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => readStoredNotifications());

  // 서울 00시 기준 알림 전체 삭제 (자정 타이머 + 1분 폴링 + 탭 복귀)
  useEffect(() => {
    const prune = () => {
      setNotifications((prev) => {
        const next = pruneOldNotifications(prev);
        return next.length === prev.length ? prev : next;
      });
    };

    prune();

    let midnightTimer = 0;
    const scheduleMidnight = () => {
      window.clearTimeout(midnightTimer);
      midnightTimer = window.setTimeout(() => {
        prune();
        scheduleMidnight();
      }, msUntilNextSeoulMidnight());
    };
    scheduleMidnight();

    const intervalId = window.setInterval(prune, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") prune();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(midnightTimer);
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(NOTIFS_STORAGE_KEY, JSON.stringify(pruneOldNotifications(notifications).slice(0, 50)));
    } catch {
      // ignore
    }
  }, [notifications]);

  const addNotification = useCallback(
    (type: NotificationType, title: string, message: string, orderId: string) => {
      const now = new Date();
      const timeString = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      const newNotification: NotificationItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        title,
        message,
        orderId,
        createdAt: timeString,
        createdAtMs: now.getTime(),
        read: false,
      };
      setNotifications((prev) => {
        // 같은 주문·같은 유형 알림은 한 번만
        if (prev.some((n) => n.orderId === orderId && n.type === type)) {
          return prev;
        }
        return pruneOldNotifications([newNotification, ...prev]).slice(0, 50);
      });
    },
    [],
  );

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };

  const markNotificationsReadByOrder = useCallback((orderId: string, type?: NotificationType) => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.orderId !== orderId) return n;
        if (type && n.type !== type) return n;
        return n.read ? n : { ...n, read: true };
      }),
    );
  }, []);

  /** 픽업 완료/이탈 시 해당 주문의 조리·준비 알림 읽음 + 준비완료 배너 종료 */
  const resolveOrderPickupNotifications = useCallback(
    (orderId: string) => {
      markNotificationsReadByOrder(orderId, "PREPARING");
      markNotificationsReadByOrder(orderId, "READY");
      dismissReadyBanner(orderId);
    },
    [markNotificationsReadByOrder],
  );

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return {
    notifications,
    addNotification,
    markAsRead,
    markNotificationsReadByOrder,
    resolveOrderPickupNotifications,
    removeNotification,
  };
}
