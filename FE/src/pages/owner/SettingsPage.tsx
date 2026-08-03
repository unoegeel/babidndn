import AdminShell from "../../components/AdminShell";

export default function SettingsPage() {
  return (
    <AdminShell>
      <div className="p-[20px] md:p-[32px]">
        <h1 className="text-[24px] font-bold text-black">설정</h1>
        <p className="mt-[12px] text-[15px] text-black/60">
          매장 정보, 영업 시간, 알림 등 설정 화면입니다. (추후 구현 예정)
        </p>

        <div className="mt-[32px] max-w-[520px] rounded-[25px] border border-black/50 bg-canvas p-[24px]">
          <h2 className="text-[18px] font-medium tracking-[1px] text-black">
            데이터 안내
          </h2>
          <p className="mt-[8px] text-[14px] leading-relaxed text-black/60">
            주문 현황·메뉴·결제 내역은 서버(babidndn.shop)와 실시간으로
            연동됩니다. 데이터가 갱신되지 않으면 화면을 새로고침해 주세요.
          </p>
        </div>
      </div>
    </AdminShell>
  );
}
