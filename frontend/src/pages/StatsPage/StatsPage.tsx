import { ComingSoon } from "@/components/ComingSoon/ComingSoon";
import { PageHeader } from "@/components/PageHeader/PageHeader";

export function StatsPage() {
  return (
    <>
      <PageHeader title="Stats" />
      <ComingSoon message="Budget and cost statistics are coming soon" />
    </>
  );
}
