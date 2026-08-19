import DeveloperShell from "../../components/developer/DeveloperShell";
import DeveloperPlaceholderPage from "./DeveloperPlaceholderPage";

export default function DeveloperErrorsPage() {
  return (
    <DeveloperShell>
      <DeveloperPlaceholderPage
        title="Errors"
        description="Frontend Error Tracking과 Backend structured error log를 조회합니다."
        module="errors"
      />
    </DeveloperShell>
  );
}
