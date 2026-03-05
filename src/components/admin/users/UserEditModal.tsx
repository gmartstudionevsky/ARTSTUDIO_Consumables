import { useEffect, useMemo, useState } from 'react';

import type { AdminUserListItem } from '@/components/admin/users/UsersTable';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

export function UserEditModal({
  open,
  user,
  isSelf,
  onClose,
  onSubmit,
}: {
  open: boolean;
  user: AdminUserListItem | null;
  isSelf: boolean;
  onClose: () => void;
  onSubmit: (payload: { role?: 'SUPERVISOR' | 'MANAGER' | 'ADMIN'; isActive?: boolean }) => Promise<string | null>;
}): JSX.Element | null {
  const [role, setRole] = useState<'SUPERVISOR' | 'MANAGER' | 'ADMIN'>('SUPERVISOR');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setRole(user.role);
    setIsActive(user.isActive);
    setError('');
    setLoading(false);
  }, [open, user]);

  const disableRoleChange = useMemo(() => isSelf && user?.role === 'ADMIN', [isSelf, user?.role]);

  if (!open || !user) return null;

  async function submit(): Promise<void> {
    setLoading(true);
    setError('');

    const message = await onSubmit({
      role: disableRoleChange ? undefined : role,
      isActive: isSelf ? undefined : isActive,
    });

    setLoading(false);

    if (message) {
      setError(message);
      return;
    }

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-bg p-5">
        <h2 className="text-lg font-semibold text-text">Редактировать пользователя</h2>
        <p className="text-sm text-muted">{user.login}</p>
        <Select label="Роль" value={role} onChange={(event) => setRole(event.target.value as 'SUPERVISOR' | 'MANAGER' | 'ADMIN')} disabled={disableRoleChange}>
          <option value="SUPERVISOR">Супервайзер</option>
          <option value="MANAGER">Руководитель</option>
          <option value="ADMIN">Админ</option>
        </Select>
        {isSelf ? <p className="text-xs text-muted">Для текущего пользователя изменение роли и деактивация недоступны.</p> : null}
        {!isSelf ? (
          <label className="flex items-center gap-2 text-sm text-text">
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            Пользователь активен
          </label>
        ) : null}
        {error ? <p className="text-sm text-critical">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="button" onClick={() => void submit()} loading={loading}>Сохранить</Button>
        </div>
      </div>
    </div>
  );
}
