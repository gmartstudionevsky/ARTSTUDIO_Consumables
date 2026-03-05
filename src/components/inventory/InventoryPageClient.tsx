'use client';

import { Role } from '@prisma/client';
import { useEffect, useState } from 'react';

import { InventoryList } from '@/components/inventory/InventoryList';
import { NewInventoryModal } from '@/components/inventory/NewInventoryModal';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Toast } from '@/components/ui/Toast';
import { createInventory, fetchInventoryList } from '@/lib/inventory/api';
import { InventoryListItem } from '@/lib/inventory/types';

export function InventoryPageClient({ role }: { role: Role }): JSX.Element {
  const [items, setItems] = useState<InventoryListItem[]>([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState('');

  async function load(): Promise<void> {
    const payload = await fetchInventoryList({ limit: 100, offset: 0, status: 'all' });
    setItems(payload.items);
  }

  useEffect(() => { void load(); }, []);

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between gap-2">
        <div><h1 className="text-2xl font-semibold">Инвентаризация</h1><p className="text-sm text-muted">Факт, отклонение и частичное применение выбранных строк.</p></div>
        <Button onClick={() => setOpen(true)}>Новая инвентаризация</Button>
      </header>
      {items.length === 0 ? <EmptyState title="Пока нет сессий" description="Создайте первую инвентаризацию." /> : <InventoryList items={items} />}
      <NewInventoryModal
        open={open}
        canEditOpeningDate={role === Role.ADMIN}
        onClose={() => setOpen(false)}
        onSubmit={(payload) => {
          void (async () => {
            await createInventory(payload);
            setOpen(false);
            await load();
            setToast('Инвентаризация создана');
          })();
        }}
      />
      {toast ? <Toast message={toast} onClose={() => setToast('')} /> : null}
    </section>
  );
}
