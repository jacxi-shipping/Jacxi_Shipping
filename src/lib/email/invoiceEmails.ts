/**
 * Email Notification System for Invoices
 * 
 * This module provides email templates and sending functions for invoice notifications.
 * To enable email sending, configure your email service (e.g., Resend, SendGrid, AWS SES)
 * and update the sendEmail function below.
 */

interface Invoice {
  invoiceNumber: string;
  total: number;
  issueDate: string;
  dueDate: string | null;
  status: string;
  user: {
    name: string | null;
    email: string;
  };
  container: {
    containerNumber: string;
  };
  lineItems: Array<{
    description: string;
    amount: number;
  }>;
}

// Email templates
export const emailTemplates = {
  invoiceCreated: (invoice: Invoice) => ({
    subject: `Invoice ${invoice.invoiceNumber} - Payment Due`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: #191C1F;
      color: white;
      padding: 30px 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .header p {
      margin: 5px 0 0 0;
      opacity: 0.9;
    }
    .content {
      background: white;
      padding: 30px;
      border: 1px solid #e2e8f0;
      border-top: none;
      border-radius: 0 0 8px 8px;
    }
    .invoice-details {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      color: #64748b;
      font-weight: 500;
    }
    .detail-value {
      font-weight: 600;
      color: #191C1F;
    }
    .total {
      font-size: 24px;
      color: #DAA520;
    }
    .button {
      display: inline-block;
      background: #DAA520;
      color: white;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background: #c9941c;
    }
    .footer {
      text-align: center;
      color: #64748b;
      font-size: 14px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
    }
    .items-list {
      margin: 20px 0;
    }
    .item {
      padding: 12px 0;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>INVOICE</h1>
    <p>${invoice.invoiceNumber}</p>
  </div>
  
  <div class="content">
    <p>Dear ${invoice.user.name || 'Valued Customer'},</p>
    
    <p>Your invoice for container <strong>${invoice.container.containerNumber}</strong> is ready.</p>
    
    <div class="invoice-details">
      <div class="detail-row">
        <span class="detail-label">Invoice Number:</span>
        <span class="detail-value">${invoice.invoiceNumber}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Issue Date:</span>
        <span class="detail-value">${new Date(invoice.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Due Date:</span>
        <span class="detail-value">${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Container:</span>
        <span class="detail-value">${invoice.container.containerNumber}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Total Amount:</span>
        <span class="detail-value total">$${invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
    </div>
    
    <div style="text-align: center;">
      <a href="${process.env.NEXTAUTH_URL}/dashboard/invoices/${invoice.invoiceNumber}" class="button">
        View Invoice
      </a>
    </div>
    
    <p>You can view and download your invoice by clicking the button above or logging into your account.</p>
    
    <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
  </div>
  
  <div class="footer">
    <p>Thank you for your business!</p>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 10px;">
      This is an automated email. Please do not reply directly to this message.
    </p>
  </div>
</body>
</html>
    `,
    text: `
Invoice ${invoice.invoiceNumber}

Dear ${invoice.user.name || 'Valued Customer'},

Your invoice for container ${invoice.container.containerNumber} is ready.

Invoice Details:
- Invoice Number: ${invoice.invoiceNumber}
- Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}
- Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
- Container: ${invoice.container.containerNumber}
- Total Amount: $${invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}

View your invoice online: ${process.env.NEXTAUTH_URL}/dashboard/invoices/${invoice.invoiceNumber}

If you have any questions, please contact us.

Thank you for your business!
    `,
  }),

  paymentReminder: (invoice: Invoice, daysUntilDue: number) => ({
    subject: `Reminder: Invoice ${invoice.invoiceNumber} Due ${daysUntilDue > 0 ? `in ${daysUntilDue} Days` : 'Today'}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Reminder</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: #f59e0b;
      color: white;
      padding: 30px 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background: white;
      padding: 30px;
      border: 1px solid #e2e8f0;
      border-top: none;
      border-radius: 0 0 8px 8px;
    }
    .button {
      display: inline-block;
      background: #DAA520;
      color: white;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>⏰ Payment Reminder</h1>
  </div>
  
  <div class="content">
    <p>Dear ${invoice.user.name || 'Valued Customer'},</p>
    
    <p>This is a friendly reminder that your invoice <strong>${invoice.invoiceNumber}</strong> is ${daysUntilDue > 0 ? `due in ${daysUntilDue} day(s)` : 'due today'}.</p>
    
    <p><strong>Amount Due: $${invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
    <p><strong>Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</strong></p>
    
    <div style="text-align: center;">
      <a href="${process.env.NEXTAUTH_URL}/dashboard/invoices/${invoice.invoiceNumber}" class="button">
        View & Pay Invoice
      </a>
    </div>
    
    <p>If you've already paid, please disregard this message.</p>
  </div>
</body>
</html>
    `,
  }),

  paymentConfirmation: (invoice: Invoice) => ({
    subject: `Payment Received - Invoice ${invoice.invoiceNumber}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: #22c55e;
      color: white;
      padding: 30px 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background: white;
      padding: 30px;
      border: 1px solid #e2e8f0;
      border-top: none;
      border-radius: 0 0 8px 8px;
    }
    .button {
      display: inline-block;
      background: #DAA520;
      color: white;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>✓ Payment Received</h1>
  </div>
  
  <div class="content">
    <p>Dear ${invoice.user.name || 'Valued Customer'},</p>
    
    <p>Thank you! We've received your payment for invoice <strong>${invoice.invoiceNumber}</strong>.</p>
    
    <p><strong>Amount Paid: $${invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
    <p><strong>Payment Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong></p>
    
    <div style="text-align: center;">
      <a href="${process.env.NEXTAUTH_URL}/dashboard/invoices/${invoice.invoiceNumber}" class="button">
        Download Receipt
      </a>
    </div>
    
    <p>If you have any questions, please contact us.</p>
    <p>Thank you for your business!</p>
  </div>
</body>
</html>
    `,
  }),
};

/**
 * Send an invoice email
 * 
 * TO ENABLE EMAIL SENDING:
 * 1. Install your email service package (e.g., npm install resend)
 * 2. Add email service credentials to .env
 * 3. Implement the sendEmail function below
 * 
 * Example with Resend:
 * ```
 * import { Resend } from 'resend';
 * const resend = new Resend(process.env.RESEND_API_KEY);
 * 
 * await resend.emails.send({
 *   from: process.env.EMAIL_FROM || 'noreply@yourcompany.com',
 *   to: to,
 *   subject: subject,
 *   html: html,
 * });
 * ```
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  // TODO: Implement email sending with your preferred service
  // For now, just log to console
  console.log('📧 Email would be sent:');
  console.log('To:', to);
  console.log('Subject:', subject);
  console.log('---');
  
  // Uncomment and modify when ready to send real emails:
  /*
  try {
    // Example with Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: process.env.EMAIL_FROM || 'noreply@yourcompany.com',
    //   to,
    //   subject,
    //   html,
    // });
    
    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
  */
  
  return { success: true }; // Return success for now
}

/**
 * Send invoice created notification
 */
export async function sendInvoiceCreatedEmail(invoice: Invoice) {
  const template = emailTemplates.invoiceCreated(invoice);
  return sendEmail({
    to: invoice.user.email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

/**
 * Send payment reminder
 */
export async function sendPaymentReminderEmail(invoice: Invoice, daysUntilDue: number) {
  const template = emailTemplates.paymentReminder(invoice, daysUntilDue);
  return sendEmail({
    to: invoice.user.email,
    subject: template.subject,
    html: template.html,
  });
}

/**
 * Send payment confirmation
 */
export async function sendPaymentConfirmationEmail(invoice: Invoice) {
  const template = emailTemplates.paymentConfirmation(invoice);
  return sendEmail({
    to: invoice.user.email,
    subject: template.subject,
    html: template.html,
  });
}
