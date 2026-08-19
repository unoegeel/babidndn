import DeveloperShell from "../../components/developer/DeveloperShell";
import DeveloperPlaceholderPage from "./DeveloperPlaceholderPage";

export default function DeveloperRequestsPage() {
  return (
    <DeveloperShell>
      <DeveloperPlaceholderPage
        title="Requests"
        description="X-Request-Id 기반 access log와 request trace를 조회합니다."
        module="requests"
      />
    </DeveloperShell>
  );
}
