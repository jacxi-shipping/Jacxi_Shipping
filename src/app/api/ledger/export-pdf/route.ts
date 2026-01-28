import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Export ledger as PDF (generates HTML that can be printed to PDF)
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

    // Generate HTML for PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ledger Statement - ${user.name || user.email}</title>
  <style>
    @media print {
      @page {
        size: A4;
        margin: 20mm;
      }
    }
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 20px;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      color: #1a1a1a;
    }
    .header p {
      margin: 5px 0;
      color: #666;
    }
    .user-info {
      margin-bottom: 20px;
      background: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
    }
    .user-info p {
      margin: 5px 0;
    }
    .summary {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      gap: 10px;
    }
    .summary-box {
      flex: 1;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 5px;
      text-align: center;
    }
    .summary-box h3 {
      margin: 0 0 5px 0;
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
    }
    .summary-box p {
      margin: 0;
      font-size: 20px;
      font-weight: bold;
    }
    .summary-box.debit p {
      color: #dc2626;
    }
    .summary-box.credit p {
      color: #16a34a;
    }
    .summary-box.balance p {
      color: ${currentBalance >= 0 ? '#16a34a' : '#dc2626'};
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background: #333;
      color: white;
      padding: 10px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
    }
    th.right {
      text-align: right;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #eee;
      font-size: 12px;
    }
    td.right {
      text-align: right;
    }
    tr:hover {
      background: #f9f9f9;
    }
    .debit {
      color: #dc2626;
      font-weight: 600;
    }
    .credit {
      color: #16a34a;
      font-weight: 600;
    }
    .balance {
      font-weight: 600;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      font-size: 11px;
      color: #666;
    }
    .no-data {
      text-align: center;
      padding: 40px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>LEDGER STATEMENT</h1>
    <p>Financial Transaction History</p>
  </div>

  <div class="user-info">
    <p><strong>Account Holder:</strong> ${user.name || user.email}</p>
    <p><strong>Email:</strong> ${user.email}</p>
    <p><strong>Statement Period:</strong> ${startDate ? new Date(startDate).toLocaleDateString() : 'All time'} - ${endDate ? new Date(endDate).toLocaleDateString() : 'Present'}</p>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  </div>

  <div class="summary">
    <div class="summary-box debit">
      <h3>Total Debit</h3>
      <p>$${totalDebit.toFixed(2)}</p>
    </div>
    <div class="summary-box credit">
      <h3>Total Credit</h3>
      <p>$${totalCredit.toFixed(2)}</p>
    </div>
    <div class="summary-box balance">
      <h3>Current Balance</h3>
      <p>$${Math.abs(currentBalance).toFixed(2)}</p>
      <p style="font-size: 10px; margin-top: 5px;">${currentBalance >= 0 ? 'Amount Due' : 'Credit Balance'}</p>
    </div>
  </div>

  ${entries.length === 0 ? `
    <div class="no-data">
      <p>No transactions found for the selected period.</p>
    </div>
  ` : `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Shipment</th>
          <th class="right">Debit</th>
          <th class="right">Credit</th>
          <th class="right">Balance</th>
        </tr>
      </thead>
      <tbody>
        ${entries.map(entry => {
          const shipmentInfo = entry.shipment
            ? `${entry.shipment.id || ""}`
            : 'N/A';
          const date = new Date(entry.transactionDate).toLocaleString();
          
          return `
            <tr>
              <td>${date}</td>
              <td>${entry.description}</td>
              <td>${shipmentInfo}</td>
              <td class="right ${entry.type === 'DEBIT' ? 'debit' : ''}">
                ${entry.type === 'DEBIT' ? '$' + entry.amount.toFixed(2) : '-'}
              </td>
              <td class="right ${entry.type === 'CREDIT' ? 'credit' : ''}">
                ${entry.type === 'CREDIT' ? '$' + entry.amount.toFixed(2) : '-'}
              </td>
              <td class="right balance">$${Math.abs(entry.balance).toFixed(2)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `}

  <div class="footer">
    <p>This is an automatically generated ledger statement.</p>
    <p>For any discrepancies, please contact the administrator.</p>
  </div>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `inline; filename="ledger-${targetUserId}-${Date.now()}.html"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
