import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendPaymentReminderEmail } from '@/lib/email';

export async function GET(request: Request) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = new Date();
    
    // Find overdue invoices that are still pending
    const overdueInvoices = await prisma.userInvoice.findMany({
      where: {
        status: {
          in: ['PENDING', 'SENT'],
        },
        dueDate: {
          lt: today,
        },
      },
      include: {
        user: true,
      },
    });

    const results = [];
    let remindersSent = 0;
    let updatedToOverdue = 0;

    for (const invoice of overdueInvoices) {
      if (!invoice.dueDate) continue;

      const daysOverdue = Math.floor(
        (today.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Send reminders at specific intervals: 3, 7, 14, 30 days overdue
      const shouldSendReminder = [3, 7, 14, 30].includes(daysOverdue);

      if (shouldSendReminder && invoice.user.email) {
        const pdfUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/invoices/${invoice.id}/pdf`;
        
        const emailResult = await sendPaymentReminderEmail({
          to: invoice.user.email,
          invoiceNumber: invoice.invoiceNumber,
          amount: invoice.total,
          dueDate: new Date(invoice.dueDate).toLocaleDateString(),
          daysOverdue,
          pdfUrl,
        });

        if (emailResult.success) {
          remindersSent++;
          
          // Update invoice status to OVERDUE if not already
          if (invoice.status !== 'OVERDUE') {
            await prisma.userInvoice.update({
              where: { id: invoice.id },
              data: { status: 'OVERDUE' },
            });
            updatedToOverdue++;
          }

          results.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            daysOverdue,
            emailSent: true,
            recipient: invoice.user.email,
          });
        } else {
          results.push({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            daysOverdue,
            emailSent: false,
            error: 'Email send failed',
          });
        }
      } else if (daysOverdue > 0 && invoice.status !== 'OVERDUE') {
        // Update to OVERDUE even if we don't send a reminder
        await prisma.userInvoice.update({
          where: { id: invoice.id },
          data: { status: 'OVERDUE' },
        });
        updatedToOverdue++;
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        overdueInvoicesChecked: overdueInvoices.length,
        remindersSent: remindersSent,
        statusUpdatedToOverdue: updatedToOverdue,
      },
      details: results,
    });
  } catch (error) {
    console.error('Payment reminder cron failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process payment reminders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
