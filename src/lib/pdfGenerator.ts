import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate?: string;
  status?: string;
  customer: {
    name: string;
    email?: string;
    address?: string;
    phone?: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  notes?: string;
  terms?: string;
}

interface ShipmentData {
  id: string;
  vehicleVIN?: string;
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  origin?: string;
  destination?: string;
  status?: string;
  estimatedDelivery?: string;
  [key: string]: any;
}

interface ContainerData {
  containerNumber: string;
  type?: string;
  size?: string;
  status?: string;
  origin?: string;
  destination?: string;
  departureDate?: string;
  arrivalDate?: string;
  [key: string]: any;
}

export class PDFGenerator {
  private doc: jsPDF;
  private readonly primaryColor = '#D4AF37'; // Gold
  private readonly textColor = '#1A1A1A';
  private readonly lightGray = '#F5F5F5';
  private readonly borderColor = '#E0E0E0';

  constructor() {
    this.doc = new jsPDF();
  }

  // Add company header
  private addHeader(title: string) {
    const pageWidth = this.doc.internal.pageSize.width;

    // Company logo/name
    this.doc.setFillColor(this.primaryColor);
    this.doc.rect(0, 0, pageWidth, 35, 'F');

    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('JACXI', 15, 20);

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(title, 15, 28);

    // Company details (right aligned)
    const companyDetails = [
      'Shipping & Logistics',
      'info@jacxi.com',
      'www.jacxi.com',
    ];

    this.doc.setFontSize(9);
    companyDetails.forEach((detail, index) => {
      this.doc.text(detail, pageWidth - 15, 15 + index * 5, { align: 'right' });
    });

    this.doc.setTextColor(this.textColor);
  }

  // Add footer with page numbers
  private addFooter() {
    const pageCount = this.doc.getNumberOfPages();
    const pageWidth = this.doc.internal.pageSize.width;
    const pageHeight = this.doc.internal.pageSize.height;

    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(8);
      this.doc.setTextColor(128, 128, 128);
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      this.doc.text(
        `Generated on ${new Date().toLocaleDateString()}`,
        pageWidth - 15,
        pageHeight - 10,
        { align: 'right' }
      );
    }
  }

  // Generate Invoice PDF
  generateInvoice(data: InvoiceData): void {
    this.addHeader('INVOICE');

    let yPos = 45;

    // Invoice details (left) and Customer details (right)
    const pageWidth = this.doc.internal.pageSize.width;
    const midPoint = pageWidth / 2;

    // Invoice Info (Left)
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Invoice Details', 15, yPos);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    yPos += 7;
    this.doc.text(`Invoice #: ${data.invoiceNumber}`, 15, yPos);
    yPos += 5;
    this.doc.text(`Date: ${data.date}`, 15, yPos);
    if (data.dueDate) {
      yPos += 5;
      this.doc.text(`Due Date: ${data.dueDate}`, 15, yPos);
    }
    if (data.status) {
      yPos += 5;
      this.doc.text(`Status: ${data.status}`, 15, yPos);
    }

    // Customer Info (Right)
    yPos = 45;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.text('Bill To', midPoint + 10, yPos);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    yPos += 7;
    this.doc.text(data.customer.name, midPoint + 10, yPos);
    if (data.customer.email) {
      yPos += 5;
      this.doc.text(data.customer.email, midPoint + 10, yPos);
    }
    if (data.customer.phone) {
      yPos += 5;
      this.doc.text(data.customer.phone, midPoint + 10, yPos);
    }
    if (data.customer.address) {
      yPos += 5;
      const addressLines = this.doc.splitTextToSize(data.customer.address, 80);
      this.doc.text(addressLines, midPoint + 10, yPos);
    }

    // Items table
    yPos = 85;
    const tableData = data.items.map((item) => [
      item.description,
      item.quantity.toString(),
      `$${item.unitPrice.toFixed(2)}`,
      `$${item.total.toFixed(2)}`,
    ]);

    autoTable(this.doc, {
      startY: yPos,
      head: [['Description', 'Quantity', 'Unit Price', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: this.primaryColor,
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9,
        cellPadding: 5,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
      },
    });

    // Get the final Y position after the table
    const finalY = (this.doc as any).lastAutoTable.finalY || yPos + 50;

    // Totals section (right aligned)
    yPos = finalY + 10;
    const rightMargin = pageWidth - 15;
    const labelX = rightMargin - 50;
    const valueX = rightMargin;

    this.doc.setFontSize(9);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Subtotal:', labelX, yPos);
    this.doc.text(`$${data.subtotal.toFixed(2)}`, valueX, yPos, { align: 'right' });

    if (data.discount) {
      yPos += 6;
      this.doc.text('Discount:', labelX, yPos);
      this.doc.text(`-$${data.discount.toFixed(2)}`, valueX, yPos, { align: 'right' });
    }

    if (data.tax) {
      yPos += 6;
      this.doc.text('Tax:', labelX, yPos);
      this.doc.text(`$${data.tax.toFixed(2)}`, valueX, yPos, { align: 'right' });
    }

    // Total
    yPos += 8;
    this.doc.setDrawColor(this.primaryColor);
    this.doc.line(labelX - 5, yPos - 3, valueX, yPos - 3);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.text('Total:', labelX, yPos);
    this.doc.text(`$${data.total.toFixed(2)}`, valueX, yPos, { align: 'right' });

    // Notes and terms
    if (data.notes || data.terms) {
      yPos += 15;
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(9);

      if (data.notes) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('Notes:', 15, yPos);
        this.doc.setFont('helvetica', 'normal');
        yPos += 5;
        const notesLines = this.doc.splitTextToSize(data.notes, pageWidth - 30);
        this.doc.text(notesLines, 15, yPos);
        yPos += notesLines.length * 5 + 5;
      }

      if (data.terms) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.text('Terms & Conditions:', 15, yPos);
        this.doc.setFont('helvetica', 'normal');
        yPos += 5;
        const termsLines = this.doc.splitTextToSize(data.terms, pageWidth - 30);
        this.doc.text(termsLines, 15, yPos);
      }
    }

    this.addFooter();
  }

  // Generate Shipment Report PDF
  generateShipmentReport(shipments: ShipmentData[]): void {
    this.addHeader('SHIPMENT REPORT');

    let yPos = 45;
    this.doc.setFontSize(10);
    this.doc.text(`Total Shipments: ${shipments.length}`, 15, yPos);
    this.doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 15, yPos + 6);

    yPos = 60;

    const tableData = shipments.map((shipment) => [
      shipment.id,
      shipment.vehicleVIN || 'N/A',
      `${shipment.vehicleYear || ''} ${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''}`.trim() || 'N/A',
      shipment.origin || 'N/A',
      shipment.destination || 'N/A',
      shipment.status || 'N/A',
    ]);

    autoTable(this.doc, {
      startY: yPos,
      head: [['ID', 'VIN', 'Vehicle', 'Origin', 'Destination', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: this.primaryColor,
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 35 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 30 },
        4: { cellWidth: 30 },
        5: { cellWidth: 25 },
      },
    });

    this.addFooter();
  }

  // Generate Container Report PDF
  generateContainerReport(containers: ContainerData[]): void {
    this.addHeader('CONTAINER REPORT');

    let yPos = 45;
    this.doc.setFontSize(10);
    this.doc.text(`Total Containers: ${containers.length}`, 15, yPos);
    this.doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 15, yPos + 6);

    yPos = 60;

    const tableData = containers.map((container) => [
      container.containerNumber,
      container.type || 'N/A',
      container.size || 'N/A',
      container.origin || 'N/A',
      container.destination || 'N/A',
      container.status || 'N/A',
    ]);

    autoTable(this.doc, {
      startY: yPos,
      head: [['Container #', 'Type', 'Size', 'Origin', 'Destination', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: this.primaryColor,
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
    });

    this.addFooter();
  }

  // Save the PDF
  save(filename: string): void {
    this.doc.save(filename);
  }

  // Get PDF as blob
  getBlob(): Blob {
    return this.doc.output('blob');
  }

  // Get PDF as data URL
  getDataUrl(): string {
    return this.doc.output('dataurlstring');
  }
}

// Utility functions
export function generateInvoicePDF(data: InvoiceData, filename?: string): void {
  const generator = new PDFGenerator();
  generator.generateInvoice(data);
  generator.save(filename || `invoice-${data.invoiceNumber}.pdf`);
}

export function generateShipmentReportPDF(
  shipments: ShipmentData[],
  filename?: string
): void {
  const generator = new PDFGenerator();
  generator.generateShipmentReport(shipments);
  generator.save(filename || `shipment-report-${Date.now()}.pdf`);
}

export function generateContainerReportPDF(
  containers: ContainerData[],
  filename?: string
): void {
  const generator = new PDFGenerator();
  generator.generateContainerReport(containers);
  generator.save(filename || `container-report-${Date.now()}.pdf`);
}
