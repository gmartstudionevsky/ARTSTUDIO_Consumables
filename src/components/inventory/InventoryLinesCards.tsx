'use client';

import { InventoryLine } from '@/lib/inventory/types';

export function InventoryLinesCards({ lines, unitsByItem, onChange }: { lines: InventoryLine[]; unitsByItem: Record<string, Array<{ unitId: string; unit: { id: string; name: string } }>>; onChange: (lineId: string, patch: { qtyFactInput?: string | null; unitId?: string; apply?: boolean; comment?: string | null }) => void }): JSX.Element {
  return (
    <div className="space-y-3 lg:hidden">
      {lines.map((line) => (
        <div key={line.id} className="rounded-lg border border-border p-3 text-sm">
          <p className="font-medium">{line.item.code} — {line.item.name}</p>
          <p className="text-muted">Система: {line.qtySystemBase}</p>
          <p className="text-muted">Отклонение: {line.deltaBase ?? '—'}</p>
          <div className="mt-2 flex gap-2">
            <input className="w-full rounded border border-border px-2 py-1" placeholder="Факт" value={line.qtyFactInput ?? ''} onChange={(event) => onChange(line.id, { qtyFactInput: event.target.value || null })} />
            <select className="rounded border border-border px-2 py-1" value={line.unit.id} onChange={(event) => onChange(line.id, { unitId: event.target.value })}>{(unitsByItem[line.item.id] || []).map((unit) => <option key={unit.unitId} value={unit.unitId}>{unit.unit.name}</option>)}</select>
          </div>
          <input className="mt-2 w-full rounded border border-border px-2 py-1" placeholder="Комментарий" value={line.comment ?? ''} onChange={(event) => onChange(line.id, { comment: event.target.value || null })} />
          <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={line.apply} onChange={(event) => onChange(line.id, { apply: event.target.checked })} /> Применить</label>
        </div>
      ))}
    </div>
  );
}
