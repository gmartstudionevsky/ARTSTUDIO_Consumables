'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { searchItems } from '@/lib/inventory/api';

type Lookup = { id: string; name: string };

export function InventoryFillModal({ open, categories, onClose, onSubmit }: { open: boolean; categories: Lookup[]; onClose: () => void; onSubmit: (payload: { scope: 'ALL_ACTIVE' | 'CATEGORY' | 'ITEMS'; categoryId?: string; itemIds?: string[] }) => void }): JSX.Element | null {
  const [scope, setScope] = useState<'ALL_ACTIVE' | 'CATEGORY' | 'ITEMS'>('ALL_ACTIVE');
  const [categoryId, setCategoryId] = useState('');
  const [itemQuery, setItemQuery] = useState('');
  const [itemOptions, setItemOptions] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => { if (scope === 'ITEMS') void searchItems(itemQuery).then(setItemOptions); }, [scope, itemQuery]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg space-y-3 rounded-lg border border-border bg-bg p-4">
        <h3 className="text-lg font-semibold">Сформировать список позиций</h3>
        <Select label="Область" value={scope} onChange={(event) => setScope(event.target.value as 'ALL_ACTIVE' | 'CATEGORY' | 'ITEMS')}>
          <option value="ALL_ACTIVE">Все активные</option>
          <option value="CATEGORY">По разделу</option>
          <option value="ITEMS">Выбрать позиции</option>
        </Select>
        {scope === 'CATEGORY' ? <Select label="Раздел" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Выберите</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select> : null}
        {scope === 'ITEMS' ? <div className="space-y-2"><Input label="Поиск позиции" value={itemQuery} onChange={(event) => setItemQuery(event.target.value)} />
          <div className="max-h-48 overflow-auto rounded border border-border p-2 text-sm">
            {itemOptions.map((item) => (
              <label key={item.id} className="flex gap-2 py-1">
                <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={(event) => setSelectedIds((prev) => event.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id))} />
                <span>{item.code} — {item.name}</span>
              </label>
            ))}
          </div>
        </div> : null}
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Отмена</Button><Button onClick={() => onSubmit({ scope, categoryId: categoryId || undefined, itemIds: selectedIds })}>Сформировать</Button></div>
      </div>
    </div>
  );
}
