import Link from 'next/link';
import type { ReactNode } from 'react';
import { AlertTriangle, Bot, FileUp, PackagePlus, Receipt, Ship, Truck } from 'lucide-react';
import { Button } from '@/components/design-system';
import { DashboardGrid, DashboardPanel } from '@/components/dashboard/DashboardSurface';
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
    <DashboardGrid className="grid-cols-1 xl:grid-cols-3">
      <DashboardPanel
        title="Today's Work"
        description="The highest priority items to clear first."
        className="xl:col-span-2"
        actions={
          <Button href="/dashboard/shipments" variant="ghost" size="sm">
            Open Workbench
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {focusCards.map((card) => (
              <div key={card.label} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{card.label}</p>
                <p className={`mt-1 text-2xl font-semibold ${card.tone}`}>{card.value}</p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{card.detail}</p>
              </div>
            ))}
          </div>

          {workItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)] p-5 text-sm text-[var(--text-secondary)]">
              No urgent operations right now. Use quick actions to create new work or review recent activity.
            </div>
          ) : (
            <div className="space-y-2">
              {workItems.slice(0, 4).map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-3 transition-all hover:border-[rgba(var(--accent-gold-rgb),0.45)] hover:bg-[var(--panel)]"
                >
                  <div className="flex min-w-0 gap-3">
                    <div className="mt-0.5 rounded-md border border-[rgba(var(--warning-rgb),0.3)] bg-[rgba(var(--warning-rgb),0.12)] p-1.5 text-[var(--warning)]">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                      <p className="truncate text-xs text-[var(--text-secondary)]">{item.subtitle}</p>
                      <p className="mt-1 text-xs text-[var(--text-primary)]">{item.detail}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--warning)]">{item.severityLabel}</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{item.ageDays}d</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </DashboardPanel>

      <div className="space-y-6">
        <DashboardPanel title="Quick Start" description="Common actions for today.">
          <div className="grid grid-cols-1 gap-2">
            {visibleQuickActions.map((action) => (
              <Button key={action.href} href={action.href} variant="outline" size="sm" icon={action.icon}>
                {action.label}
              </Button>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Recent Activity" description="Latest shipment updates.">
          {recentActivity.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)] p-4 text-sm text-[var(--text-secondary)]">
              No recent activity yet.
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((activity) => (
                <Link
                  key={activity.id}
                  href={activity.href}
                  className="block rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 transition-colors hover:bg-[var(--panel)]"
                >
                  <div className="flex items-start gap-2">
                    <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-gold)]" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{activity.label}</p>
                      <p className="mt-0.5 line-clamp-2 text-sm text-[var(--text-primary)]">{activity.description}</p>
                      <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{formatActivityTime(activity.timestamp)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </DashboardPanel>
      </div>
    </DashboardGrid>
  );
}
