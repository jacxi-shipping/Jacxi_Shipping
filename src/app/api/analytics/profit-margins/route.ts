import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from '@/lib/rbac';

/**
 * GET /api/analytics/profit-margins
 * Returns profit margin analysis by service type, container, and customer
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !hasPermission(session.user?.role, 'analytics:view')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all containers with their shipments, invoices, and expenses
    const containers = await prisma.container.findMany({
      include: {
        shipments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        userInvoices: {
          include: {
            lineItems: true,
          },
        },
        expenses: true,
      },
    });

    const profitAnalysis = containers.map((container) => {
      // Calculate total revenue from all invoices in this container
      const revenue = container.userInvoices.reduce((sum, invoice) => {
        return sum + invoice.lineItems.reduce((lineSum, item) => lineSum + item.amount, 0);
      }, 0);

      // Calculate total expenses
      const totalExpenses = container.expenses.reduce((sum, exp) => sum + exp.amount, 0);

      // Calculate total purchase costs (for PURCHASE_AND_SHIPPING shipments)
      const purchaseCosts = container.shipments.reduce((sum, shipment) => {
        return sum + (shipment.serviceType === "PURCHASE_AND_SHIPPING" ? (shipment.purchasePrice || 0) : 0);
      }, 0);

      // Calculate profit
      const totalCost = purchaseCosts + totalExpenses;
      const profit = revenue - totalCost;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

      // Service type breakdown
      const purchaseAndShippingCount = container.shipments.filter(
        s => s.serviceType === "PURCHASE_AND_SHIPPING"
      ).length;
      const shippingOnlyCount = container.shipments.filter(
        s => s.serviceType === "SHIPPING_ONLY"
      ).length;

      return {
        containerId: container.id,
        containerNumber: container.containerNumber,
        status: container.status,
        shipmentCount: container.shipments.length,
        serviceTypes: {
          purchaseAndShipping: purchaseAndShippingCount,
          shippingOnly: shippingOnlyCount,
        },
        revenue,
        costs: {
          purchaseCosts,
          containerExpenses: totalExpenses,
          total: totalCost,
        },
        profit,
        profitMargin: Number(profitMargin.toFixed(2)),
        invoiceCount: container.userInvoices.length,
        vehicles: container.shipments.map(s => ({
          id: s.id,
          vin: s.vehicleVIN,
          vehicle: `${s.vehicleYear} ${s.vehicleMake} ${s.vehicleModel}`,
          serviceType: s.serviceType,
          customer: s.user?.name || s.user?.email || "Unknown",
        })),
      };
    }).filter(c => c.shipmentCount > 0); // Only include containers with shipments

    // Calculate summary by service type
    // ⚡ Bolt: Calculate summary metrics in O(n) loop to replace 4 .reduce() chains
    let totalRevenueSum = 0;
    let totalCostsSum = 0;
    let totalProfitSum = 0;
    let totalProfitMarginSum = 0;

    for (const p of profitAnalysis) {
      totalRevenueSum += p.revenue;
      totalCostsSum += p.costs.total;
      totalProfitSum += p.profit;
      totalProfitMarginSum += p.profitMargin;
    }

    const summary = {
      overall: {
        containerCount: profitAnalysis.length,
        totalRevenue: totalRevenueSum,
        totalCosts: totalCostsSum,
        totalProfit: totalProfitSum,
        avgProfitMargin: profitAnalysis.length > 0
          ? totalProfitMarginSum / profitAnalysis.length
          : 0,
      },
    };

    return NextResponse.json({
      summary,
      containers: profitAnalysis.sort((a, b) => b.profitMargin - a.profitMargin),
    });
  } catch (error) {
    console.error("Error fetching profit margins:", error);
    return NextResponse.json(
      { error: "Failed to fetch profit margins" },
      { status: 500 }
    );
  }
}
