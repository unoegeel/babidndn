const SECTIONS: { title: string; body: string }[] = [
  {
    title: "주문 취소",
    body: "음식 조리가 시작되기 전에는 주문 취소 및 환불을 요청하실 수 있습니다. 웹사이트에서 직접 취소하는 기능은 제공하지 않으며, 취소 및 환불 문의는 주문하신 매장으로 문의해 주세요. 매장에서 주문의 조리 상태를 확인한 뒤 처리를 진행합니다.",
  },
  {
    title: "음식 조리 시작 후",
    body: "음식 조리가 시작된 이후에는 음식 주문의 특성상 원칙적으로 주문 취소 및 환불이 어렵습니다.",
  },
  {
    title: "픽업 완료 후",
    body: "음식 수령이 완료된 주문은 원칙적으로 주문 취소 및 환불이 불가능합니다.",
  },
  {
    title: "매장 사정으로 제공이 어려운 경우",
    body: "매장 사정 등으로 주문한 상품을 정상적으로 제공할 수 없는 경우에는 매장에서 별도로 환불 처리를 안내할 수 있습니다.",
  },
  {
    title: "환불 처리",
    body: "환불이 승인되면 결제한 수단을 통해 환불됩니다. 결제수단이나 카드사 등의 사정에 따라 실제 환불 완료 시점은 달라질 수 있습니다.",
  },
  {
    title: "문의 방법",
    body: "취소 및 환불 문의는 주문하신 매장으로 문의해 주세요.",
  },
];

export default function RefundPolicyPage() {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-gray-50/30 px-4 py-5">
      <div className="mb-4">
        <h2 className="text-base font-bold text-gray-900">환불 정책</h2>
        <p className="mt-1.5 text-[12px] leading-relaxed text-gray-500">
          바비든든은 배송·구독 서비스가 아니라, 메뉴를 선택하고 온라인 결제한 뒤
          매장에서 조리·픽업하는 스마트 오더 서비스입니다.
        </p>
      </div>

      <div className="space-y-3 pb-2">
        {SECTIONS.map((section) => (
          <section
            key={section.title}
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <h3 className="text-sm font-bold text-gray-900">{section.title}</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-gray-500">{section.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
