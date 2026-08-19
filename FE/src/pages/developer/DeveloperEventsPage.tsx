import DeveloperShell from "../../components/developer/DeveloperShell";
import DeveloperPlaceholderPage from "./DeveloperPlaceholderPage";
import { DEV_LABELS } from "../../constants/developerLabels";

export default function DeveloperEventsPage() {
  return (
    <DeveloperShell>
      <DeveloperPlaceholderPage
        title={DEV_LABELS.events}
        description="사용자 행동 이벤트(client_events)를 검색·필터링합니다."
        module="events"
      />
    </DeveloperShell>
  );
}
