import Link from 'next/link';

export default function AdminUsersPage(): JSX.Element {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <Link href="/stock" className="inline-flex text-sm font-medium text-slate-700 hover:text-slate-900">
        ← Назад в основную панель
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900">Пользователи</h1>
      <p className="text-sm text-slate-600">Здесь будет управление пользователями и доступами.</p>
    </main>
  );
}
