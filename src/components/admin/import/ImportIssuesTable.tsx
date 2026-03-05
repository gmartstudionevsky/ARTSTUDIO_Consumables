import { ImportIssue } from '@/lib/import/types';

import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export function ImportIssuesTable({ errors, warnings }: { errors: ImportIssue[]; warnings: ImportIssue[] }): JSX.Element {
  const all = [
    ...errors.map((item) => ({ ...item, kind: 'error' as const })),
    ...warnings.map((item) => ({ ...item, kind: 'warning' as const })),
  ];
  const visible = all.slice(0, 50);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ошибки и предупреждения</CardTitle>
      </CardHeader>
      <CardContent>
        {all.length === 0 ? <p className="text-sm text-ok">Проблем не найдено.</p> : null}
        {visible.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="px-2 py-2">Тип</th>
                  <th className="px-2 py-2">Лист</th>
                  <th className="px-2 py-2">Строка</th>
                  <th className="px-2 py-2">Колонка</th>
                  <th className="px-2 py-2">Сообщение</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item, index) => (
                  <tr key={`${item.kind}-${item.sheet}-${item.row}-${index}`} className="border-b border-border/60">
                    <td className="px-2 py-2">{item.kind === 'error' ? <Badge variant="critical">Ошибка</Badge> : <Badge variant="warn">Предупреждение</Badge>}</td>
                    <td className="px-2 py-2">{item.sheet}</td>
                    <td className="px-2 py-2">{item.row}</td>
                    <td className="px-2 py-2">{item.column}</td>
                    <td className="px-2 py-2">{item.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {all.length > 50 ? <p className="text-xs text-muted">Ещё {all.length - 50} записей.</p> : null}
      </CardContent>
    </Card>
  );
}
