import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Export ledger data as CSV/Excel-compatible format
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const format = searchParams.get('format') || 'csv';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Non-admin users can only export their own ledger
    const isAdmin = session.user.role === 'admin';
    const targetUserId = isAdmin && userId ? userId : session.user.id;

    // Build where clause
    const where: Record<string, unknown> = {
      userId: targetUserId,
    };

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) {
        (where.transactionDate as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.transactionDate as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    // Fetch ledger entries
    const entries = await prisma.ledgerEntry.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
          shipment: {
            select: {
              id: true,
              vehicleMake: true,
              vehicleModel: true,
            },
          },
      },
      orderBy: {
        transactionDate: 'asc',
      },
    });

    if (format === 'json') {
      return NextResponse.json({ entries });
    }

    // Generate CSV format
    const csvRows: string[] = [];
    
    // Header row
    csvRows.push([
      'Date',
      'Description',
      'Shipment',
      'Type',
      'Debit',
      'Credit',
      'Balance',
      'Notes',
    ].join(','));

    // Data rows
    for (const entry of entries) {
      const shipmentInfo = entry.shipment
        ? `${entry.shipment.id || ""} (${entry.shipment.vehicleMake} ${entry.shipment.vehicleModel})`
        : 'N/A';

      csvRows.push([
        new Date(entry.transactionDate).toLocaleString(),
        `"${entry.description.replace(/"/g, '""')}"`,
        `"${shipmentInfo.replace(/"/g, '""')}"`,
        entry.type,
        entry.type === 'DEBIT' ? entry.amount.toFixed(2) : '',
        entry.type === 'CREDIT' ? entry.amount.toFixed(2) : '',
        entry.balance.toFixed(2),
        entry.notes ? `"${entry.notes.replace(/"/g, '""')}"` : '',
      ].join(','));
    }

    const csvContent = csvRows.join('\n');

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="ledger-${targetUserId}-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting ledger:', error);
    return NextResponse.json(
      { error: 'Failed to export ledger' },
      { status: 500 }
    );
  }
}
