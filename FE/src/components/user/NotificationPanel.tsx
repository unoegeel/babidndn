import type { NotificationItem } from "../../types/user";
import SwipeableNotificationItem from "./SwipeableNotificationItem";

type NotificationPanelProps = {
  notifications: NotificationItem[];
  onClose: () => void;
  onOpen: (notifId: string, orderId: string, type: string) => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
};

export function NotificationPanel({
  notifications,
  onClose,
  onOpen,
  onMarkRead,
  onDelete,
}: NotificationPanelProps) {
  return (
    <>
      {/* 오버레이 클릭 시 닫히도록 바깥 백드롭 영역 지정 */}
      <div className="absolute inset-0 z-40 bg-transparent" onClick={onClose}></div>
      <div className="absolute top-14 right-4 bg-white border border-gray-100 rounded-2xl w-[320px] max-h-[350px] shadow-xl z-50 flex flex-col p-4 overflow-y-auto animate-fade-in space-y-3">
        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
          <span className="text-xs font-bold text-gray-800">알림</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none text-[11px] font-semibold"
          >
            닫기
          </button>
        </div>

        {notifications.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-[11px] font-medium">
            새로운 알림이 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] font-medium text-gray-400 px-0.5">
              ← 삭제 · 읽음 →
            </p>
            {notifications.map((notif) => (
              <SwipeableNotificationItem
                key={notif.id}
                notif={notif}
                onOpen={() => onOpen(notif.id, notif.orderId, notif.type)}
                onMarkRead={() => onMarkRead(notif.id)}
                onDelete={() => onDelete(notif.id)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
