import type { AdminUserListItem } from '@/components/admin/users/UsersTable';
import { Button } from '@/components/ui/Button';

export function UserRevokeSessionsModal({
  open,
  user,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  user: AdminUserListItem | null;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
}): JSX.Element | null {
  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-bg p-5">
        <h2 className="text-lg font-semibold text-text">Завершить сессии</h2>
        <p className="text-sm text-muted">Завершить все активные сессии пользователя {user.login}?</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Отмена</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>Завершить</Button>
        </div>
      </div>
    </div>
  );
}
