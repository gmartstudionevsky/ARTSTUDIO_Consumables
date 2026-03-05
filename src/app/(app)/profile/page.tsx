import Link from 'next/link';

export default function ProfilePage(): JSX.Element {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Профиль</h1>
      <p className="max-w-2xl text-sm text-slate-600">Здесь будут настройки пользователя и персональные параметры.</p>
      <Link
        href="/health"
        className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Перейти к /health
      </Link>
    </section>
  );
}
