'use client';

import Link from 'next/link';

import { Badge } from '@/components/ui/Badge';
import { InventoryListItem } from '@/lib/inventory/types';

function statusLabel(status: InventoryListItem['status']): { label: string; variant: 'neutral' | 'ok' | 'warn' } {
  if (status === 'APPLIED') return { label: 'Применена', variant: 'ok' };
  if (status === 'CANCELLED') return { label: 'Отменена', variant: 'neutral' };
  return { label: 'Черновик', variant: 'warn' };
}

export function InventoryList({ items }: { items: InventoryListItem[] }): JSX.Element {
  return (
    <div className="space-y-3">
      {items.map((item) => {
        const status = statusLabel(item.status);
        return (
          <div key={item.id} className="rounded-lg border border-border p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{new Date(item.occurredAt).toLocaleDateString('ru-RU')}</p>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-muted">Создал: {item.createdBy.login}</p>
            <p className="text-muted">Строк: {item.linesTotal}</p>
            <p className="text-muted">Режим: {item.mode === 'OPENING' ? 'Открытие' : 'Обычная'}</p>
            <p className="text-muted">Комментарий: {item.note || '—'}</p>
            <Link href={`/inventory/${item.id}`} className="mt-2 inline-block text-accent underline">Открыть</Link>
          </div>
        );
      })}
    </div>
  );
}
