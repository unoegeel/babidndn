import { useEffect, useState, type MouseEvent } from "react";
import AdminShell from "../../components/AdminShell";
import { useAdminData } from "../../store/AdminDataContext";
import { subscribeOrderEvents } from "../../services/admin/orderService";
import type { Order, OrderItem } from "../../types/admin";

declare global {
  interface Window {
    Android?: {
      printKitchenTicket: (orderJson: string) => void;
    };
  }
}

/** 주문 목록 폴링 주기 (ms) — SSE 수신 실패 대비 안전망 */
const POLL_INTERVAL = 10_000;

export default function OrdersDashboardPage() {
  const { orders, cookItems, callOrder, pickupOrder, refreshOrders } = useAdminData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, string[]>>({});
  const [toast, setToast] = useState<string | null>(null);

  // 신규 주문·상태 변경 실시간 반영: SSE 구독 + 주기 폴링
  useEffect(() => {
    const refresh = () => {
      refreshOrders().catch((err) => console.error("주문 새로고침 실패:", err));
    };
    const unsubscribe = subscribeOrderEvents(refresh);
    const timer = setInterval(refresh, POLL_INTERVAL);
    return () => {
      unsubscribe();
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 픽업 전 주문은 호출 여부와 무관하게 모두 왼쪽 상세 대상
  const active = orders.find((o) => o.id === selectedId) ?? orders[0] ?? null;

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  };

  const togglePending = (orderId: string, itemId: string) =>
    setPending((prev) => {
      const cur = prev[orderId] ?? [];
      return {
        ...prev,
        [orderId]: cur.includes(itemId)
          ? cur.filter((id) => id !== itemId)
          : [...cur, itemId],
      };
    });

  const handleCook = (order: Order) => {
    const checked = pending[order.id] ?? [];
    if (checked.length === 0) return;
    cookItems(order.id, checked);
    setPending((prev) => ({ ...prev, [order.id]: [] }));
  };

  const orderDetail = active ? (
    <OrderDetailPanel
      order={active}
      pending={pending[active.id] ?? []}
      onToggle={(itemId) => togglePending(active.id, itemId)}
      onCook={() => handleCook(active)}
      onCall={async () => {
        try {
          await callOrder(active.id);
          flash(
            active.called
              ? `${active.number}번 고객님을 다시 호출했습니다.`
              : `${active.number}번 고객님을 호출했습니다.`,
          );
        } catch {
          // 실패 알림은 callOrder 내부에서 처리
        }
      }}
      onPickup={async () => {
        if (!active.called) return;
        try {
          await pickupOrder(active.id);
          flash(`${active.number}번 픽업이 완료되었습니다.`);
        } catch {
          // 실패 알림은 pickupOrder 내부에서 처리
        }
      }}
    />
  ) : (
    <div className="flex h-full items-center justify-center text-center text-[14px] text-black/50">
      대기 중인 주문이 없습니다.
    </div>
  );

  return (
    <AdminShell sidebarTop={orderDetail}>
      <div className="flex h-full min-h-0 flex-col p-[16px] md:p-[24px] short:p-[12px]">
        <h1 className="mb-[16px] shrink-0 text-[22px] font-bold text-black short:mb-[10px] short:text-[18px]">
          주문 현황 대시보드
        </h1>

        <div className="min-h-0 flex-1 overflow-auto rounded-[25px] bg-panel p-[16px] md:p-[24px] short:p-[12px]">
          {orders.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[15px] text-black/50">
              진행 중인 주문이 없습니다.
            </div>
          ) : (
            // 태블릿 가로/세로 어느 쪽에서도 남는 폭 없이 채워지도록 자동 열 그리드 사용
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-[16px] md:gap-[24px]">
              {orders.map((o) => (
                <BoardCard
                  key={o.id}
                  order={o}
                  selected={active?.id === o.id}
                  onSelect={() => setSelectedId(o.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 rounded-full bg-black px-[20px] py-[10px] text-[14px] font-medium text-white shadow-lg"
          style={{ bottom: "max(24px, env(safe-area-inset-bottom))" }}
        >
          {toast}
        </div>
      )}
    </AdminShell>
  );
}

/* ── 왼쪽 사이드바 상단: 선택된 주문 상세 ── */
function OrderDetailPanel({
  order,
  pending,
  onToggle,
  onCook,
  onCall,
  onPickup,
}: {
  order: Order;
  /** 조리완료 체크 대기 중인 메뉴 라인 id 목록 */
  pending: string[];
  onToggle: (itemId: string) => void;
  onCook: () => void;
  onCall: () => void;
  onPickup: () => void;
}) {
  // 주문번호 색상은 호출 여부로 결정 (조리 완료 여부와 무관)
  const numberColor = order.called ? "#22c55e" : "#ef4444";
  const allCooked = order.items.every((it) => it.cooked);

  return (
    // h-full + min-h-0: 사이드바 높이에 맞춰 패널이 줄어들고, 메뉴 목록만 내부 스크롤
    <div className="flex h-full min-h-0 flex-col rounded-[10px] bg-canvas p-[16px] short:p-[12px]">
      <p className="text-[15px] font-medium text-black/75 short:text-[14px]">주문번호</p>
      <p
        className="mt-[2px] text-[36px] font-bold leading-none short:text-[28px]"
        style={{ color: numberColor }}
      >
        {order.number}
      </p>

      {/* 메뉴가 많아지면 이 목록만 스크롤 → 아래 액션 버튼은 항상 보임 */}
      {/* min-h: 버튼 고정 때문에 목록이 읽을 수 없을 만큼 눌리지 않도록 바닥값 확보 */}
      <ul className="mt-[14px] flex min-h-[96px] flex-1 flex-col gap-[10px] overflow-y-auto short:mt-[10px] short:min-h-[72px] short:gap-[8px]">
        {order.items.map((it) => (
          <li key={it.id} className="flex gap-[10px]">
            <button
              type="button"
              disabled={it.cooked}
              onClick={() => onToggle(it.id)}
              aria-pressed={it.cooked || pending.includes(it.id)}
              className="mt-[3px] flex size-[22px] shrink-0 items-center justify-center border border-black bg-canvas text-[14px] leading-none"
            >
              {(it.cooked || pending.includes(it.id)) && (
                <span style={{ color: it.cooked ? "#22c55e" : "#000" }}>✓</span>
              )}
            </button>
            <ItemText item={it} nameSize={16} optSize={13} />
          </li>
        ))}
      </ul>

      {/* 넓어진 사이드바를 활용해 버튼을 2열로 배치 (세로 공간 절약) */}
      {/* shrink-0: 메뉴가 많아도 줄어들거나 스크롤 밖으로 밀리지 않도록 하단 고정 */}
      <div className="mt-[16px] grid shrink-0 grid-cols-2 gap-[8px] short:mt-[10px] short:gap-[6px]">
        <button
          onClick={onCook}
          disabled={allCooked}
          className="h-[40px] rounded-full bg-panel text-[15px] font-medium tracking-[1px] text-black disabled:opacity-40 short:h-[34px] short:text-[14px]"
        >
          조리완료
        </button>
        <button
          onClick={onCall}
          className="h-[40px] rounded-full bg-panel text-[15px] font-medium tracking-[1px] text-black short:h-[34px] short:text-[14px]"
        >
          {order.called ? "재호출" : "호출"}
        </button>
        <button
          onClick={onPickup}
          disabled={!order.called}
          title={order.called ? undefined : "호출 후에 픽업완료할 수 있습니다"}
          className="col-span-2 h-[40px] rounded-full bg-panel text-[15px] font-medium tracking-[1px] text-black disabled:cursor-not-allowed disabled:opacity-40 short:h-[34px] short:text-[14px]"
        >
          픽업완료
        </button>
      </div>
    </div>
  );
}

/* ── 오른쪽 보드 카드 ── */
function BoardCard({
  order,
  selected,
  onSelect,
}: {
  order: Order;
  selected: boolean;
  onSelect: () => void;
}) {
  // 주문번호 색상은 호출 여부로 결정 (조리 완료 여부와 무관)
  const numberColor = order.called ? "#22c55e" : "#ef4444";

  const handlePrint = (e: MouseEvent) => {
    e.stopPropagation();
    window.Android?.printKitchenTicket(JSON.stringify(order));
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`relative flex w-full cursor-pointer flex-col rounded-[25px] bg-canvas p-[20px] text-left transition-shadow ${
        selected ? "ring-2 ring-black/40" : ""
      }`}
    >
      <button
        type="button"
        onClick={handlePrint}
        className="absolute right-[14px] top-[14px] rounded-[8px] border border-black/30 bg-panel px-[10px] py-[4px] text-[12px] font-medium text-black hover:bg-black/5"
        aria-label="주문서 출력"
      >
        출력
      </button>
      <p
        className="text-center text-[34px] font-bold leading-none"
        style={{ color: numberColor }}
      >
        {order.number}
      </p>
      <p className="mt-[6px] text-center text-[14px] text-black">{order.time}</p>

      <div className="mt-[16px] flex flex-col gap-[12px]">
        {order.items.map((it) => (
          <div
            key={it.id}
            className="rounded-[10px] px-[16px] py-[12px]"
            style={{
              backgroundColor: it.cooked
                ? "rgba(34,197,94,0.5)"
                : "rgba(217,217,217,0.5)",
            }}
          >
            <ItemText item={it} nameSize={18} optSize={14} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* 메뉴명 + 옵션(불릿) */
function ItemText({
  item,
  nameSize,
  optSize,
}: {
  item: OrderItem;
  nameSize: number;
  optSize: number;
}) {
  return (
    <div className="min-w-0">
      <p className="font-medium text-black" style={{ fontSize: nameSize }}>
        {item.name}
        {item.quantity > 1 && (
          <span className="ml-[6px] font-bold">x {item.quantity}</span>
        )}
      </p>
      {item.options.length > 0 && (
        <ul className="mt-[2px] list-disc pl-[18px]">
          {item.options.map((opt) => (
            <li key={opt} className="text-black" style={{ fontSize: optSize }}>
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
