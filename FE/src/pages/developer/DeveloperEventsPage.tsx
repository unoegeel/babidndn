import DeveloperShell from "../../components/developer/DeveloperShell";
import DeveloperPlaceholderPage from "./DeveloperPlaceholderPage";

export default function DeveloperEventsPage() {
  return (
    <DeveloperShell>
      <DeveloperPlaceholderPage
        title="Events"
        description="User Event DB(client_events)를 검색·필터링합니다."
        module="events"
      />
    </DeveloperShell>
  );
}
