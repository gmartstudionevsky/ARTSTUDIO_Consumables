'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { UserCreateModal } from '@/components/admin/users/UserCreateModal';
import { UserEditModal } from '@/components/admin/users/UserEditModal';
import { UserResetPasswordModal } from '@/components/admin/users/UserResetPasswordModal';
import { UserRevokeSessionsModal } from '@/components/admin/users/UserRevokeSessionsModal';
import { UsersCards } from '@/components/admin/users/UsersCards';
import { UsersFilters, UsersFiltersState } from '@/components/admin/users/UsersFilters';
import { AdminUserListItem, UsersTable } from '@/components/admin/users/UsersTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { Toast } from '@/components/ui/Toast';
import { HelpTip } from '@/components/ui/Tooltip';
import { useUiText } from '@/components/ui-texts/useUiText';

const initialFilters: UsersFiltersState = {
  q: '',
  role: 'all',
  active: 'all',
};

export default function AdminUsersPage(): JSX.Element {
  const [filters, setFilters] = useState<UsersFiltersState>(initialFilters);
  const [items, setItems] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserListItem | null>(null);
  const [resetUser, setResetUser] = useState<AdminUserListItem | null>(null);
  const [revokeUser, setRevokeUser] = useState<AdminUserListItem | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);

  const forceChangeTooltip = useUiText('tooltip.users.forceChange', 'Пользователь будет обязан сменить пароль при первом входе.');
  const revokeTooltip = useUiText('tooltip.users.revoke', 'Завершает все активные сессии пользователя.');

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      q: filters.q,
      role: filters.role,
      active: filters.active,
      limit: '30',
      offset: '0',
    });

    return params.toString();
  }, [filters]);

  const loadUsers = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');

    const response = await fetch(`/api/admin/users?${queryString}`, { cache: 'no-store' });
    const payload = (await response.json().catch(() => null)) as { items?: AdminUserListItem[]; total?: number; error?: string } | null;

    if (!response.ok) {
      setItems([]);
      setTotal(0);
      setError(payload?.error ?? 'Ошибка загрузки пользователей');
      setLoading(false);
      return;
    }

    setItems(payload?.items ?? []);
    setTotal(payload?.total ?? 0);
    setLoading(false);
  }, [queryString]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      void loadUsers();
    }, 250);

    return () => clearTimeout(timeout);
  }, [loadUsers]);

  useEffect(() => {
    void fetch('/api/auth/me', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload: { user?: { id: string } }) => setCurrentUserId(payload.user?.id ?? ''))
      .catch(() => null);
  }, []);

  async function handleCreate(payload: { login: string; role: 'SUPERVISOR' | 'MANAGER' | 'ADMIN'; tempPassword?: string }): Promise<{ tempPassword: string } | { error: string }> {
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = (await response.json().catch(() => null)) as { error?: string; tempPassword?: string } | null;

    if (!response.ok || !json?.tempPassword) {
      return { error: json?.error ?? 'Не удалось создать пользователя' };
    }

    await loadUsers();
    setToast('Пользователь создан');
    return { tempPassword: json.tempPassword };
  }

  async function handleEdit(payload: { role?: 'SUPERVISOR' | 'MANAGER' | 'ADMIN'; isActive?: boolean }): Promise<string | null> {
    if (!editUser) return 'Пользователь не выбран';

    const response = await fetch(`/api/admin/users/${editUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      return json?.error ?? 'Не удалось сохранить изменения';
    }

    setToast('Пользователь обновлён');
    await loadUsers();
    return null;
  }

  async function handleReset(payload: { tempPassword?: string }): Promise<{ tempPassword: string } | { error: string }> {
    if (!resetUser) return { error: 'Пользователь не выбран' };

    const response = await fetch(`/api/admin/users/${resetUser.id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = (await response.json().catch(() => null)) as { error?: string; tempPassword?: string } | null;

    if (!response.ok || !json?.tempPassword) {
      return { error: json?.error ?? 'Не удалось сбросить пароль' };
    }

    await loadUsers();
    setToast('Пароль сброшен');
    return { tempPassword: json.tempPassword };
  }

  async function handleRevokeSessions(): Promise<void> {
    if (!revokeUser) return;

    setRevokeLoading(true);

    const response = await fetch(`/api/admin/users/${revokeUser.id}/revoke-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const json = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setToast(json?.error ?? 'Не удалось завершить сессии');
      setRevokeLoading(false);
      return;
    }

    await loadUsers();
    setToast('Сессии завершены');
    setRevokeLoading(false);
    setRevokeUser(null);
  }

  return (
    <main className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-text">Пользователи</h1>
        <p className="text-sm text-muted">Создание аккаунтов, роли и доступы.</p>
      </header>

      <UsersFilters value={filters} onChange={setFilters} onCreate={() => setCreateOpen(true)} />

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        Смена пароля при входе
        <HelpTip label="Подсказка о смене пароля">{forceChangeTooltip}</HelpTip>
        Завершение сессий
        <HelpTip label="Подсказка о завершении сессий">{revokeTooltip}</HelpTip>
      </div>

      <p className="text-sm text-muted">Найдено пользователей: {total}</p>

      {error ? <p className="text-sm text-critical">{error}</p> : null}
      {loading ? <p className="text-sm text-muted">Загрузка...</p> : null}

      {!loading && items.length === 0 ? <EmptyState title="Пользователи не найдены" description="Измените фильтры или добавьте нового пользователя." /> : null}

      <UsersTable items={items} currentUserId={currentUserId} onEdit={setEditUser} onResetPassword={setResetUser} onRevokeSessions={setRevokeUser} />
      <UsersCards items={items} onEdit={setEditUser} onResetPassword={setResetUser} onRevokeSessions={setRevokeUser} />

      <UserCreateModal open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={handleCreate} />
      <UserEditModal open={Boolean(editUser)} user={editUser} isSelf={editUser?.id === currentUserId} onClose={() => setEditUser(null)} onSubmit={handleEdit} />
      <UserResetPasswordModal open={Boolean(resetUser)} user={resetUser} onClose={() => setResetUser(null)} onSubmit={handleReset} />
      <UserRevokeSessionsModal open={Boolean(revokeUser)} user={revokeUser} onClose={() => setRevokeUser(null)} onConfirm={() => void handleRevokeSessions()} loading={revokeLoading} />

      {toast ? <Toast message={toast} onClose={() => setToast('')} /> : null}
    </main>
  );
}
