import { ComingSoon } from "@/components/ComingSoon/ComingSoon";
import { PageHeader } from "@/components/PageHeader/PageHeader";

export function TodosPage() {
  return (
    <>
      <PageHeader title="Todos" />
      <ComingSoon message="Your todo list is coming soon" />
    </>
  );
}
