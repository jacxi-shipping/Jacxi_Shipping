import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlertTriangle, Bot, FileUp, PackagePlus, Receipt, Ship, Truck } from 'lucide-react';
import { Button } from '@/components/design-system';
import { hasPermission } from '@/lib/rbac';

type TodayWorkItem = {
  id: string;
  title: string;
  subtitle: string;
  detail: string;
  href: string;
  severityLabel: string;
  ageDays: number;
};

type RecentActivityItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  timestamp: string;
};

type DashboardTodayWorkProps = {
  role?: string;
  workItems: TodayWorkItem[];
  overdueInvoicesCount: number;
  pendingInvoicesCount: number;
  failedAiJobsCount: number;
  recentActivity: RecentActivityItem[];
};

function formatActivityTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  return date.toLocaleString();
}

export default function DashboardTodayWork({
  role,
  workItems,
  overdueInvoicesCount,
  pendingInvoicesCount,
  failedAiJobsCount,
  recentActivity,
}: DashboardTodayWorkProps) {
  const visibleQuickActions = [
    hasPermission(role, 'shipments:manage')
      ? {
          label: 'Create Shipment',
          href: '/dashboard/shipments/new',
          icon: <PackagePlus className="h-4 w-4" />,
        }
      : null,
    hasPermission(role, 'containers:manage')
      ? {
          label: 'Add Container',
          href: '/dashboard/containers/new',
          icon: <Ship className="h-4 w-4" />,
        }
      : null,
    hasPermission(role, 'dispatches:manage')
      ? {
          label: 'Open Dispatches',
          href: '/dashboard/dispatches',
          icon: <Truck className="h-4 w-4" />,
        }
      : null,
    hasPermission(role, 'invoices:manage')
      ? {
          label: 'Create Invoice',
          href: '/dashboard/invoices/new',
          icon: <Receipt className="h-4 w-4" />,
        }
      : null,
    hasPermission(role, 'finance:manage')
      ? {
          label: 'Upload Price List',
          href: '/dashboard/finance/companies',
          icon: <FileUp className="h-4 w-4" />,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; href: string; icon: ReactNode }>;

  const focusCards = [
    {
      label: 'Urgent Work',
      value: workItems.length,
      detail: workItems.length > 0 ? 'Open exceptions need review' : 'No operational exceptions',
      tone: workItems.length > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]',
    },
    {
      label: 'Overdue Invoices',
      value: overdueInvoicesCount,
      detail: overdueInvoicesCount > 0 ? 'Payment follow-up needed' : 'No overdue invoices',
      tone: overdueInvoicesCount > 0 ? 'text-[var(--error)]' : 'text-[var(--success)]',
    },
    {
      label: 'Pending Invoices',
      value: pendingInvoicesCount,
      detail: pendingInvoicesCount > 0 ? 'Awaiting payment or review' : 'No pending invoices',
      tone: pendingInvoicesCount > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]',
    },
    {
      label: 'AI Failures',
      value: failedAiJobsCount,
      detail: failedAiJobsCount > 0 ? 'Check AI logs/settings' : 'AI jobs healthy',
      tone: failedAiJobsCount > 0 ? 'text-[var(--error)]' : 'text-[var(--success)]',
    },
  ];

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">Priority Work</div>
          <div className="text-xs text-[var(--text-secondary)]">Urgent items and quick actions</div>
        </div>
        <Button href="/dashboard/shipments" variant="ghost" size="sm">
          Workbench
        </Button>
      </div>

      {/* Compact focus metrics - very light pills */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {focusCards.map((card) => (
          <div
            key={card.label}
            className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-secondary)]">
                {card.label}
              </span>
              <span className={`text-lg font-semibold tabular-nums ${card.tone}`}>{card.value}</span>
            </div>
            <div className="mt-0.5 text-[10px] text-[var(--text-secondary)] truncate">{card.detail}</div>
          </div>
        ))}
      </div>

      {/* Urgent items list - clean with subtle dividers */}
      <div className="mb-4">
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-secondary)]">
          Top exceptions
        </div>
        {workItems.length === 0 ? (
          <div className="rounded border border-dashed border-[var(--border)] bg-[var(--background)] p-3 text-xs text-[var(--text-secondary)]">
            No urgent items. All clear.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)] rounded border border-[var(--border)] bg-[var(--background)] text-sm">
            {workItems.slice(0, 4).map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-start justify-between gap-3 px-3 py-2.5 hover:bg-[var(--panel)] transition-colors"
              >
                <div className="flex min-w-0 gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--warning)]" />
                  <div className="min-w-0">
                    <div className="truncate font-medium text-[var(--text-primary)]">{item.title}</div>
                    <div className="truncate text-xs text-[var(--text-secondary)]">{item.subtitle}</div>
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs">
                  <div className="font-semibold text-[var(--text-primary)]">{item.ageDays}d</div>
                  <div className="text-[10px] text-[var(--warning)]">{item.severityLabel}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions - horizontal compact row */}
      <div>
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-secondary)]">
          Quick actions
        </div>
        <div className="flex flex-wrap gap-2">
          {visibleQuickActions.map((action) => (
            <Button
              key={action.href}
              href={action.href}
              variant="outline"
              size="sm"
              icon={action.icon}
              className="text-xs"
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Recent activity - very compact */}
      {recentActivity.length > 0 && (
        <div className="mt-4 border-t border-[var(--border)] pt-3">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-secondary)]">
            Recent
          </div>
          <div className="space-y-1 text-xs">
            {recentActivity.slice(0, 3).map((activity) => (
              <Link
                key={activity.id}
                href={activity.href}
                className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <Bot className="h-3 w-3 text-[var(--accent-gold)]" />
                <span className="truncate">{activity.label}: {activity.description}</span>
                <span className="ml-auto shrink-0 text-[10px] opacity-60">{formatActivityTime(activity.timestamp)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
