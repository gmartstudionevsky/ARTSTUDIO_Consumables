import { Role } from '@prisma/client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export type AdminUserListItem = {
  id: string;
  login: string;
  role: Role;
  isActive: boolean;
  forcePasswordChange: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  createdBy: { id: string; login: string } | null;
  sessionsActive: number;
};

function roleLabel(role: Role): string {
  if (role === 'ADMIN') return 'Админ';
  if (role === 'MANAGER') return 'Руководитель';
  return 'Супервайзер';
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('ru-RU');
}

export function UsersTable({
  items,
  currentUserId,
  onEdit,
  onResetPassword,
  onRevokeSessions,
}: {
  items: AdminUserListItem[];
  currentUserId: string;
  onEdit: (user: AdminUserListItem) => void;
  onResetPassword: (user: AdminUserListItem) => void;
  onRevokeSessions: (user: AdminUserListItem) => void;
}): JSX.Element {
  return (
    <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
      <table className="min-w-full text-sm">
        <thead className="bg-surface text-left text-muted">
          <tr>
            <th className="px-4 py-3">Логин</th>
            <th className="px-4 py-3">Роль</th>
            <th className="px-4 py-3">Статус</th>
            <th className="px-4 py-3">Сессии</th>
            <th className="px-4 py-3">Последний вход</th>
            <th className="px-4 py-3 text-right">Действия</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isSelf = item.id === currentUserId;

            return (
              <tr key={item.id} className="border-t border-border">
                <td className="px-4 py-3">{item.login}</td>
                <td className="px-4 py-3">{roleLabel(item.role)}</td>
                <td className="px-4 py-3">
                  <Badge variant={item.isActive ? 'ok' : 'neutral'}>{item.isActive ? 'Активен' : 'Отключён'}</Badge>
                </td>
                <td className="px-4 py-3">{item.sessionsActive}</td>
                <td className="px-4 py-3">{formatDate(item.lastLoginAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="secondary" onClick={() => onEdit(item)}>Редактировать</Button>
                    <Button size="sm" variant="secondary" onClick={() => onResetPassword(item)}>Сбросить пароль</Button>
                    <Button size="sm" variant="ghost" onClick={() => onRevokeSessions(item)} disabled={item.sessionsActive === 0}>Завершить сессии</Button>
                    {isSelf ? <span className="text-xs text-muted">Текущий пользователь</span> : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
