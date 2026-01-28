import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Generate financial reports
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can view full financial reports
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'summary';
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause for date filtering
    const dateWhere: Record<string, unknown> = {};
    if (startDate || endDate) {
      dateWhere.createdAt = {};
      if (startDate) {
        (dateWhere.createdAt as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (dateWhere.createdAt as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    if (reportType === 'summary') {
      // Overall financial summary
      const where = userId ? { ...dateWhere, userId } : dateWhere;

      // Get total debits and credits
      const ledgerSummary = await prisma.ledgerEntry.groupBy({
        by: ['type'],
        where,
        _sum: {
          amount: true,
        },
        _count: {
          id: true,
        },
      });

      const totalDebit = ledgerSummary.find(e => e.type === 'DEBIT')?._sum.amount || 0;
      const totalCredit = ledgerSummary.find(e => e.type === 'CREDIT')?._sum.amount || 0;
      const debitCount = ledgerSummary.find(e => e.type === 'DEBIT')?._count.id || 0;
      const creditCount = ledgerSummary.find(e => e.type === 'CREDIT')?._count.id || 0;

      // Get shipment payment summary
      const shipmentSummary = await prisma.shipment.groupBy({
        by: ['paymentStatus'],
        where: userId ? { userId, ...dateWhere } : dateWhere,
        _sum: {
          price: true,
        },
        _count: {
          id: true,
        },
      });

      // Get user-wise balance summary
      const userBalances = await prisma.user.findMany({
        where: userId ? { id: userId } : undefined,
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

      const userBalanceSummary = userBalances.map(user => ({
        userId: user.id,
        userName: user.name || user.email,
        currentBalance: user.ledgerEntries[0]?.balance || 0,
      }));

      return NextResponse.json({
        reportType: 'summary',
        period: {
          startDate: startDate || 'All time',
          endDate: endDate || 'Now',
        },
        ledgerSummary: {
          totalDebit,
          totalCredit,
          netBalance: totalDebit - totalCredit,
          debitCount,
          creditCount,
        },
        shipmentSummary: shipmentSummary.map(s => ({
          status: s.paymentStatus,
          totalAmount: s._sum.price || 0,
          count: s._count.id,
        })),
        userBalances: userBalanceSummary,
      });
    } else if (reportType === 'user-wise') {
      // User-wise detailed report
      const users = await prisma.user.findMany({
        where: userId ? { id: userId } : undefined,
        select: {
          id: true,
          name: true,
          email: true,
          ledgerEntries: {
            where: dateWhere,
            orderBy: { transactionDate: 'desc' },
          },
          shipments: {
            where: dateWhere,
            select: {
              id: true,
              vehicleMake: true,
              vehicleModel: true,
              price: true,
              paymentStatus: true,
              paymentMode: true,
              createdAt: true,
            },
          },
        },
      });

      const userReports = users.map(user => {
        const totalDebit = user.ledgerEntries
          .filter(e => e.type === 'DEBIT')
          .reduce((sum, e) => sum + e.amount, 0);
        
        const totalCredit = user.ledgerEntries
          .filter(e => e.type === 'CREDIT')
          .reduce((sum, e) => sum + e.amount, 0);

        const currentBalance = user.ledgerEntries[0]?.balance || 0;

        const paidShipments = user.shipments.filter(s => s.paymentStatus === 'COMPLETED').length;
        const dueShipments = user.shipments.filter(s => s.paymentStatus === 'PENDING').length;

        return {
          userId: user.id,
          userName: user.name || user.email,
          email: user.email,
          totalDebit,
          totalCredit,
          currentBalance,
          shipmentStats: {
            total: user.shipments.length,
            paid: paidShipments,
            due: dueShipments,
          },
          recentLedgerEntries: user.ledgerEntries.slice(0, 10),
          recentShipments: user.shipments.slice(0, 10),
        };
      });

      return NextResponse.json({
        reportType: 'user-wise',
        period: {
          startDate: startDate || 'All time',
          endDate: endDate || 'Now',
        },
        users: userReports,
      });
    } else if (reportType === 'shipment-wise') {
      // Shipment-wise payment report with expenses and profit
      const where: Record<string, unknown> = { ...dateWhere };
      if (userId) {
        where.userId = userId;
      }

      const shipments = await prisma.shipment.findMany({
        where,
        select: {
          id: true,
          vehicleMake: true,
          vehicleModel: true,
          price: true,
          paymentStatus: true,
          paymentMode: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          ledgerEntries: {
            orderBy: { transactionDate: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const shipmentReports = shipments.map(shipment => {
        // Separate expenses from regular transactions
        const expenses = shipment.ledgerEntries.filter(e => 
          e.metadata && 
          typeof e.metadata === 'object' && 
          'isExpense' in e.metadata && 
          (e.metadata as Record<string, unknown>).isExpense === true
        );

        const regularTransactions = shipment.ledgerEntries.filter(e => 
          !e.metadata || 
          typeof e.metadata !== 'object' || 
          !('isExpense' in e.metadata) ||
          (e.metadata as Record<string, unknown>).isExpense !== true
        );

        const totalDebit = regularTransactions
          .filter(e => e.type === 'DEBIT')
          .reduce((sum, e) => sum + e.amount, 0);
        
        const totalCredit = regularTransactions
          .filter(e => e.type === 'CREDIT')
          .reduce((sum, e) => sum + e.amount, 0);

        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

        const amountDue = totalDebit - totalCredit;
        const revenue = totalCredit; // What was actually paid
        const profit = revenue - totalExpenses; // Revenue minus expenses

        return {
          shipmentId: shipment.id,
          vehicle: `${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''}`.trim() || 'N/A',
          price: shipment.price || 0,
          paymentStatus: shipment.paymentStatus,
          paymentMode: shipment.paymentMode,
          totalCharged: totalDebit,
          totalPaid: totalCredit,
          amountDue: Math.max(0, amountDue),
          totalExpenses,
          revenue,
          profit,
          profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
          expenses: expenses.map(e => ({
            id: e.id,
            description: e.description,
            amount: e.amount,
            type: (e.metadata as Record<string, unknown>)?.expenseType || 'OTHER',
            date: e.transactionDate,
          })),
          user: {
            id: shipment.user.id,
            name: shipment.user.name || shipment.user.email,
          },
          createdAt: shipment.createdAt,
          ledgerEntries: shipment.ledgerEntries,
        };
      });

      // Calculate overall summary
      const totalRevenue = shipmentReports.reduce((sum, s) => sum + s.revenue, 0);
      const totalExpenses = shipmentReports.reduce((sum, s) => sum + s.totalExpenses, 0);
      const totalProfit = totalRevenue - totalExpenses;
      const avgProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      return NextResponse.json({
        reportType: 'shipment-wise',
        period: {
          startDate: startDate || 'All time',
          endDate: endDate || 'Now',
        },
        summary: {
          totalRevenue,
          totalExpenses,
          totalProfit,
          avgProfitMargin,
          shipmentCount: shipmentReports.length,
        },
        shipments: shipmentReports,
      });
    } else {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error generating financial report:', error);
    return NextResponse.json(
      { error: 'Failed to generate financial report' },
      { status: 500 }
    );
  }
}
