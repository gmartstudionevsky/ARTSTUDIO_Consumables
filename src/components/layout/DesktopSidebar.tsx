'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { mainNavItems } from '@/lib/navigation';
import { cn } from '@/lib/utils';

export function DesktopSidebar(): JSX.Element {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 border-r border-slate-200 bg-slate-50 p-4 md:block">
      <nav className="space-y-1">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-200'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
