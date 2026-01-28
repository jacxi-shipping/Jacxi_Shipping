import { Suspense } from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/db';
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
    AlertCircle,
    CheckCircle2,
    Clock
} from 'lucide-react';

import ShipmentCalculator from '@/components/dashboard/ShipmentCalculator';

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

async function getDashboardData() {
    const trendDays = 14;
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (trendDays - 1));
    startDate.setHours(0, 0, 0, 0);

    // 1. KPI Stats
    const activeShipmentsCount = await prisma.shipment.count({
        where: {
            status: {
                in: ['ON_HAND', 'IN_TRANSIT']
            }
        }
    });

    const activeContainersCount = await prisma.container.count({
        where: {
            status: {
                in: ['LOADED', 'IN_TRANSIT', 'ARRIVED_PORT', 'CUSTOMS_CLEARANCE']
            }
        }
    });

    const pendingInvoices = await prisma.userInvoice.aggregate({
        _sum: {
            total: true
        },
        where: {
            status: {
                in: ['PENDING', 'OVERDUE']
            }
        }
    });

    // 3. Counts by Status for Chart/Progress
    const shipmentStats = await prisma.shipment.groupBy({
        by: ['status'],
        _count: true
    });

    const shipmentsInRange = await prisma.shipment.findMany({
        where: {
            createdAt: {
                gte: startDate,
            },
        },
        select: {
            createdAt: true,
            status: true,
        },
    });

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
        if (shipment.status === 'IN_TRANSIT') {
            current.inTransit += 1;
        }
        shipmentTrendMap.set(key, current);
    });

    const shipmentTrends = Array.from(shipmentTrendMap.entries()).map(([date, counts]) => ({
        date,
        shipments: counts.shipments,
        inTransit: counts.inTransit,
    }));

    const containerUtilization = await prisma.container.findMany({
        select: {
            containerNumber: true,
            currentCount: true,
            maxCapacity: true,
        },
        orderBy: {
            updatedAt: 'desc',
        },
        take: 6,
    });

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
    };
}

export default async function DashboardPage() {
    const data = await getDashboardData();

    return (
        <DashboardSurface>
            
            {/* Header Section */}
            <DashboardHeader 
                title="Overview"
                description="Welcome back to Jacxi Shipping."
            />

            {/* KPI Cards */}
            <DashboardGrid className="grid-cols-1 md:grid-cols-3">
                <StatsCard 
                    title="Active Shipments"
                    value={data.activeShipmentsCount}
                    icon={<Package className="w-5 h-5" />}
                    variant="default"
                    trend={{ value: 0, label: "vs last month", trend: 'neutral' }} 
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
            </DashboardGrid>

            <DashboardGrid className="grid-cols-1 xl:grid-cols-2">
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
            </DashboardGrid>

            {/* Main Content Grid */}
            <DashboardGrid className="grid-cols-1 lg:grid-cols-3">
                
                {/* Left Column: Calculator (2/3 width) */}
                <div className="lg:col-span-2">
                    <ShipmentCalculator />
                </div>

                {/* Right Column: Quick Actions & Status (1/3 width) */}
                <div className="space-y-6">
                    
                    {/* Quick Actions */}
                    <DashboardPanel
                        title="Quick Actions"
                        noBodyPadding
                    >
                        <div className="divide-y divide-border">
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

                </div>
            </DashboardGrid>
        </DashboardSurface>
    );
}
