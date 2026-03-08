import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Define types
interface LineItem {
  description: string;
  type: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  shipment?: {
    vehicleYear: number | null;
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleVIN: string | null;
  };
}

interface Invoice {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  paidDate: string | null;
  status: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string | null;
  paymentReference: string | null;
  notes: string | null;
  user: {
    name: string | null;
    email: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
  };
  container: {
    containerNumber: string;
    trackingNumber: string | null;
    vesselName: string | null;
    loadingPort: string | null;
    destinationPort: string | null;
  };
  lineItems: LineItem[];
}

// Design system colors - matching app's design tokens
const COLORS = {
  // Primary brand colors
  accentGold: [212, 175, 55] as [number, number, number],  // #D4AF37
  textPrimary: [28, 28, 30] as [number, number, number],   // #1C1C1E
  textSecondary: [95, 99, 104] as [number, number, number], // #5F6368
  background: [249, 250, 251] as [number, number, number],  // #F9FAFB
  panel: [255, 255, 255] as [number, number, number],       // #FFFFFF
  border: [229, 231, 235] as [number, number, number],      // #E5E7EB
  
  // Semantic colors
  success: [16, 185, 129] as [number, number, number],      // #10B981
  warning: [245, 158, 11] as [number, number, number],      // #F59E0B
  error: [239, 68, 68] as [number, number, number],         // #EF4444
  info: [59, 130, 246] as [number, number, number],         // #3B82F6
  
  // Additional shades
  successLight: [209, 250, 229] as [number, number, number], // #D1FAE5
  warningLight: [254, 243, 199] as [number, number, number], // #FEF3C7
  errorLight: [254, 226, 226] as [number, number, number],   // #FEE2E2
  infoLight: [219, 234, 254] as [number, number, number],    // #DBEAFE
  white: [255, 255, 255] as [number, number, number],
};

// Helper functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getLineItemTypeLabel = (type: string, description: string): string => {
  if (type === 'DISCOUNT' && /damage/i.test(description)) {
    return 'DAMAGE CREDIT';
  }

  return type.replace('_', ' ');
};

const formatStatus = (status: string): string => {
  return status.replace('_', ' ').toUpperCase();
};

export const generateInvoicePDF = (invoice: Invoice) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // Modern header with gold accent bar
  doc.setFillColor(...COLORS.accentGold);
  doc.rect(0, 0, pageWidth, 8, 'F');
  
  // White header section
  doc.setFillColor(...COLORS.white);
  doc.rect(0, 8, pageWidth, 42, 'F');
  
  // Company branding
  doc.setTextColor(...COLORS.textPrimary);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('JACXI', 20, 28);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textSecondary);
  doc.text('SHIPPING', 20, 35);
  
  // Invoice title and number
  doc.setTextColor(...COLORS.accentGold);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - 20, 28, { align: 'right' });
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textSecondary);
  doc.text(invoice.invoiceNumber, pageWidth - 20, 36, { align: 'right' });

  // Status badge with modern styling
  const statusText = formatStatus(invoice.status);
  const statusWidth = doc.getTextWidth(statusText) + 14;
  const statusX = pageWidth - statusWidth - 20;
  
  // Status color with modern palette
  const statusColors: Record<string, [number, number, number]> = {
    'PAID': COLORS.success,
    'OVERDUE': COLORS.error,
    'SENT': COLORS.info,
    'PENDING': COLORS.warning,
    'DRAFT': COLORS.textSecondary,
    'CANCELLED': COLORS.textSecondary,
  };
  
  doc.setFillColor(...(statusColors[invoice.status] || COLORS.textSecondary));
  doc.roundedRect(statusX, 40, statusWidth, 8, 2, 2, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(statusText, statusX + 7, 45);

  yPos = 60;

  // Separator line
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, pageWidth - 20, yPos);
  
  yPos += 12;

  // Bill To and Invoice Details Section with modern layout
  doc.setTextColor(...COLORS.textPrimary);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', 20, yPos);
  doc.text('INVOICE DETAILS', pageWidth / 2 + 10, yPos);
  
  yPos += 8;

  // Bill To - Customer Information
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.textPrimary);
  doc.text(invoice.user.name || 'Valued Customer', 20, yPos);
  yPos += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textSecondary);
  doc.setFontSize(9);
  doc.text(invoice.user.email, 20, yPos);
  yPos += 5;
  
  if (invoice.user.phone) {
    doc.text(invoice.user.phone, 20, yPos);
    yPos += 5;
  }
  
  if (invoice.user.address) {
    const address = `${invoice.user.address}${invoice.user.city ? ', ' + invoice.user.city : ''}${invoice.user.country ? ', ' + invoice.user.country : ''}`;
    const addressLines = doc.splitTextToSize(address, 70);
    doc.text(addressLines, 20, yPos);
    yPos += addressLines.length * 5;
  }

  // Invoice Details (right side) with better formatting
  let detailsY = 72;
  const labelX = pageWidth / 2 + 10;
  const valueX = pageWidth - 20;

  const addDetailRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.textSecondary);
    doc.text(label, labelX, detailsY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.textPrimary);
    doc.text(value, valueX, detailsY, { align: 'right' });
    detailsY += 6;
  };

  addDetailRow('Invoice Date', formatDate(invoice.issueDate));
  addDetailRow('Due Date', formatDate(invoice.dueDate));
  if (invoice.paidDate) {
    addDetailRow('Paid Date', formatDate(invoice.paidDate));
  }
  addDetailRow('Container #', invoice.container.containerNumber);
  if (invoice.container.trackingNumber) {
    addDetailRow('Tracking #', invoice.container.trackingNumber);
  }

  yPos = Math.max(yPos, detailsY) + 10;

  // Container Information Section with modern design
  if (invoice.container.vesselName || invoice.container.loadingPort || invoice.container.destinationPort) {
    doc.setFillColor(...COLORS.background);
    doc.roundedRect(20, yPos - 3, pageWidth - 40, 18, 2, 2, 'F');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.accentGold);
    doc.text('SHIPPING DETAILS', 25, yPos + 3);
    
    yPos += 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textSecondary);

    let shippingInfo = '';
    if (invoice.container.vesselName) {
      shippingInfo += `Vessel: ${invoice.container.vesselName}`;
    }
    if (invoice.container.loadingPort) {
      if (shippingInfo) shippingInfo += ' • ';
      shippingInfo += `From: ${invoice.container.loadingPort}`;
    }
    if (invoice.container.destinationPort) {
      if (shippingInfo) shippingInfo += ' • ';
      shippingInfo += `To: ${invoice.container.destinationPort}`;
    }
    
    if (shippingInfo) {
      doc.text(shippingInfo, 25, yPos);
    }
    yPos += 12;
  }

  // Line Items Section Header
  doc.setFillColor(...COLORS.accentGold);
  doc.rect(20, yPos - 2, pageWidth - 40, 1, 'F');
  yPos += 4;

  // Group line items by shipment
  const groupedItems: Record<string, { shipment?: LineItem['shipment']; items: LineItem[] }> = {};
  invoice.lineItems.forEach(item => {
    const key = item.shipment?.vehicleVIN || 'other';
    if (!groupedItems[key]) {
      groupedItems[key] = {
        shipment: item.shipment,
        items: [],
      };
    }
    groupedItems[key].items.push(item);
  });

  // Generate table data
  const tableData: any[] = [];
  
  Object.values(groupedItems).forEach(group => {
    // Vehicle header row
    if (group.shipment) {
      const vehicleDesc = `${group.shipment.vehicleYear || ''} ${group.shipment.vehicleMake || ''} ${group.shipment.vehicleModel || ''}`.trim();
      const vehicleVIN = group.shipment.vehicleVIN ? `VIN: ${group.shipment.vehicleVIN}` : '';
      tableData.push([
        { 
          content: `Vehicle: ${vehicleDesc}${vehicleVIN ? ' • ' + vehicleVIN : ''}`, 
          colSpan: 5, 
          styles: { 
            fontStyle: 'bold', 
            fillColor: COLORS.background,
            textColor: COLORS.textPrimary,
            fontSize: 9
          } 
        }
      ]);
    }

    // Line items
    group.items.forEach(item => {
      tableData.push([
        { content: item.description, styles: { cellPadding: { left: group.shipment ? 8 : 5 }, textColor: COLORS.textPrimary } },
        { content: getLineItemTypeLabel(item.type, item.description), styles: { textColor: COLORS.textSecondary } },
        { content: item.quantity.toString(), styles: { textColor: COLORS.textSecondary } },
        { content: formatCurrency(item.unitPrice), styles: { textColor: COLORS.textSecondary } },
        { content: formatCurrency(item.amount), styles: { fontStyle: 'bold', textColor: COLORS.textPrimary } },
      ]);
    });
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Type', 'Qty', 'Unit Price', 'Amount']],
    body: tableData,
    foot: [
      ['', '', '', { content: 'Subtotal', styles: { textColor: COLORS.textSecondary } }, formatCurrency(invoice.subtotal)],
      ...(invoice.discount > 0 ? [['', '', '', { content: 'Discount', styles: { textColor: COLORS.success } }, { content: `-${formatCurrency(invoice.discount)}`, styles: { textColor: COLORS.success } }]] : []),
      ...(invoice.tax > 0 ? [['', '', '', { content: 'Tax', styles: { textColor: COLORS.textSecondary } }, formatCurrency(invoice.tax)]] : []),
      ['', '', '', { content: 'TOTAL DUE', styles: { fontStyle: 'bold', textColor: COLORS.textPrimary, fontSize: 11 } }, { content: formatCurrency(invoice.total), styles: { fontStyle: 'bold', textColor: COLORS.accentGold, fontSize: 11 } }],
    ],
    theme: 'plain',
    headStyles: {
      fillColor: COLORS.background,
      textColor: COLORS.textSecondary,
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: { top: 3, bottom: 3, left: 5, right: 5 },
    },
    bodyStyles: {
      fontSize: 9,
      textColor: COLORS.textSecondary,
      cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
    },
    footStyles: {
      fillColor: COLORS.white,
      textColor: COLORS.textPrimary,
      fontStyle: 'bold',
      fontSize: 10,
      cellPadding: { top: 4, bottom: 4, left: 5, right: 5 },
    },
    alternateRowStyles: {
      fillColor: [252, 252, 253],
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: 20, right: 20 },
    didDrawPage: function (data) {
      // Modern footer with gold accent
      const footerY = pageHeight - 25;
      
      // Gold separator line
      doc.setDrawColor(...COLORS.accentGold);
      doc.setLineWidth(0.5);
      doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);
      
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.textSecondary);
      doc.setFont('helvetica', 'normal');
      doc.text('Thank you for your business with JACXI Shipping', pageWidth / 2, footerY, { align: 'center' });
      
      // Page number
      doc.setFontSize(7);
      doc.text(`Page ${data.pageNumber}`, pageWidth - 20, footerY, { align: 'right' });
      
      // Confidentiality notice
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.textSecondary);
      doc.text('This invoice is confidential and intended solely for the addressee.', pageWidth / 2, footerY + 5, { align: 'center' });
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Payment Information (if paid) with modern design
  if (invoice.status === 'PAID' && invoice.paymentMethod) {
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(...COLORS.successLight);
    doc.roundedRect(20, yPos - 3, pageWidth - 40, 20, 2, 2, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.success);
    doc.text('PAYMENT RECEIVED', 25, yPos + 4);
    
    yPos += 12;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textSecondary);
    
    doc.text(`Method: ${invoice.paymentMethod}`, 25, yPos);
    yPos += 5;
    
    if (invoice.paymentReference) {
      doc.text(`Reference: ${invoice.paymentReference}`, 25, yPos);
      yPos += 5;
    }
    
    doc.text(`Date: ${formatDate(invoice.paidDate)}`, 25, yPos);
    yPos += 12;
  }

  // Notes (if any) with modern design
  if (invoice.notes) {
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = 20;
    }

    const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 50);
    const notesHeight = (notesLines.length * 5) + 20;
    
    doc.setFillColor(...COLORS.background);
    doc.roundedRect(20, yPos - 3, pageWidth - 40, notesHeight, 2, 2, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.accentGold);
    doc.text('NOTES', 25, yPos + 4);
    
    yPos += 12;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textSecondary);
    
    doc.text(notesLines, 25, yPos);
  }

  return doc;
};

export const downloadInvoicePDF = (invoice: Invoice) => {
  const doc = generateInvoicePDF(invoice);
  const fileName = `Invoice_${invoice.invoiceNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
