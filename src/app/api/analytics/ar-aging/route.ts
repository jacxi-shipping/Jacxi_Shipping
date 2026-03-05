import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasPermission } from '@/lib/rbac';

/**
 * GET /api/analytics/ar-aging
 * Returns Accounts Receivable aging report
 * Categorizes outstanding invoices by age: Current, 1-30, 31-60, 61-90, 90+ days
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !hasPermission(session.user?.role, 'analytics:view')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all unpaid invoices
    const invoices = await prisma.userInvoice.findMany({
      where: {
        status: {
          in: ["PENDING", "OVERDUE"],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        container: {
          select: {
            id: true,
            containerNumber: true,
            shipments: {
              select: {
                id: true,
                vehicleVIN: true,
                vehicleMake: true,
                vehicleModel: true,
                vehicleYear: true,
              },
              take: 1, // Just get first shipment for reference
            },
          },
        },
      },
      orderBy: {
        dueDate: "asc",
      },
    });

    const today = new Date();
    const aging = {
      current: [] as any[],
      days1to30: [] as any[],
      days31to60: [] as any[],
      days61to90: [] as any[],
      days90plus: [] as any[],
    };

    invoices.forEach((invoice) => {
      if (!invoice.dueDate) return; // Skip invoices without due date
      
      const dueDate = new Date(invoice.dueDate);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      const invoiceDetail = {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.user?.id,
        customerName: invoice.user?.name || invoice.user?.email || "Unknown",
        amount: invoice.total,
        dueDate: invoice.dueDate,
        daysOverdue: Math.max(0, daysOverdue),
        status: invoice.status,
        container: invoice.container?.containerNumber || "N/A",
        shipment: invoice.container?.shipments[0]
          ? `${invoice.container.shipments[0].vehicleYear} ${invoice.container.shipments[0].vehicleMake} ${invoice.container.shipments[0].vehicleModel} (${invoice.container.shipments[0].vehicleVIN})`
          : "N/A",
      };

      if (daysOverdue < 0) {
        aging.current.push(invoiceDetail);
      } else if (daysOverdue <= 30) {
        aging.days1to30.push(invoiceDetail);
      } else if (daysOverdue <= 60) {
        aging.days31to60.push(invoiceDetail);
      } else if (daysOverdue <= 90) {
        aging.days61to90.push(invoiceDetail);
      } else {
        aging.days90plus.push(invoiceDetail);
      }
    });

    // Calculate summary
    const summary = {
      current: {
        count: aging.current.length,
        amount: aging.current.reduce((sum, inv) => sum + inv.amount, 0),
      },
      days1to30: {
        count: aging.days1to30.length,
        amount: aging.days1to30.reduce((sum, inv) => sum + inv.amount, 0),
      },
      days31to60: {
        count: aging.days31to60.length,
        amount: aging.days31to60.reduce((sum, inv) => sum + inv.amount, 0),
      },
      days61to90: {
        count: aging.days61to90.length,
        amount: aging.days61to90.reduce((sum, inv) => sum + inv.amount, 0),
      },
      days90plus: {
        count: aging.days90plus.length,
        amount: aging.days90plus.reduce((sum, inv) => sum + inv.amount, 0),
      },
      total: {
        count: invoices.length,
        amount: invoices.reduce((sum, inv) => sum + inv.total, 0),
      },
    };

    // Calculate by customer
    const byCustomer: Record<string, any> = {};
    invoices.forEach((invoice) => {
      const customerId = invoice.user?.id || "unknown";
      const customerName = invoice.user?.name || invoice.user?.email || "Unknown";

      if (!byCustomer[customerId]) {
        byCustomer[customerId] = {
          customerId,
          customerName,
          invoices: [],
          totalOutstanding: 0,
        };
      }

      byCustomer[customerId].invoices.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.total,
        dueDate: invoice.dueDate,
        status: invoice.status,
      });
      byCustomer[customerId].totalOutstanding += invoice.total;
    });

    return NextResponse.json({
      summary,
      aging,
      byCustomer: Object.values(byCustomer).sort(
        (a, b) => b.totalOutstanding - a.totalOutstanding
      ),
      generatedAt: today.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching AR aging report:", error);
    return NextResponse.json(
      { error: "Failed to fetch AR aging report" },
      { status: 500 }
    );
  }
}
