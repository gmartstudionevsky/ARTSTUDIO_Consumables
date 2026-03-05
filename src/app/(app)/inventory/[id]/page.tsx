import { InventoryDetailPageClient } from '@/components/inventory/InventoryDetailPageClient';
import { requireSupervisorOrAbove } from '@/lib/auth/guards';

export default async function InventoryDetailPage(): Promise<JSX.Element> {
  const user = await requireSupervisorOrAbove();
  return <InventoryDetailPageClient role={user.role} />;
}
