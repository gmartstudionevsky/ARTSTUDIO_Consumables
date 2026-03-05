import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

type CreatePayload = {
  login: string;
  role: 'SUPERVISOR' | 'MANAGER' | 'ADMIN';
  tempPassword?: string;
};

export function UserCreateModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreatePayload) => Promise<{ tempPassword: string } | { error: string }>;
}): JSX.Element | null {
  const [login, setLogin] = useState('');
  const [role, setRole] = useState<CreatePayload['role']>('SUPERVISOR');
  const [tempPassword, setTempPassword] = useState('');
  const [manualPassword, setManualPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [issuedPassword, setIssuedPassword] = useState('');

  useEffect(() => {
    if (!open) return;
    setLogin('');
    setRole('SUPERVISOR');
    setTempPassword('');
    setManualPassword(false);
    setError('');
    setLoading(false);
    setIssuedPassword('');
  }, [open]);

  if (!open) return null;

  async function submit(): Promise<void> {
    setError('');

    if (login.trim().length < 3) {
      setError('Логин должен быть не короче 3 символов');
      return;
    }

    if (manualPassword && tempPassword.trim().length < 8) {
      setError('Временный пароль должен быть не короче 8 символов');
      return;
    }

    setLoading(true);
    const response = await onSubmit({
      login: login.trim().toLowerCase(),
      role,
      tempPassword: manualPassword ? tempPassword.trim() : undefined,
    });

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
        <h2 className="text-lg font-semibold text-text">Добавить пользователя</h2>

        {issuedPassword ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">Временный пароль</p>
            <p className="break-all rounded-md border border-border bg-surface px-3 py-2 text-lg font-semibold text-text">{issuedPassword}</p>
            <p className="text-sm text-muted">При первом входе потребуется сменить пароль.</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => void copyPassword()}>Скопировать</Button>
              <Button type="button" onClick={onClose}>Готово</Button>
            </div>
          </div>
        ) : (
          <>
            <Input label="Логин" value={login} onChange={(event) => setLogin(event.target.value)} placeholder="например, supervisor1" />
            <Select label="Роль" value={role} onChange={(event) => setRole(event.target.value as CreatePayload['role'])}>
              <option value="SUPERVISOR">Супервайзер</option>
              <option value="MANAGER">Руководитель</option>
              <option value="ADMIN">Админ</option>
            </Select>
            <label className="flex items-center gap-2 text-sm text-text">
              <input type="checkbox" checked={manualPassword} onChange={(event) => setManualPassword(event.target.checked)} />
              Задать временный пароль вручную
            </label>
            {manualPassword ? <Input label="Временный пароль" value={tempPassword} onChange={(event) => setTempPassword(event.target.value)} /> : null}
            {error ? <p className="text-sm text-critical">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
              <Button type="button" onClick={() => void submit()} loading={loading}>Сохранить</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
