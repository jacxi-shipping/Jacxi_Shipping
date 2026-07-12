import { sendConfiguredEmail } from '@/lib/communication-settings';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendInvoiceEmail({
  to,
  invoiceNumber,
  amount,
  dueDate,
  pdfUrl,
}: {
  to: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  pdfUrl: string;
}) {
  try {
    return await sendConfiguredEmail({
      from: 'invoices@jacxishipping.com',
      to,
      subject: `Invoice ${invoiceNumber} - $${amount.toFixed(2)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">New Invoice from Jacxi Shipping</h1>
          <p>Hello,</p>
          <p>Your invoice is ready for review.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Invoice Number:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount Due:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">$${amount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Due Date:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${dueDate}</td>
            </tr>
          </table>
          <p>
            <a href="${pdfUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Download Invoice PDF
            </a>
          </p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Please contact us at support@jacxishipping.com if you have any questions.
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Email send failed:', error);
    return { success: false, error };
  }
}

export async function sendStatusUpdateEmail({
  to,
  containerNumber,
  status,
  message,
  trackingUrl,
}: {
  to: string;
  containerNumber: string;
  status: string;
  message: string;
  trackingUrl?: string;
}) {
  try {
    return await sendConfiguredEmail({
      from: 'tracking@jacxishipping.com',
      to,
      subject: `Container ${containerNumber} - ${status}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Shipment Update</h1>
          <p>Container <strong>${containerNumber}</strong> status has been updated:</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin: 0; color: #1f2937;">${status}</h2>
            <p style="margin: 10px 0 0 0; color: #6b7280;">${message}</p>
          </div>
          ${trackingUrl ? `
          <p>
            <a href="${trackingUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Track Your Shipment
            </a>
          </p>
          ` : ''}
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            Questions? Contact us at support@jacxishipping.com
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Email send failed:', error);
    return { success: false, error };
  }
}

export async function sendPaymentReminderEmail({
  to,
  invoiceNumber,
  amount,
  dueDate,
  daysOverdue,
  pdfUrl,
}: {
  to: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  pdfUrl: string;
}) {
  try {
    const urgencyLevel = daysOverdue >= 30 ? 'urgent' : daysOverdue >= 14 ? 'high' : 'normal';
    const urgencyColor = urgencyLevel === 'urgent' ? '#dc2626' : urgencyLevel === 'high' ? '#ea580c' : '#f59e0b';
    
    return await sendConfiguredEmail({
      from: 'invoices@jacxishipping.com',
      to,
      subject: `${urgencyLevel === 'urgent' ? 'URGENT: ' : ''}Payment Reminder - Invoice ${invoiceNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: ${urgencyColor};">Payment Reminder</h1>
          <p>This is a ${urgencyLevel === 'urgent' ? 'final' : 'friendly'} reminder that your invoice is ${daysOverdue} days overdue.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Invoice Number:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Amount Due:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong style="color: ${urgencyColor};">$${amount.toFixed(2)}</strong></td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Original Due Date:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${dueDate}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Days Overdue:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong style="color: ${urgencyColor};">${daysOverdue} days</strong></td>
            </tr>
          </table>
          <p>
            <a href="${pdfUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Download Invoice
            </a>
          </p>
          <p style="margin-top: 20px;">
            Please arrange payment at your earliest convenience. If you have already made payment, please disregard this notice.
          </p>
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            For payment arrangements or questions, contact us at billing@jacxishipping.com
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Payment reminder email send failed:', error);
    return { success: false, error };
  }
}

export async function sendShipmentCreatedEmail({
  to,
  userName,
  vehicleInfo,
  trackingUrl,
}: {
  to: string;
  userName: string;
  vehicleInfo: string;
  trackingUrl?: string;
}) {
  try {
    return await sendConfiguredEmail({
      from: 'notifications@jacxishipping.com',
      to,
      subject: 'Shipment Created - Jacxi Shipping',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Shipment Created Successfully</h1>
          <p>Hello ${userName},</p>
          <p>Your vehicle shipment has been created in our system.</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Vehicle Details:</h3>
            <p style="margin: 5px 0;">${vehicleInfo}</p>
          </div>
          ${trackingUrl ? `
          <p>
            <a href="${trackingUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Track Your Shipment
            </a>
          </p>
          ` : ''}
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            We'll keep you updated on the status of your shipment.
          </p>
          <p style="color: #666; font-size: 14px;">
            Questions? Contact us at support@jacxishipping.com
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Shipment created email send failed:', error);
    return { success: false, error };
  }
}

export async function sendLedgerTransactionEmail({
  to,
  customerName,
  direction,
  amount,
  description,
  balance,
  transactionDate,
  notes,
}: {
  to: string;
  customerName?: string | null;
  direction: 'DEBIT' | 'CREDIT';
  amount: number;
  description: string;
  balance?: number | null;
  transactionDate?: Date | string | null;
  notes?: string | null;
}) {
  try {
    const effectiveName = customerName?.trim() || 'Customer';
    const directionLabel = direction === 'CREDIT' ? 'Payment/Credit' : 'Charge/Debit';
    const sign = direction === 'CREDIT' ? '-' : '+';
    const formattedAmount = `$${amount.toFixed(2)}`;
    const formattedBalance = typeof balance === 'number' ? `$${balance.toFixed(2)}` : null;
    const transactionDateValue = transactionDate
      ? new Date(transactionDate).toLocaleString()
      : new Date().toLocaleString();

    return await sendConfiguredEmail({
      from: 'billing@jacxishipping.com',
      to,
      subject: `Account Transaction Notice - ${directionLabel} ${formattedAmount}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto;">
          <h1 style="color: #1f2937; margin-bottom: 6px;">Account Transaction Notification</h1>
          <p style="margin-top: 0; color: #6b7280;">Hello ${escapeHtml(effectiveName)}, a transaction was posted to your account.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 18px 0;">
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Type</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${directionLabel}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Amount</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${sign}${formattedAmount}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Description</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${escapeHtml(description)}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Date</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${escapeHtml(transactionDateValue)}</td>
            </tr>
            ${formattedBalance ? `
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Current Balance</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${formattedBalance}</td>
            </tr>
            ` : ''}
            ${notes?.trim() ? `
            <tr>
              <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Notes</strong></td>
              <td style="padding: 10px; border: 1px solid #e5e7eb;">${escapeHtml(notes)}</td>
            </tr>
            ` : ''}
          </table>
          <p style="color: #6b7280; font-size: 14px;">If you have questions about this transaction, contact billing@jacxishipping.com.</p>
        </div>
      `,
      text: `Hello ${effectiveName}, a ${directionLabel} transaction of ${sign}${formattedAmount} was posted to your account on ${transactionDateValue}. Description: ${description}.${formattedBalance ? ` Current balance: ${formattedBalance}.` : ''}${notes?.trim() ? ` Notes: ${notes}.` : ''}`,
    });
  } catch (error) {
    console.error('Ledger transaction email send failed:', error);
    return { success: false, error };
  }
}
