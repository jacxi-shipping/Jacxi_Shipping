import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import {
  DashboardSurface,
  DashboardHeader,
  DashboardPanel,
  DashboardGrid
} from '@/components/dashboard/DashboardSurface';
import UserBalancesTable from './UserBalancesTable';
import {
  StatsCard,
  Button,
} from '@/components/design-system';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  PlusCircle,
  AlertCircle,
  CheckCircle,
    Building2,
        Truck,
        HandCoins,
} from 'lucide-react';

// Force dynamic rendering (requires database connection)
export const dynamic = 'force-dynamic';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

async function getFinancialData(userId: string | undefined, isAdmin: boolean) {
    // Basic permissions check logic for data scope
    const whereUserId = isAdmin ? undefined : userId;

    // 1. Ledger Summary
    // Admin sees all, User sees own.
    const ledgerWhere = whereUserId ? { userId: whereUserId } : {};
    
    const ledgerSummary = await prisma.ledgerEntry.groupBy({
        by: ['type'],
        where: ledgerWhere,
        _sum: {
            amount: true,
        },
        _count: {
            id: true,
        },
    });

    const totalDebit = ledgerSummary.find(e => e.type === 'DEBIT')?._sum.amount || 0;
    const totalCredit = ledgerSummary.find(e => e.type === 'CREDIT')?._sum.amount || 0;
    const netBalance = totalDebit - totalCredit;

    // 2. Shipment Summary
    const shipmentWhere = whereUserId ? { userId: whereUserId } : {};
    const shipmentSummaryRaw = await prisma.shipment.groupBy({
        by: ['paymentStatus'],
        where: shipmentWhere,
        _sum: {
            price: true,
        },
        _count: {
            id: true,
        },
    });

    const paidShipments = shipmentSummaryRaw.find(s => s.paymentStatus === 'COMPLETED') || { _count: { id: 0 }, _sum: { price: 0 } };
    const dueShipments = shipmentSummaryRaw.find(s => s.paymentStatus === 'PENDING') || { _count: { id: 0 }, _sum: { price: 0 } };

    // 3. User Balances (Admin only)
    let userBalances: Array<{ userId: string; userName: string; currentBalance: number }> = [];
    
    if (isAdmin) {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                ledgerEntries: {
                    orderBy: { transactionDate: 'desc' },
                    take: 1,
                    select: { balance: true },
                },
            },
        });

        // Filter only users with non-zero balance for the top list
        userBalances = users
            .map(user => ({
                userId: user.id,
                userName: user.name || user.email,
                currentBalance: user.ledgerEntries[0]?.balance || 0,
            }))
            .filter(u => Math.abs(u.currentBalance) > 0.01) // Filter out zero balances
            .sort((a, b) => Math.abs(b.currentBalance) - Math.abs(a.currentBalance)) // Sort by magnitude
            .slice(0, 10); // Top 10
    }

        const [activeUsersCount, dispatchStats, dispatchExpenseSummary] = await Promise.all([
                isAdmin ? prisma.user.count() : Promise.resolve(1),
                isAdmin
                        ? prisma.dispatch.groupBy({
                                by: ['status'],
                                _count: true,
                            })
                        : Promise.resolve([]),
                isAdmin
                        ? prisma.dispatchExpense.aggregate({
                                _sum: { amount: true },
                                _count: { id: true },
                            })
                        : Promise.resolve({ _sum: { amount: 0 }, _count: { id: 0 } }),
        ]);

    return {
        ledger: {
            totalDebit,
            totalCredit,
            netBalance
        },
        shipments: {
            paid: { count: paidShipments._count.id, amount: paidShipments._sum.price || 0 },
            due: { count: dueShipments._count.id, amount: dueShipments._sum.price || 0 }
        },
        userBalances,
        activeUsersCount,
        dispatches: {
            active: dispatchStats.reduce((total, entry) => {
                return ['PENDING', 'DISPATCHED', 'ARRIVED_AT_PORT'].includes(entry.status)
                    ? total + entry._count
                    : total;
            }, 0),
            totalSpend: dispatchExpenseSummary._sum.amount || 0,
            expenseCount: dispatchExpenseSummary._count.id || 0,
        },
    };
}

export default async function FinancePage() {
    const session = await auth();
    if (!session?.user) redirect('/auth/signin');

    const isAdmin = session.user.role === 'admin';
    const data = await getFinancialData(session.user.id, isAdmin);

    return (
        <DashboardSurface>
            <DashboardHeader 
                title="Accounting & Finance"
                description="Manage ledgers, payments, and financial reports"
                actions={
                    isAdmin && (
                        <Link href="/dashboard/finance/record-payment">
                            <Button variant="primary" icon={<PlusCircle className="w-4 h-4" />}>
                                Record Payment
                            </Button>
                        </Link>
                    )
                }
            />

            {/* Summary Stats */}
            <DashboardGrid className={isAdmin ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}>
                <StatsCard
                    icon={<TrendingUp className="w-5 h-5" />}
                    title="Total Debit"
                    value={formatCurrency(data.ledger.totalDebit)}
                    variant="error"
                />
                <StatsCard
                    icon={<TrendingDown className="w-5 h-5" />}
                    title="Total Credit"
                    value={formatCurrency(data.ledger.totalCredit)}
                    variant="success"
                />
                <StatsCard
                    icon={<DollarSign className="w-5 h-5" />}
                    title="Net Balance"
                    value={formatCurrency(Math.abs(data.ledger.netBalance))}
                    subtitle={data.ledger.netBalance > 0 ? "Receivable" : "Payable"}
                    variant={data.ledger.netBalance >= 0 ? 'success' : 'error'}
                    trend={{ 
                        value: 0, 
                        isPositive: data.ledger.netBalance >= 0
                    }}
                />
                <StatsCard
                    icon={<Users className="w-5 h-5" />}
                    title={isAdmin ? "Users with Balance" : "Active Status"}
                    value={isAdmin ? data.userBalances.length : "Active"}
                    variant="info"
                />
                {isAdmin && (
                    <StatsCard
                        icon={<Truck className="w-5 h-5" />}
                        title="Active Dispatches"
                        value={data.dispatches.active}
                        subtitle="Origin to port workflow"
                        variant="warning"
                    />
                )}
                {isAdmin && (
                    <StatsCard
                        icon={<HandCoins className="w-5 h-5" />}
                        title="Dispatch Spend"
                        value={formatCurrency(data.dispatches.totalSpend)}
                        subtitle={`${data.dispatches.expenseCount} expense entries`}
                        variant="secondary"
                    />
                )}
            </DashboardGrid>

            {/* Shipment Payment Status */}
            <DashboardPanel title="Shipment Payment Status" description="Overview of paid and pending shipments">
                <DashboardGrid className="grid-cols-1 md:grid-cols-2">
                    {/* Paid Shipments Box */}
                    <div className="p-5 rounded-xl border border-green-200/50 bg-green-50/50 dark:border-green-800/30 dark:bg-green-900/10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold text-primary">Paid Shipments</h4>
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                                {data.shipments.paid.count}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Total: {formatCurrency(data.shipments.paid.amount)}
                            </p>
                        </div>
                    </div>

                    {/* Due Shipments Box */}
                    <div className="p-5 rounded-xl border border-amber-200/50 bg-amber-50/50 dark:border-amber-800/30 dark:bg-amber-900/10 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold text-primary">Due Shipments</h4>
                            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                                {data.shipments.due.count}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Total: {formatCurrency(data.shipments.due.amount)}
                            </p>
                        </div>
                    </div>
                </DashboardGrid>
            </DashboardPanel>

            {isAdmin && (
                <DashboardPanel title="Dispatch Finance Snapshot" description="Operational dispatch costs and workload">
                    <DashboardGrid className="grid-cols-1 md:grid-cols-2">
                        <div className="p-5 rounded-xl border border-blue-200/50 bg-blue-50/50 dark:border-blue-800/30 dark:bg-blue-900/10 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Truck className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-semibold text-primary">Active Dispatches</h4>
                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                                    {data.dispatches.active}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Pending, dispatched, and port-arrived dispatches
                                </p>
                            </div>
                        </div>

                        <div className="p-5 rounded-xl border border-rose-200/50 bg-rose-50/50 dark:border-rose-800/30 dark:bg-rose-900/10 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                                <HandCoins className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-semibold text-primary">Dispatch Expenses</h4>
                                <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                                    {formatCurrency(data.dispatches.totalSpend)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Across {data.dispatches.expenseCount} dispatch expense records
                                </p>
                            </div>
                        </div>
                    </DashboardGrid>
                </DashboardPanel>
            )}

            {/* Quick Actions & User Balances */}
            <DashboardGrid className={isAdmin ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"}>
                
                {/* Quick Actions */}
                <DashboardPanel 
                    title="Quick Actions" 
                    className={isAdmin && data.userBalances.length > 0 ? "lg:col-span-1" : "lg:col-span-3"}
                >
                    <div className="grid grid-cols-1 gap-3">
                         <Link href="/dashboard/finance/ledger">
                            <div className="p-4 rounded-xl border border-border bg-panel hover:border-cyan-400/50 hover:shadow-lg transition-all cursor-pointer group">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-9 h-9 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <span className="font-semibold text-primary">My Ledger</span>
                                </div>
                                <p className="text-xs text-muted-foreground">View your transaction history</p>
                            </div>
                        </Link>

                        {isAdmin && (
                            <>
                                <Link href="/dashboard/finance/admin/ledgers">
                                    <div className="p-4 rounded-xl border border-border bg-panel hover:border-amber-400/50 hover:shadow-lg transition-all cursor-pointer group">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <span className="font-semibold text-primary">User Ledgers</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Manage all user accounts</p>
                                    </div>
                                </Link>

                                <Link href="/dashboard/finance/reports">
                                    <div className="p-4 rounded-xl border border-border bg-panel hover:border-purple-400/50 hover:shadow-lg transition-all cursor-pointer group">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <span className="font-semibold text-primary">Financial Reports</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Generate detailed analysis</p>
                                    </div>
                                </Link>

                                <Link href="/dashboard/finance/companies">
                                    <div className="p-4 rounded-xl border border-border bg-panel hover:border-blue-400/50 hover:shadow-lg transition-all cursor-pointer group">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                                                <Building2 className="w-5 h-5" />
                                            </div>
                                            <span className="font-semibold text-primary">Company Ledgers</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Manage partner company accounts</p>
                                    </div>
                                </Link>
                            </>
                        )}
                    </div>
                </DashboardPanel>

                {/* Top User Balances (Admin Only) */}
                {isAdmin && data.userBalances.length > 0 && (
                    <DashboardPanel 
                        title="Outstanding Balances" 
                        description="Top users with dues"
                        className="lg:col-span-2"
                        noBodyPadding
                    >
                        <UserBalancesTable data={data.userBalances} />
                    </DashboardPanel>
                )}
            </DashboardGrid>
        </DashboardSurface>
    );
}
