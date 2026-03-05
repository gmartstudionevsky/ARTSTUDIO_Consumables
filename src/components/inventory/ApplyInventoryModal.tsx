'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function ApplyInventoryModal({ open, onClose, onSubmit }: { open: boolean; onClose: () => void; onSubmit: (payload: { note?: string }) => void }): JSX.Element | null {
  const [note, setNote] = useState('');
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-3 rounded-lg border border-border bg-bg p-4">
        <h3 className="text-lg font-semibold">Применить выбранные строки?</h3>
        <p className="text-sm text-muted">Это создаст операции прихода/расхода.</p>
        <Input label="Комментарий" value={note} onChange={(event) => setNote(event.target.value)} />
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Отмена</Button><Button onClick={() => onSubmit({ note })}>Применить</Button></div>
      </div>
    </div>
  );
}
