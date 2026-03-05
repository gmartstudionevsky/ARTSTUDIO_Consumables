import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export type UsersFiltersState = {
  q: string;
  role: 'all' | 'SUPERVISOR' | 'MANAGER' | 'ADMIN';
  active: 'all' | 'true' | 'false';
};

export function UsersFilters({ value, onChange, onCreate }: { value: UsersFiltersState; onChange: (next: UsersFiltersState) => void; onCreate: () => void }): JSX.Element {
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_220px_220px_auto] md:items-end">
      <Input label="Поиск" placeholder="Логин" value={value.q} onChange={(event) => onChange({ ...value, q: event.target.value })} />
      <Select label="Роль" value={value.role} onChange={(event) => onChange({ ...value, role: event.target.value as UsersFiltersState['role'] })}>
        <option value="all">Все</option>
        <option value="SUPERVISOR">Супервайзер</option>
        <option value="MANAGER">Руководитель</option>
        <option value="ADMIN">Админ</option>
      </Select>
      <Select label="Активность" value={value.active} onChange={(event) => onChange({ ...value, active: event.target.value as UsersFiltersState['active'] })}>
        <option value="all">Все</option>
        <option value="true">Активные</option>
        <option value="false">Отключённые</option>
      </Select>
      <Button className="md:mb-[1px]" onClick={onCreate}>Добавить пользователя</Button>
    </div>
  );
}
