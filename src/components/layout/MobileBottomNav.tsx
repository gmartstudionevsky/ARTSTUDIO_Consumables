'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { useUiText } from '@/components/ui-texts/useUiText';
import { getMobileNavItems, mobileMoreItem } from '@/lib/navigation';
import type { NavItem, UserRole } from '@/lib/navigation';
import { cn } from '@/lib/utils';

type MeResponse = {
  user: {
    role: UserRole;
  };
};

const PRIMARY_NAV_COUNT = 4;

export function MobileBottomNav(): JSX.Element {
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | undefined>(undefined);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  useEffect(() => {
    async function fetchRole(): Promise<void> {
      const response = await fetch('/api/auth/me', { cache: 'no-store' });
      if (!response.ok) return;
      const data = (await response.json()) as MeResponse;
      setRole(data.user.role);
    }

    void fetchRole();
  }, []);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  const mobileNavItems = useMemo(() => getMobileNavItems(role), [role]);
  const primaryItems = mobileNavItems.slice(0, PRIMARY_NAV_COUNT);
  const secondaryItems = mobileNavItems.slice(PRIMARY_NAV_COUNT);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface px-2 py-2 md:hidden">
      {isMoreOpen && secondaryItems.length > 0 ? (
        <div id="mobile-more-menu" className="absolute bottom-16 right-2 z-30 w-56 rounded-md border border-border bg-bg p-2 shadow-lg">
          <ul className="space-y-1">
            {secondaryItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    pathname === item.href ? 'bg-surface text-text' : 'text-muted'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <NavItemLabel labelKey={item.label.key} fallback={item.label.fallback} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="grid grid-cols-5 gap-1">
        {primaryItems.map((item) => (
          <li key={item.href}>
            <NavItemButton item={item} isActive={pathname === item.href} />
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => setIsMoreOpen((value) => !value)}
            className={cn(
              'flex min-h-10 w-full flex-col items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              isMoreOpen ? 'bg-bg text-text' : 'text-muted'
            )}
            aria-expanded={isMoreOpen}
            aria-controls="mobile-more-menu"
          >
            <mobileMoreItem.icon className="h-4 w-4" />
            <NavItemLabel labelKey={mobileMoreItem.label.key} fallback={mobileMoreItem.label.fallback} />
          </button>
        </li>
      </ul>
    </nav>
  );
}

function NavItemButton({ item, isActive }: { item: NavItem; isActive: boolean }): JSX.Element {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        'flex min-h-10 flex-col items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        isActive ? 'bg-bg text-text' : 'text-muted'
      )}
    >
      <Icon className="h-4 w-4" />
      <NavItemLabel labelKey={item.label.key} fallback={item.label.fallback} />
    </Link>
  );
}

function NavItemLabel({ labelKey, fallback }: { labelKey: string; fallback: string }): JSX.Element {
  const label = useUiText(labelKey, fallback);
  return <span>{label}</span>;
}
