import { APP_NAME } from '@/lib/constants';

export function TopBar(): JSX.Element {
  return (
    <header className="border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">{APP_NAME}</p>
        <div className="text-xs text-slate-500">Действия скоро появятся</div>
      </div>
    </header>
  );
}
