import { APP_NAME } from '@/lib/constants';

export function TopBar(): JSX.Element {
  return (
    <header className="border-b border-border/80 bg-surface/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold tracking-tight text-text">{APP_NAME}</p>
      </div>
    </header>
  );
}
