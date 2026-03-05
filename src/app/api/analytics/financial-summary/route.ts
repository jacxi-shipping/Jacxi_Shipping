import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from '@/lib/rbac';

/**
 * GET /api/analytics/financial-summary
 * Returns comprehensive financial analytics including revenue, expenses, profit margins
 * Query params: startDate, endDate (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !hasPermission(session.user?.role, 'analytics:view')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Get all invoices in the period
    const invoices = await prisma.userInvoice.findMany({
      where: dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {},
      include: {
        lineItems: true,
        container: {
          include: {
            shipments: {
              select: {
                serviceType: true,
              },
            },
          },
        },
      },
    });

    // Get all container expenses in the period
    const containerExpenses = await prisma.containerExpense.findMany({
      where: dateFilter.gte || dateFilter.lte ? { createdAt: dateFilter } : {},
      include: {
        container: true,
      },
    });

    // Calculate revenue by service type
    let purchaseRevenue = 0;
    let shippingRevenue = 0;
    let insuranceRevenue = 0;
    let totalRevenue = 0;

    invoices.forEach((invoice) => {
      invoice.lineItems.forEach((item) => {
        totalRevenue += item.amount;

        if (item.type === "PURCHASE_PRICE") {
          purchaseRevenue += item.amount;
        } else if (item.type === "VEHICLE_PRICE") {
          shippingRevenue += item.amount;
        } else if (item.type === "INSURANCE") {
          insuranceRevenue += item.amount;
        } else if (item.type === "SHIPPING_FEE") {
          // This is allocated container expenses
          shippingRevenue += item.amount;
        }
      });
    });

    // Calculate total expenses
    const totalExpenses = containerExpenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );

    // Calculate profit metrics
    const grossProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Count by service type (from container's shipments)
    let purchaseAndShippingCount = 0;
    let shippingOnlyCount = 0;
    let purchaseAndShippingRevenue = 0;
    let shippingOnlyRevenue = 0;

    invoices.forEach((invoice) => {
      const shipments = invoice.container?.shipments || [];
      const hasPurchaseAndShipping = shipments.some(s => s.serviceType === "PURCHASE_AND_SHIPPING");
      const hasShippingOnly = shipments.some(s => s.serviceType === "SHIPPING_ONLY");
      
      if (hasPurchaseAndShipping) {
        purchaseAndShippingCount++;
        purchaseAndShippingRevenue += invoice.total;
      } else if (hasShippingOnly) {
        shippingOnlyCount++;
        shippingOnlyRevenue += invoice.total;
      }
    });

    // Calculate averages
    const avgRevenuePerInvoice = invoices.length > 0 ? totalRevenue / invoices.length : 0;
    const avgProfitPerInvoice = invoices.length > 0 ? grossProfit / invoices.length : 0;

    // Payment status breakdown
    const paidInvoices = invoices.filter((inv) => inv.status === "PAID").length;
    const pendingInvoices = invoices.filter((inv) => inv.status === "PENDING").length;
    const overdueInvoices = invoices.filter((inv) => inv.status === "OVERDUE").length;
    const cancelledInvoices = invoices.filter((inv) => inv.status === "CANCELLED").length;

    const paidAmount = invoices
      .filter((inv) => inv.status === "PAID")
      .reduce((sum, inv) => sum + inv.total, 0);
    const pendingAmount = invoices
      .filter((inv) => inv.status === "PENDING")
      .reduce((sum, inv) => sum + inv.total, 0);
    const overdueAmount = invoices
      .filter((inv) => inv.status === "OVERDUE")
      .reduce((sum, inv) => sum + inv.total, 0);

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalExpenses,
        grossProfit,
        profitMargin: Number(profitMargin.toFixed(2)),
        invoiceCount: invoices.length,
        avgRevenuePerInvoice: Number(avgRevenuePerInvoice.toFixed(2)),
        avgProfitPerInvoice: Number(avgProfitPerInvoice.toFixed(2)),
      },
      revenueBreakdown: {
        purchaseRevenue,
        shippingRevenue,
        insuranceRevenue,
        other: totalRevenue - purchaseRevenue - shippingRevenue - insuranceRevenue,
      },
      serviceTypeBreakdown: {
        purchaseAndShipping: {
          count: purchaseAndShippingCount,
          revenue: purchaseAndShippingRevenue,
        },
        shippingOnly: {
          count: shippingOnlyCount,
          revenue: shippingOnlyRevenue,
        },
      },
      paymentStatus: {
        paid: { count: paidInvoices, amount: paidAmount },
        pending: { count: pendingInvoices, amount: pendingAmount },
        overdue: { count: overdueInvoices, amount: overdueAmount },
        cancelled: { count: cancelledInvoices, amount: 0 },
      },
      expenses: {
        total: totalExpenses,
        count: containerExpenses.length,
        avgPerExpense: containerExpenses.length > 0 ? totalExpenses / containerExpenses.length : 0,
      },
      period: {
        startDate: startDate || "All time",
        endDate: endDate || "Present",
      },
    });
  } catch (error) {
    console.error("Error fetching financial summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch financial summary" },
      { status: 500 }
    );
  }
}
