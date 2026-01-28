import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Generate due aging report
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can view aging reports
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Build where clause
    const where: Record<string, unknown> = {
      paymentStatus: 'PENDING', // Only unpaid shipments
    };

    if (userId) {
      where.userId = userId;
    }

    // Fetch all due shipments
    const shipments = await prisma.shipment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ledgerEntries: {
          where: {
            type: 'DEBIT',
          },
        },
      },
    });

    const now = new Date();
    
    type ShipmentData = {
      id: string;
      vehicleMake: string | null;
      vehicleModel: string | null;
      user: { id: string; name: string | null; email: string };
      amountDue: number;
      createdAt: Date;
      ageInDays: number;
      price: number | null;
    };
    
    const agingBuckets = {
      current: [] as ShipmentData[],      // 0-30 days
      aging30: [] as ShipmentData[],       // 31-60 days
      aging60: [] as ShipmentData[],       // 61-90 days
      aging90: [] as ShipmentData[],       // 90+ days
    };

    let totalCurrent = 0;
    let totalAging30 = 0;
    let totalAging60 = 0;
    let totalAging90 = 0;

    for (const shipment of shipments) {
      // Calculate total debit for this shipment
      const totalDebit = shipment.ledgerEntries.reduce((sum, entry) => sum + entry.amount, 0);
      
      // Get age in days
      const createdDate = new Date(shipment.createdAt);
      const ageInDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

      const shipmentData = {
        id: shipment.id,
        vehicleMake: shipment.vehicleMake,
        vehicleModel: shipment.vehicleModel,
        user: shipment.user,
        amountDue: totalDebit,
        createdAt: shipment.createdAt,
        ageInDays,
        price: shipment.price || 0,
      };

      // Categorize by age
      if (ageInDays <= 30) {
        agingBuckets.current.push(shipmentData);
        totalCurrent += totalDebit;
      } else if (ageInDays <= 60) {
        agingBuckets.aging30.push(shipmentData);
        totalAging30 += totalDebit;
      } else if (ageInDays <= 90) {
        agingBuckets.aging60.push(shipmentData);
        totalAging60 += totalDebit;
      } else {
        agingBuckets.aging90.push(shipmentData);
        totalAging90 += totalDebit;
      }
    }

    // Calculate totals and percentages
    const grandTotal = totalCurrent + totalAging30 + totalAging60 + totalAging90;

    const report = {
      reportType: 'due-aging',
      generatedAt: now,
      summary: {
        totalShipments: shipments.length,
        totalAmountDue: grandTotal,
        buckets: {
          current: {
            count: agingBuckets.current.length,
            total: totalCurrent,
            percentage: grandTotal > 0 ? (totalCurrent / grandTotal) * 100 : 0,
            label: '0-30 Days',
          },
          aging30: {
            count: agingBuckets.aging30.length,
            total: totalAging30,
            percentage: grandTotal > 0 ? (totalAging30 / grandTotal) * 100 : 0,
            label: '31-60 Days',
          },
          aging60: {
            count: agingBuckets.aging60.length,
            total: totalAging60,
            percentage: grandTotal > 0 ? (totalAging60 / grandTotal) * 100 : 0,
            label: '61-90 Days',
          },
          aging90: {
            count: agingBuckets.aging90.length,
            total: totalAging90,
            percentage: grandTotal > 0 ? (totalAging90 / grandTotal) * 100 : 0,
            label: '90+ Days',
          },
        },
      },
      details: agingBuckets,
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error generating due aging report:', error);
    return NextResponse.json(
      { error: 'Failed to generate due aging report' },
      { status: 500 }
    );
  }
}
