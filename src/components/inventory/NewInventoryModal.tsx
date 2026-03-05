'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export function NewInventoryModal({ open, canEditOpeningDate, onClose, onSubmit }: { open: boolean; canEditOpeningDate: boolean; onClose: () => void; onSubmit: (payload: { occurredAt: string; note?: string; mode: 'REGULAR' | 'OPENING' }) => void }): JSX.Element | null {
  const [mode, setMode] = useState<'REGULAR' | 'OPENING'>('REGULAR');
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');

  if (!open) return null;

  const openingDate = '2026-03-01';
  const dateValue = mode === 'OPENING' ? openingDate : occurredAt;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-3 rounded-lg border border-border bg-bg p-4">
        <h3 className="text-lg font-semibold">Новая инвентаризация</h3>
        <Select label="Режим" value={mode} onChange={(event) => setMode(event.target.value as 'REGULAR' | 'OPENING')}>
          <option value="REGULAR">Обычная</option>
          <option value="OPENING">Открытие склада 01.03.2026</option>
        </Select>
        <Input type="date" label="Дата" value={dateValue} disabled={mode === 'OPENING' && !canEditOpeningDate} onChange={(event) => setOccurredAt(event.target.value)} />
        <Input label="Комментарий" value={note} onChange={(event) => setNote(event.target.value)} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button onClick={() => onSubmit({ occurredAt: mode === 'OPENING' ? openingDate : occurredAt, mode, note })}>Создать</Button>
        </div>
      </div>
    </div>
  );
}
