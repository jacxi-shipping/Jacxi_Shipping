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

// Design system colors
const COLORS = {
  dark: [25, 28, 31] as [number, number, number],       // #191C1F
  gold: [218, 165, 32] as [number, number, number],      // #DAA520
  success: [34, 197, 94] as [number, number, number],    // #22C55E
  error: [239, 68, 68] as [number, number, number],      // #EF4444
  text: [100, 116, 139] as [number, number, number],     // #64748B
  background: [248, 250, 252] as [number, number, number], // #F8FAFC
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

const formatStatus = (status: string): string => {
  return status.replace('_', ' ').toUpperCase();
};

export const generateInvoicePDF = (invoice: Invoice) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  // Header with dark background
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 20, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${formatDate(new Date().toISOString())}`, 20, 30);
  doc.text(invoice.invoiceNumber, 20, 37);

  // Status badge
  const statusText = formatStatus(invoice.status);
  const statusWidth = doc.getTextWidth(statusText) + 10;
  const statusX = pageWidth - statusWidth - 20;
  
  // Status color
  const statusColors: Record<string, [number, number, number]> = {
    'PAID': COLORS.success,
    'OVERDUE': COLORS.error,
    'SENT': [59, 130, 246],    // Blue
    'PENDING': [251, 191, 36], // Yellow
    'DRAFT': COLORS.text,
    'CANCELLED': COLORS.text,
  };
  
  doc.setFillColor(...(statusColors[invoice.status] || COLORS.text));
  doc.roundedRect(statusX, 15, statusWidth, 12, 3, 3, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(statusText, statusX + 5, 23);

  yPos = 55;

  // Bill To and Invoice Details Section
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', 20, yPos);
  doc.text('INVOICE DETAILS', pageWidth / 2 + 10, yPos);
  
  yPos += 8;

  // Bill To - Customer Information
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text(invoice.user.name || 'N/A', 20, yPos);
  yPos += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);
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

  // Invoice Details (right side)
  let detailsY = 63;
  const labelX = pageWidth / 2 + 10;
  const valueX = pageWidth - 20;

  const addDetailRow = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    doc.text(label + ':', labelX, detailsY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(value, valueX, detailsY, { align: 'right' });
    detailsY += 6;
  };

  addDetailRow('Invoice Number', invoice.invoiceNumber);
  addDetailRow('Issue Date', formatDate(invoice.issueDate));
  addDetailRow('Due Date', formatDate(invoice.dueDate));
  if (invoice.paidDate) {
    addDetailRow('Paid Date', formatDate(invoice.paidDate));
  }
  addDetailRow('Container', invoice.container.containerNumber);
  if (invoice.container.trackingNumber) {
    addDetailRow('Tracking', invoice.container.trackingNumber);
  }

  yPos = Math.max(yPos, detailsY) + 10;

  // Container Information Section
  doc.setFillColor(...COLORS.gold);
  doc.rect(20, yPos - 5, pageWidth - 40, 10, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('SHIPPING INFORMATION', 25, yPos + 2);
  
  yPos += 12;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.text);

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
    yPos += 10;
  } else {
    yPos += 5;
  }

  // Line Items Section
  doc.setFillColor(...COLORS.gold);
  doc.rect(20, yPos - 5, pageWidth - 40, 10, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('LINE ITEMS', 25, yPos + 2);
  
  yPos += 12;

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
        { content: `${vehicleDesc}${vehicleVIN ? ' - ' + vehicleVIN : ''}`, colSpan: 5, styles: { fontStyle: 'bold', fillColor: COLORS.background } }
      ]);
    }

    // Line items
    group.items.forEach(item => {
      tableData.push([
        { content: item.description, styles: { cellPadding: { left: group.shipment ? 10 : 5 } } },
        item.type.replace('_', ' '),
        item.quantity.toString(),
        formatCurrency(item.unitPrice),
        formatCurrency(item.amount),
      ]);
    });
  });

  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Type', 'Qty', 'Unit Price', 'Amount']],
    body: tableData,
    foot: [
      ['', '', '', 'Subtotal:', formatCurrency(invoice.subtotal)],
      ...(invoice.discount > 0 ? [['', '', '', 'Discount:', `-${formatCurrency(invoice.discount)}`]] : []),
      ...(invoice.tax > 0 ? [['', '', '', 'Tax:', formatCurrency(invoice.tax)]] : []),
      ['', '', '', 'TOTAL:', formatCurrency(invoice.total)],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: COLORS.dark,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 9,
    },
    footStyles: {
      fillColor: COLORS.background,
      textColor: COLORS.dark,
      fontStyle: 'bold',
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: COLORS.background,
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 20, right: 20 },
    didDrawPage: function (data) {
      // Footer
      const footerY = pageHeight - 20;
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.text);
      doc.setFont('helvetica', 'normal');
      doc.text('Thank you for your business!', pageWidth / 2, footerY, { align: 'center' });
      doc.text(`Page ${data.pageNumber}`, pageWidth - 20, footerY, { align: 'right' });
      
      // Confidentiality notice
      doc.setFontSize(7);
      doc.text('This invoice is confidential and intended solely for the addressee.', pageWidth / 2, footerY + 5, { align: 'center' });
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Payment Information (if paid)
  if (invoice.status === 'PAID' && invoice.paymentMethod) {
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(...COLORS.success);
    doc.rect(20, yPos - 5, pageWidth - 40, 10, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT INFORMATION', 25, yPos + 2);
    
    yPos += 15;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    
    doc.text(`Payment Method: ${invoice.paymentMethod}`, 25, yPos);
    yPos += 5;
    
    if (invoice.paymentReference) {
      doc.text(`Reference: ${invoice.paymentReference}`, 25, yPos);
      yPos += 5;
    }
    
    doc.text(`Paid Date: ${formatDate(invoice.paidDate)}`, 25, yPos);
    yPos += 10;
  }

  // Notes (if any)
  if (invoice.notes) {
    if (yPos > pageHeight - 50) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFillColor(...COLORS.gold);
    doc.rect(20, yPos - 5, pageWidth - 40, 10, 'F');
    doc.setTextColor(...COLORS.white);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTES', 25, yPos + 2);
    
    yPos += 15;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.text);
    
    const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 50);
    doc.text(notesLines, 25, yPos);
  }

  return doc;
};

export const downloadInvoicePDF = (invoice: Invoice) => {
  const doc = generateInvoicePDF(invoice);
  const fileName = `Invoice_${invoice.invoiceNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
