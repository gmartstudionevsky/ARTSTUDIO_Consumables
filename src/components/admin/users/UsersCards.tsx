import { Role } from '@prisma/client';

import type { AdminUserListItem } from '@/components/admin/users/UsersTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

function roleLabel(role: Role): string {
  if (role === 'ADMIN') return 'Админ';
  if (role === 'MANAGER') return 'Руководитель';
  return 'Супервайзер';
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('ru-RU');
}

export function UsersCards({
  items,
  onEdit,
  onResetPassword,
  onRevokeSessions,
}: {
  items: AdminUserListItem[];
  onEdit: (user: AdminUserListItem) => void;
  onResetPassword: (user: AdminUserListItem) => void;
  onRevokeSessions: (user: AdminUserListItem) => void;
}): JSX.Element {
  return (
    <div className="grid gap-3 md:hidden">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-text">{item.login}</p>
              <Badge variant={item.isActive ? 'ok' : 'neutral'}>{item.isActive ? 'Активен' : 'Отключён'}</Badge>
            </div>
            <p className="text-sm text-muted">Роль: {roleLabel(item.role)}</p>
            <p className="text-sm text-muted">Сессии: {item.sessionsActive}</p>
            <p className="text-sm text-muted">Последний вход: {formatDate(item.lastLoginAt)}</p>
            <div className="grid gap-2">
              <Button size="sm" variant="secondary" onClick={() => onEdit(item)}>Редактировать</Button>
              <Button size="sm" variant="secondary" onClick={() => onResetPassword(item)}>Сбросить пароль</Button>
              <Button size="sm" variant="ghost" onClick={() => onRevokeSessions(item)} disabled={item.sessionsActive === 0}>Завершить сессии</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
