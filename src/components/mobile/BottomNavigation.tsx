'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Ship, Package, FileText, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Home', href: '/dashboard' },
  { icon: Ship, label: 'Shipments', href: '/dashboard/shipments' },
  { icon: Package, label: 'Containers', href: '/dashboard/containers' },
  { icon: FileText, label: 'Invoices', href: '/dashboard/invoices' },
  { icon: Menu, label: 'More', href: '/dashboard/settings' },
];

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[var(--panel)] border-t border-[var(--border)] safe-area-inset-bottom"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors',
                'min-w-0 px-2',
                isActive
                  ? 'text-[var(--accent-gold)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-xs font-medium truncate w-full text-center">
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-[var(--accent-gold)] rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
