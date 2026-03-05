import { ImportSummary as Summary } from '@/lib/import/types';

import { Card } from '@/components/ui/Card';

export function ImportSummary({ summary }: { summary: Summary }): JSX.Element {
  const entries = [
    ['Позиции', summary.items],
    ['Категории', summary.categories],
    ['Единицы', summary.units],
    ['Статьи расходов', summary.expenseArticles],
    ['Назначения', summary.purposes],
    ['Строки единиц', summary.itemUnits],
    ['OPENING строки', summary.openingLines],
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {entries.map(([label, value]) => (
        <Card key={label} className="p-4">
          <p className="text-xs text-muted">{label}</p>
          <p className="mt-1 text-xl font-semibold text-text">{value}</p>
        </Card>
      ))}
    </div>
  );
}
