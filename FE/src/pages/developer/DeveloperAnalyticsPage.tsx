import DeveloperShell from "../../components/developer/DeveloperShell";
import DeveloperPlaceholderPage from "./DeveloperPlaceholderPage";

export default function DeveloperAnalyticsPage() {
  return (
    <DeveloperShell>
      <DeveloperPlaceholderPage
        title="Funnel / Analytics"
        description="주문 퍼널, 메뉴/옵션 전환, Saved Menu 사용률 등을 분석합니다."
        module="analytics"
      />
    </DeveloperShell>
  );
}
