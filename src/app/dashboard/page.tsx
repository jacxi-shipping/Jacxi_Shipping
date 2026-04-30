import { Suspense } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { 
    StatsCard, 
    Button, 
    EmptyState
} from '@/components/design-system';
import { ShipmentTrendsChart } from '@/components/charts/ShipmentTrendsChart';
import { ContainerUtilizationChart } from '@/components/charts/ContainerUtilizationChart';
import { 
    DashboardSurface, 
    DashboardGrid, 
    DashboardPanel, 
    DashboardHeader 
} from '@/components/dashboard/DashboardSurface';
import { 
    Ship, 
    Package, 
    DollarSign, 
    Activity, 
    Truck,
    AlertTriangle,
    Clock3,
    Anchor,
    Route,
} from 'lucide-react';

import ShipmentCalculator from '@/components/dashboard/ShipmentCalculator';
import OnboardingTour from '@/components/onboarding/OnboardingTour';

// Force dynamic rendering (requires database connection)
export const dynamic = 'force-dynamic';

// Helper for currency if not available
const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

const formatDateKey = (date: Date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized.toISOString().slice(0, 10);
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DASHBOARD_AGE_THRESHOLDS = {
    dispatchStuckDays: 7,
    releasedAwaitingTransitDays: 5,
} as const;

const differenceInWholeDays = (start: Date, end: Date) => {
    const utcStart = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
    const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
    return Math.max(0, Math.floor((utcEnd - utcStart) / MS_PER_DAY));
};

const formatShortDate = (value: Date | string | null | undefined) => {
    if (!value) return 'Unknown';

    return new Date(value).toLocaleDateString();
};

type DashboardExceptionItem = {
    id: string;
    title: string;
    subtitle: string;
    detail: string;
    href: string;
    severityLabel: string;
    ageDays: number;
};

async function getDashboardData(
    userId: string | undefined,
    options: {
        canReadAllShipments: boolean;
        canReadAllContainers: boolean;
        canReadAllInvoices: boolean;
        canManageDispatches: boolean;
    }
) {
    const trendDays = 14;
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (trendDays - 1));
    startDate.setHours(0, 0, 0, 0);

    const effectiveUserId = userId ?? '';
    const {
        canReadAllShipments,
        canReadAllContainers,
        canReadAllInvoices,
        canManageDispatches,
    } = options;
    const shipmentUserFilter = canReadAllShipments ? {} : { userId: effectiveUserId };
    const containerUserFilter = canReadAllContainers ? {} : { shipments: { some: { userId: effectiveUserId } } };
    const invoiceUserFilter = canReadAllInvoices ? {} : { userId: effectiveUserId };
    const dispatchVisibilityFilter = canManageDispatches
        ? canReadAllShipments
            ? {}
            : { shipments: { some: { userId: effectiveUserId } } }
        : null;
    const dispatchStatusLabels: Record<string, string> = {
        PENDING: 'Pending',
        DISPATCHED: 'Dispatched',
        ARRIVED_AT_PORT: 'Arrived At Port',
        COMPLETED: 'Completed',
        CANCELLED: 'Cancelled',
    };

    // Parallelize all independent DB queries
    const [
        activeShipmentsCount,
        activeContainersCount,
        pendingInvoices,
        shipmentStats,
        shipmentsInRange,
        shipmentWorkflowRecords,
        containerUtilization,
        dispatchStats,
        recentDispatches,
    ] = await Promise.all([
        // 1. KPI Stats
        prisma.shipment.count({
            where: {
                ...shipmentUserFilter,
                status: {
                    in: ['ON_HAND', 'DISPATCHING', 'IN_TRANSIT', 'IN_TRANSIT_TO_DESTINATION']
                }
            }
        }),

        prisma.container.count({
            where: {
                ...containerUserFilter,
                status: {
                    in: ['LOADED', 'IN_TRANSIT', 'ARRIVED_PORT', 'CUSTOMS_CLEARANCE']
                }
            }
        }),

        prisma.userInvoice.aggregate({
            _sum: {
                total: true
            },
            where: {
                ...invoiceUserFilter,
                status: {
                    in: ['PENDING', 'OVERDUE']
                }
            }
        }),

        // 3. Counts by Status for Chart/Progress
        prisma.shipment.groupBy({
            by: ['status'],
            _count: true,
            where: shipmentUserFilter,
        }),

        prisma.shipment.findMany({
            where: {
                ...shipmentUserFilter,
                createdAt: {
                    gte: startDate,
                },
            },
            select: {
                createdAt: true,
                status: true,
            },
        }),

        prisma.shipment.findMany({
            where: shipmentUserFilter,
            select: {
                id: true,
                vehicleMake: true,
                vehicleModel: true,
                vehicleYear: true,
                vehicleVIN: true,
                status: true,
                createdAt: true,
                dispatchId: true,
                containerId: true,
                transitId: true,
                dispatch: {
                    select: {
                        id: true,
                        referenceNumber: true,
                        dispatchDate: true,
                        estimatedArrival: true,
                        actualArrival: true,
                        status: true,
                    },
                },
                container: {
                    select: {
                        id: true,
                        containerNumber: true,
                        estimatedArrival: true,
                        actualArrival: true,
                        status: true,
                    },
                },
                transit: {
                    select: {
                        id: true,
                        referenceNumber: true,
                        dispatchDate: true,
                        estimatedDelivery: true,
                        actualDelivery: true,
                        status: true,
                    },
                },
            },
        }),

        prisma.container.findMany({
            where: containerUserFilter,
            select: {
                containerNumber: true,
                currentCount: true,
                maxCapacity: true,
            },
            orderBy: {
                updatedAt: 'desc',
            },
            take: 6,
        }),

        canManageDispatches && dispatchVisibilityFilter
            ? prisma.dispatch.groupBy({
                by: ['status'],
                _count: true,
                where: dispatchVisibilityFilter,
            })
            : Promise.resolve([]),

        canManageDispatches && dispatchVisibilityFilter
            ? prisma.dispatch.findMany({
                where: {
                    ...dispatchVisibilityFilter,
                    status: {
                        in: ['PENDING', 'DISPATCHED', 'ARRIVED_AT_PORT'],
                    },
                },
                select: {
                    id: true,
                    referenceNumber: true,
                    status: true,
                    origin: true,
                    destination: true,
                    dispatchDate: true,
                    estimatedArrival: true,
                    company: {
                        select: {
                            name: true,
                        },
                    },
                    _count: {
                        select: {
                            shipments: true,
                        },
                    },
                },
                orderBy: [
                    { updatedAt: 'desc' },
                    { createdAt: 'desc' },
                ],
                take: 4,
            })
            : Promise.resolve([]),
    ]);

    const shipmentTrendMap = new Map<string, { shipments: number; inTransit: number }>();
    for (let i = 0; i < trendDays; i += 1) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        shipmentTrendMap.set(formatDateKey(date), { shipments: 0, inTransit: 0 });
    }

    shipmentsInRange.forEach((shipment) => {
        const key = formatDateKey(shipment.createdAt);
        const current = shipmentTrendMap.get(key) ?? { shipments: 0, inTransit: 0 };
        current.shipments += 1;
        if (['DISPATCHING', 'IN_TRANSIT', 'IN_TRANSIT_TO_DESTINATION'].includes(shipment.status)) {
            current.inTransit += 1;
        }
        shipmentTrendMap.set(key, current);
    });

    const shipmentTrends = Array.from(shipmentTrendMap.entries()).map(([date, counts]) => ({
        date,
        shipments: counts.shipments,
        inTransit: counts.inTransit,
    }));

    const buildShipmentLabel = (shipment: (typeof shipmentWorkflowRecords)[number]) => {
        const vehicleLabel = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
            .filter(Boolean)
            .join(' ')
            .trim();

        if (shipment.vehicleVIN && vehicleLabel) {
            return `${vehicleLabel} (${shipment.vehicleVIN})`;
        }

        return shipment.vehicleVIN || vehicleLabel || `Shipment ${shipment.id.slice(0, 8)}`;
    };

    const now = new Date();
    const dispatchExceptions: DashboardExceptionItem[] = shipmentWorkflowRecords
        .filter((shipment) => !shipment.containerId && !shipment.transitId && ['ON_HAND', 'DISPATCHING'].includes(shipment.status))
        .map((shipment) => {
            const startedAt = shipment.dispatch?.dispatchDate ?? shipment.createdAt;
            const ageDays = differenceInWholeDays(startedAt, now);

            return {
                id: `dispatch-${shipment.id}`,
                title: buildShipmentLabel(shipment),
                subtitle: shipment.dispatch?.referenceNumber
                    ? `Dispatch ${shipment.dispatch.referenceNumber}`
                    : 'Awaiting dispatch progress',
                detail: `${ageDays} day${ageDays === 1 ? '' : 's'} in dispatch stage`,
                href: `/dashboard/shipments/${shipment.id}`,
                severityLabel: 'Dispatch aging',
                ageDays,
            };
        })
        .filter((item) => item.ageDays > DASHBOARD_AGE_THRESHOLDS.dispatchStuckDays)
        .sort((left, right) => right.ageDays - left.ageDays);

    const containerEtaExceptions: DashboardExceptionItem[] = shipmentWorkflowRecords
        .filter((shipment) => shipment.status === 'IN_TRANSIT' && shipment.container && !shipment.transitId)
        .map((shipment) => {
            const eta = shipment.container?.estimatedArrival;
            const overdueDays = eta ? differenceInWholeDays(eta, now) : 0;

            return {
                id: `container-${shipment.id}`,
                title: buildShipmentLabel(shipment),
                subtitle: shipment.container?.containerNumber
                    ? `Container ${shipment.container.containerNumber}`
                    : 'Container assigned',
                detail: eta
                    ? `ETA ${formatShortDate(eta)} missed by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`
                    : 'No ETA recorded',
                href: shipment.container?.id ? `/dashboard/containers/${shipment.container.id}` : `/dashboard/shipments/${shipment.id}`,
                severityLabel: 'Container ETA risk',
                ageDays: overdueDays,
            };
        })
        .filter((item) => item.ageDays > 0)
        .sort((left, right) => right.ageDays - left.ageDays);

    const releasedAwaitingTransitExceptions: DashboardExceptionItem[] = shipmentWorkflowRecords
        .filter((shipment) => shipment.status === 'RELEASED' && !shipment.transitId)
        .map((shipment) => {
            const referenceDate = shipment.container?.actualArrival ?? shipment.container?.estimatedArrival ?? shipment.createdAt;
            const ageDays = differenceInWholeDays(referenceDate, now);

            return {
                id: `released-${shipment.id}`,
                title: buildShipmentLabel(shipment),
                subtitle: shipment.container?.containerNumber
                    ? `Released from ${shipment.container.containerNumber}`
                    : 'Released and awaiting assignment',
                detail: `${ageDays} day${ageDays === 1 ? '' : 's'} waiting for transit`,
                href: `/dashboard/shipments/${shipment.id}`,
                severityLabel: 'Transit handoff queue',
                ageDays,
            };
        })
        .filter((item) => item.ageDays > DASHBOARD_AGE_THRESHOLDS.releasedAwaitingTransitDays)
        .sort((left, right) => right.ageDays - left.ageDays);

    const transitOverdueExceptionsByTransit = new Map<string, DashboardExceptionItem>();
    shipmentWorkflowRecords
        .filter((shipment) => shipment.transit && shipment.status !== 'DELIVERED')
        .forEach((shipment) => {
            const transit = shipment.transit;
            if (!transit?.estimatedDelivery || transit.actualDelivery || transit.status === 'DELIVERED') {
                return;
            }

            const overdueDays = differenceInWholeDays(transit.estimatedDelivery, now);
            if (overdueDays <= 0) {
                return;
            }

            const existing = transitOverdueExceptionsByTransit.get(transit.id);
            if (!existing || overdueDays > existing.ageDays) {
                transitOverdueExceptionsByTransit.set(transit.id, {
                    id: `transit-${transit.id}`,
                    title: `Transit ${transit.referenceNumber}`,
                    subtitle: buildShipmentLabel(shipment),
                    detail: `Est. delivery ${formatShortDate(transit.estimatedDelivery)} missed by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`,
                    href: `/dashboard/transits/${transit.id}`,
                    severityLabel: 'Delivery overdue',
                    ageDays: overdueDays,
                });
            }
        });

    const transitOverdueExceptions = Array.from(transitOverdueExceptionsByTransit.values()).sort(
        (left, right) => right.ageDays - left.ageDays,
    );

    const dashboardExceptions = [
        ...transitOverdueExceptions,
        ...containerEtaExceptions,
        ...releasedAwaitingTransitExceptions,
        ...dispatchExceptions,
    ]
        .sort((left, right) => right.ageDays - left.ageDays)
        .slice(0, 8);

    return {
        activeShipmentsCount,
        activeContainersCount,
        pendingRevenue: pendingInvoices._sum.total || 0,
        shipmentStats,
        shipmentTrends,
        containerUtilization: containerUtilization.map((container) => ({
            containerNumber: container.containerNumber,
            utilization: container.currentCount,
            capacity: container.maxCapacity,
        })),
        activeDispatchesCount: dispatchStats.reduce((total, stat) => {
            return ['PENDING', 'DISPATCHED', 'ARRIVED_AT_PORT'].includes(stat.status)
                ? total + stat._count
                : total;
        }, 0),
        dispatchStats: dispatchStats.map((stat) => ({
            status: stat.status,
            label: dispatchStatusLabels[stat.status] ?? stat.status,
            count: stat._count,
        })),
        recentDispatches: recentDispatches.map((dispatch) => ({
            ...dispatch,
            statusLabel: dispatchStatusLabels[dispatch.status] ?? dispatch.status,
        })),
        agingMetrics: {
            dispatchStuckCount: dispatchExceptions.length,
            dispatchThresholdDays: DASHBOARD_AGE_THRESHOLDS.dispatchStuckDays,
            containerPastEtaCount: containerEtaExceptions.length,
            releasedAwaitingTransitCount: releasedAwaitingTransitExceptions.length,
            releasedAwaitingTransitThresholdDays: DASHBOARD_AGE_THRESHOLDS.releasedAwaitingTransitDays,
            transitsOverdueCount: transitOverdueExceptions.length,
            totalExceptions: dashboardExceptions.length,
            exceptions: dashboardExceptions,
        },
        canManageDispatches,
    };
}

export default async function DashboardPage() {
    const session = await auth();
    const role = session?.user?.role;
    const canReadAllShipments = hasPermission(role, 'shipments:read_all');
    const canReadAllContainers = hasPermission(role, 'containers:read_all');
    const canReadAllInvoices = hasPermission(role, 'invoices:manage');
    const canManageDispatches = hasPermission(role, 'dispatches:manage');
    const data = await getDashboardData(session?.user?.id, {
        canReadAllShipments,
        canReadAllContainers,
        canReadAllInvoices,
        canManageDispatches,
    });

    return (
        <DashboardSurface>
            
            {/* Header Section */}
            <div id="dashboard-header">
                <DashboardHeader
                    title="Overview"
                    description="Welcome back to Jacxi Shipping."
                    actions={<OnboardingTour autoStart={true} />}
                />
            </div>

            {/* KPI Cards */}
            <div id="stats-grid">
                <DashboardGrid className={data.canManageDispatches ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}>
                    <StatsCard
                        title="Active Shipments"
                        value={data.activeShipmentsCount}
                        icon={<Package className="w-5 h-5" />}
                        variant="default"
                        subtitle="On hand or moving"
                        trend={{ value: 0, isPositive: true }}
                    />
                    <StatsCard
                        title="Active Containers"
                        value={data.activeContainersCount}
                        icon={<Ship className="w-5 h-5" />}
                        variant="info"
                    />
                    <StatsCard
                        title="Pending Revenue"
                        value={formatMoney(data.pendingRevenue)}
                        icon={<DollarSign className="w-5 h-5" />}
                        variant="warning"
                    />
                    {data.canManageDispatches && (
                        <StatsCard
                            title="Active Dispatches"
                            value={data.activeDispatchesCount}
                            icon={<Truck className="w-5 h-5" />}
                            variant="success"
                            subtitle="Pending, dispatched, or at port"
                        />
                    )}
                </DashboardGrid>
            </div>

            <DashboardPanel
                title="Stage Aging Exceptions"
                description="Operational exceptions by workflow age and missed SLAs"
                actions={(
                    <Button href="/dashboard/shipments" variant="ghost" size="sm">
                        Open shipments
                    </Button>
                )}
            >
                <DashboardGrid className="grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
                    <StatsCard
                        title="Dispatch Aging"
                        value={data.agingMetrics.dispatchStuckCount}
                        icon={<Clock3 className="w-5 h-5" />}
                        variant="warning"
                        subtitle={`More than ${data.agingMetrics.dispatchThresholdDays} days in dispatch stage`}
                    />
                    <StatsCard
                        title="Past Container ETA"
                        value={data.agingMetrics.containerPastEtaCount}
                        icon={<Anchor className="w-5 h-5" />}
                        variant="error"
                        subtitle="Shipping-stage shipments past container ETA"
                    />
                    <StatsCard
                        title="Released Awaiting Transit"
                        value={data.agingMetrics.releasedAwaitingTransitCount}
                        icon={<Truck className="w-5 h-5" />}
                        variant="warning"
                        subtitle={`Released more than ${data.agingMetrics.releasedAwaitingTransitThresholdDays} days ago`}
                    />
                    <StatsCard
                        title="Transits Overdue"
                        value={data.agingMetrics.transitsOverdueCount}
                        icon={<Route className="w-5 h-5" />}
                        variant="error"
                        subtitle="Transit records beyond estimated delivery"
                    />
                </DashboardGrid>

                <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Exception queue</p>
                        <p className="text-xs text-muted-foreground">Top {data.agingMetrics.totalExceptions} active exceptions</p>
                    </div>

                    {data.agingMetrics.exceptions.length === 0 ? (
                        <EmptyState
                            icon={<AlertTriangle className="w-8 h-8" />}
                            title="No aging exceptions"
                            description="Dispatch, container, release, and transit SLA exceptions will appear here as they age."
                        />
                    ) : (
                        <div className="space-y-2">
                            {data.agingMetrics.exceptions.map((item) => (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    className="flex items-start justify-between gap-3 rounded-lg border border-border bg-background px-3 py-3 transition-colors hover:bg-background/70"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-primary truncate">{item.title}</p>
                                        <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                                        <p className="mt-1 text-xs text-primary">{item.detail}</p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--warning)]">{item.severityLabel}</p>
                                        <p className="text-sm font-semibold text-primary">{item.ageDays}d</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </DashboardPanel>

            <DashboardGrid className="grid-cols-1 xl:grid-cols-2">
                <div id="shipment-trends">
                    <DashboardPanel
                        title="Shipment Trends"
                        description="Last 14 days"
                    >
                        {data.shipmentTrends.every((item) => item.shipments === 0) ? (
                            <EmptyState
                                icon={<Activity className="w-8 h-8" />}
                                title="No shipment activity yet"
                                description="Create your first shipment to see trend data here."
                                action={(
                                    <Button href="/dashboard/shipments/new" variant="primary" size="sm">
                                        Add Shipment
                                    </Button>
                                )}
                            />
                        ) : (
                            <ShipmentTrendsChart data={data.shipmentTrends} />
                        )}
                    </DashboardPanel>
                </div>

                <div id="container-utilization">
                    <DashboardPanel
                        title="Container Utilization"
                        description="Most recent containers"
                    >
                        {data.containerUtilization.length === 0 ? (
                            <EmptyState
                                icon={<Ship className="w-8 h-8" />}
                                title="No containers yet"
                                description="Create a container to track utilization and capacity."
                                action={(
                                    <Button href="/dashboard/containers/new" variant="primary" size="sm">
                                        New Container
                                    </Button>
                                )}
                            />
                        ) : (
                            <ContainerUtilizationChart data={data.containerUtilization} />
                        )}
                    </DashboardPanel>
                </div>
            </DashboardGrid>

            {/* Main Content Grid */}
            <DashboardGrid className="grid-cols-1 lg:grid-cols-3">
                
                {/* Left Column: Calculator (2/3 width) */}
                <div className="lg:col-span-2" id="shipment-calculator">
                    <ShipmentCalculator />
                </div>

                {/* Right Column: Quick Actions & Status (1/3 width) */}
                <div className="space-y-6">
                    
                    {/* Quick Actions */}
                    <div id="quick-actions">
                        <DashboardPanel
                            title="Quick Actions"
                            noBodyPadding
                        >
                            <div className="divide-y divide-border">
                                {hasPermission(role, 'shipments:manage') && (
                                    <Link href="/dashboard/shipments/new" className="block p-4 hover:bg-background/50 transition-colors group">
                                        <div className="flex gap-3 items-center">
                                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
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
                                    <Link href="/dashboard/containers/new" className="block p-4 hover:bg-background/50 transition-colors group">
                                        <div className="flex gap-3 items-center">
                                            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                                <Ship className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-primary">New Container</p>
                                                <p className="text-xs text-muted-foreground">Create shipping container</p>
                                            </div>
                                        </div>
                                    </Link>
                                )}

                                {data.canManageDispatches && (
                                    <Link href="/dashboard/dispatches" className="block p-4 hover:bg-background/50 transition-colors group">
                                        <div className="flex gap-3 items-center">
                                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                                <Truck className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-primary">Manage Dispatches</p>
                                                <p className="text-xs text-muted-foreground">Track yard-to-port movement</p>
                                            </div>
                                        </div>
                                    </Link>
                                )}

                                <Link href="/dashboard/finance" className="block p-4 hover:bg-background/50 transition-colors group">
                                    <div className="flex gap-3 items-center">
                                        <div className="p-2 rounded-lg bg-green-500/10 text-green-500 group-hover:bg-green-500 group-hover:text-white transition-colors">
                                            <DollarSign className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-primary">Finance</p>
                                            <p className="text-xs text-muted-foreground">View ledgers & invoices</p>
                                        </div>
                                    </div>
                                </Link>

                                <Link href="/dashboard/shipments" className="block p-4 hover:bg-background/50 transition-colors group">
                                    <div className="flex gap-3 items-center">
                                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
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

                    {/* Shipment Status Distribution */}
                    <DashboardPanel
                        title="Shipment Status"
                    >
                         <div className="grid grid-cols-2 gap-3">
                            {data.shipmentStats.map((stat) => (
                                <div key={stat.status} className="p-3 bg-background rounded-lg border border-border flex flex-col">
                                    <span className="text-xs text-gray-500 mb-1 capitalize truncate">{stat.status.replace('_', ' ').toLowerCase()}</span>
                                    <span className="text-lg font-bold text-primary">{stat._count}</span>
                                </div>
                            ))}
                        </div>
                    </DashboardPanel>

                    {data.canManageDispatches && (
                        <DashboardPanel
                            title="Dispatch Pipeline"
                            description="Current origin-to-port workload"
                        >
                            {data.dispatchStats.length === 0 ? (
                                <EmptyState
                                    icon={<Truck className="w-8 h-8" />}
                                    title="No dispatch activity yet"
                                    description="Create a dispatch to track yard-to-port movements and handoff readiness."
                                    action={(
                                        <Button href="/dashboard/dispatches" variant="primary" size="sm">
                                            Open Dispatches
                                        </Button>
                                    )}
                                />
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        {data.dispatchStats.map((stat) => (
                                            <div key={stat.status} className="p-3 bg-background rounded-lg border border-border flex flex-col">
                                                <span className="text-xs text-gray-500 mb-1 truncate">{stat.label}</span>
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

                                        {data.recentDispatches.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No active dispatches right now.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {data.recentDispatches.map((dispatch) => (
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
        </DashboardSurface>
    );
}
