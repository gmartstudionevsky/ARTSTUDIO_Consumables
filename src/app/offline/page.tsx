import Link from 'next/link';

export default function OfflinePage(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10 text-center">
      <h1 className="text-3xl font-semibold text-slate-900">Нет подключения к сети</h1>
      <p className="mt-3 text-sm text-slate-600">
        Вы сейчас офлайн. Проверьте интернет-соединение и попробуйте снова открыть нужную страницу.
      </p>
      <Link href="/stock" className="mx-auto mt-6 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
        Вернуться на /stock
      </Link>
    </main>
  );
}
