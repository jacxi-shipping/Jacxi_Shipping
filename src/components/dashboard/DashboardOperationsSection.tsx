import Link from 'next/link';
import { Activity, DollarSign, Package, Ship, Truck } from 'lucide-react';
import { Button, EmptyState } from '@/components/design-system';
import { DashboardGrid, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import ShipmentCalculator from '@/components/dashboard/ShipmentCalculator';
import { hasPermission } from '@/lib/rbac';

type ShipmentStatusStat = {
  status: string;
  _count: number;
};

type DispatchStat = {
  status: string;
  label: string;
  count: number;
};

type RecentDispatch = {
  id: string;
  referenceNumber: string;
  statusLabel: string;
  origin: string;
  destination: string;
  company: {
    name: string;
  };
  _count: {
    shipments: number;
  };
};

type DashboardOperationsSectionProps = {
  role: string | undefined;
  canManageDispatches: boolean;
  shipmentStats: ShipmentStatusStat[];
  dispatchStats: DispatchStat[];
  recentDispatches: RecentDispatch[];
};

export default function DashboardOperationsSection({
  role,
  canManageDispatches,
  shipmentStats,
  dispatchStats,
  recentDispatches,
}: DashboardOperationsSectionProps) {
  return (
    <DashboardGrid className="grid-cols-1 lg:grid-cols-3">
      <div className="lg:col-span-2" id="shipment-calculator">
        <ShipmentCalculator />
      </div>

      <div className="space-y-6">
        <div id="quick-actions">
          <DashboardPanel title="Quick Actions" noBodyPadding>
            <div className="divide-y divide-border">
              {hasPermission(role, 'shipments:manage') && (
                <Link href="/dashboard/shipments/new" className="group block p-4 transition-colors hover:bg-background/50">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500 transition-colors group-hover:bg-blue-500 group-hover:text-white">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-primary">New Shipment</p>
                      <p className="text-xs text-muted-foreground">Add a vehicle to inventory</p>
                    </div>
                  </div>
                </Link>
              )}

              {hasPermission(role, 'containers:manage') && (
                <Link href="/dashboard/containers/new" className="group block p-4 transition-colors hover:bg-background/50">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-500 transition-colors group-hover:bg-indigo-500 group-hover:text-white">
                      <Ship className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-primary">New Container</p>
                      <p className="text-xs text-muted-foreground">Create shipping container</p>
                    </div>
                  </div>
                </Link>
              )}

              {canManageDispatches && (
                <Link href="/dashboard/dispatches" className="group block p-4 transition-colors hover:bg-background/50">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-primary">Manage Dispatches</p>
                      <p className="text-xs text-muted-foreground">Track yard-to-port movement</p>
                    </div>
                  </div>
                </Link>
              )}

              <Link href="/dashboard/finance" className="group block p-4 transition-colors hover:bg-background/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-500/10 p-2 text-green-500 transition-colors group-hover:bg-green-500 group-hover:text-white">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">Finance</p>
                    <p className="text-xs text-muted-foreground">View ledgers & invoices</p>
                  </div>
                </div>
              </Link>

              <Link href="/dashboard/shipments" className="group block p-4 transition-colors hover:bg-background/50">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500 transition-colors group-hover:bg-amber-500 group-hover:text-white">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary">Track Shipments</p>
                    <p className="text-xs text-muted-foreground">View all shipment statuses</p>
                  </div>
                </div>
              </Link>
            </div>
          </DashboardPanel>
        </div>

        <DashboardPanel title="Shipment Status">
          <div className="grid grid-cols-2 gap-3">
            {shipmentStats.map((stat) => (
              <div key={stat.status} className="flex flex-col rounded-lg border border-border bg-background p-3">
                <span className="mb-1 truncate text-xs text-gray-500 capitalize">{stat.status.replace('_', ' ').toLowerCase()}</span>
                <span className="text-lg font-bold text-primary">{stat._count}</span>
              </div>
            ))}
          </div>
        </DashboardPanel>

        {canManageDispatches && (
          <DashboardPanel title="Dispatch Pipeline" description="Current origin-to-port workload">
            {dispatchStats.length === 0 ? (
              <EmptyState
                icon={<Truck className="w-8 h-8" />}
                title="No dispatch activity yet"
                description="Create a dispatch to track yard-to-port movements and handoff readiness."
                action={
                  <Button href="/dashboard/dispatches" variant="primary" size="sm">
                    Open Dispatches
                  </Button>
                }
              />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {dispatchStats.map((stat) => (
                    <div key={stat.status} className="flex flex-col rounded-lg border border-border bg-background p-3">
                      <span className="mb-1 truncate text-xs text-gray-500">{stat.label}</span>
                      <span className="text-lg font-bold text-primary">{stat.count}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Active dispatches</p>
                    <Button href="/dashboard/dispatches" variant="ghost" size="sm">
                      View all
                    </Button>
                  </div>

                  {recentDispatches.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active dispatches right now.</p>
                  ) : (
                    <div className="space-y-2">
                      {recentDispatches.map((dispatch) => (
                        <Link
                          key={dispatch.id}
                          href={`/dashboard/dispatches/${dispatch.id}`}
                          className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 transition-colors hover:bg-background/70"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-primary">{dispatch.referenceNumber}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {dispatch.company.name} • {dispatch.origin} to {dispatch.destination}
                            </p>
                          </div>
                          <div className="ml-3 text-right">
                            <p className="text-xs font-semibold text-primary">{dispatch._count.shipments} shipments</p>
                            <p className="text-xs text-muted-foreground">{dispatch.statusLabel}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DashboardPanel>
        )}
      </div>
    </DashboardGrid>
  );
}