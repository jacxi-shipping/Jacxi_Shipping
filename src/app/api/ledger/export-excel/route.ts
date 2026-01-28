import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Export ledger as Excel-compatible CSV with extended format
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
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

    // Fetch ledger entries and user info
    const [entries, user] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
        include: {
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
      }),
      prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          name: true,
          email: true,
        },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate totals
    const totalDebit = entries.filter(e => e.type === 'DEBIT').reduce((sum, e) => sum + e.amount, 0);
    const totalCredit = entries.filter(e => e.type === 'CREDIT').reduce((sum, e) => sum + e.amount, 0);
    const currentBalance = entries.length > 0 ? entries[entries.length - 1].balance : 0;

    // Generate Excel-compatible CSV with UTF-8 BOM for proper Excel encoding
    const csvRows: string[] = [];
    
    // Add BOM for UTF-8
    csvRows.push('\ufeff');
    
    // Title and header info
    csvRows.push('LEDGER STATEMENT');
    csvRows.push(`Account Holder:,${user.name || user.email}`);
    csvRows.push(`Email:,${user.email}`);
    csvRows.push(`Statement Period:,${startDate ? new Date(startDate).toLocaleDateString() : 'All time'} - ${endDate ? new Date(endDate).toLocaleDateString() : 'Present'}`);
    csvRows.push(`Generated:,${new Date().toLocaleString()}`);
    csvRows.push('');
    
    // Summary
    csvRows.push('SUMMARY');
    csvRows.push(`Total Debit:,$${totalDebit.toFixed(2)}`);
    csvRows.push(`Total Credit:,$${totalCredit.toFixed(2)}`);
    csvRows.push(`Current Balance:,$${Math.abs(currentBalance).toFixed(2)},${currentBalance >= 0 ? 'Amount Due' : 'Credit Balance'}`);
    csvRows.push('');
    csvRows.push('');

    // Header row for transactions
    csvRows.push([
      'Transaction ID',
      'Date',
      'Time',
      'Description',
      'Shipment',
      'Vehicle',
      'Type',
      'Debit',
      'Credit',
      'Balance',
      'Notes',
      'Created By',
    ].join(','));

    // Data rows
    for (const entry of entries) {
      const date = new Date(entry.transactionDate);
      const shipmentInfo = entry.shipment
        ? `Shipment ${entry.shipment.id || ""}`
        : '';
      const vehicleInfo = entry.shipment
        ? `${entry.shipment.vehicleMake || ''} ${entry.shipment.vehicleModel || ''}`.trim()
        : '';

      csvRows.push([
        entry.id,
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        `"${entry.description.replace(/"/g, '""')}"`,
        shipmentInfo,
        `"${vehicleInfo}"`,
        entry.type,
        entry.type === 'DEBIT' ? entry.amount.toFixed(2) : '',
        entry.type === 'CREDIT' ? entry.amount.toFixed(2) : '',
        entry.balance.toFixed(2),
        entry.notes ? `"${entry.notes.replace(/"/g, '""')}"` : '',
        entry.createdBy,
      ].join(','));
    }

    // Add totals row
    csvRows.push('');
    csvRows.push([
      '',
      '',
      '',
      '',
      '',
      '',
      'TOTALS',
      totalDebit.toFixed(2),
      totalCredit.toFixed(2),
      currentBalance.toFixed(2),
      '',
      '',
    ].join(','));

    const csvContent = csvRows.join('\n');

    // Return Excel-compatible CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="ledger-${user.name || 'user'}-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return NextResponse.json(
      { error: 'Failed to export to Excel' },
      { status: 500 }
    );
  }
}
