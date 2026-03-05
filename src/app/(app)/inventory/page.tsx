import { InventoryPageClient } from '@/components/inventory/InventoryPageClient';
import { requireSupervisorOrAbove } from '@/lib/auth/guards';

export default async function InventoryPage(): Promise<JSX.Element> {
  const user = await requireSupervisorOrAbove();
  return <InventoryPageClient role={user.role} />;
}
