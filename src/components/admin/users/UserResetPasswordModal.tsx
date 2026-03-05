import { useEffect, useState } from 'react';

import type { AdminUserListItem } from '@/components/admin/users/UsersTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function UserResetPasswordModal({
  open,
  user,
  onClose,
  onSubmit,
}: {
  open: boolean;
  user: AdminUserListItem | null;
  onClose: () => void;
  onSubmit: (payload: { tempPassword?: string }) => Promise<{ tempPassword: string } | { error: string }>;
}): JSX.Element | null {
  const [manual, setManual] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [issuedPassword, setIssuedPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setManual(false);
    setTempPassword('');
    setIssuedPassword('');
    setError('');
    setLoading(false);
  }, [open]);

  if (!open || !user) return null;

  async function submit(): Promise<void> {
    if (manual && tempPassword.trim().length < 8) {
      setError('Временный пароль должен быть не короче 8 символов');
      return;
    }

    setLoading(true);
    setError('');

    const response = await onSubmit({ tempPassword: manual ? tempPassword.trim() : undefined });
    if ('error' in response) {
      setError(response.error);
      setLoading(false);
      return;
    }

    setIssuedPassword(response.tempPassword);
    setLoading(false);
  }

  async function copyPassword(): Promise<void> {
    await navigator.clipboard.writeText(issuedPassword);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-bg p-5">
        <h2 className="text-lg font-semibold text-text">Сбросить пароль</h2>
        <p className="text-sm text-muted">Пользователь: {user.login}</p>

        {issuedPassword ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">Новый временный пароль</p>
            <p className="break-all rounded-md border border-border bg-surface px-3 py-2 text-lg font-semibold text-text">{issuedPassword}</p>
            <p className="text-sm text-muted">При первом входе потребуется сменить пароль.</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => void copyPassword()}>Скопировать</Button>
              <Button type="button" onClick={onClose}>Готово</Button>
            </div>
          </div>
        ) : (
          <>
            <label className="flex items-center gap-2 text-sm text-text">
              <input type="checkbox" checked={manual} onChange={(event) => setManual(event.target.checked)} />
              Задать временный пароль вручную
            </label>
            {manual ? <Input label="Временный пароль" value={tempPassword} onChange={(event) => setTempPassword(event.target.value)} /> : null}
            {error ? <p className="text-sm text-critical">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
              <Button type="button" loading={loading} onClick={() => void submit()}>Сбросить</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
