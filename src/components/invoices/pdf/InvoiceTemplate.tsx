import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register a standard font (optional, using standard Helvetica by default)
// Font.register({ family: 'Roboto', src: '...' });

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    backgroundColor: '#191C1F',
    color: '#FFFFFF',
    padding: 20,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    opacity: 0.8,
  },
  statusBadge: {
    padding: '4 10',
    borderRadius: 4,
    backgroundColor: '#64748B', // Default
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  section: {
    margin: 10,
    padding: 10,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  col: {
    flexDirection: 'column',
  },
  label: {
    fontSize: 9,
    color: '#64748B',
    marginBottom: 2,
  },
  value: {
    fontSize: 10,
    color: '#191C1F',
  },
  billToSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 20,
  },
  billToCol: {
    width: '45%',
  },
  detailsCol: {
    width: '45%',
    alignItems: 'flex-end',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  detailLabel: {
    fontSize: 9,
    color: '#64748B',
    marginRight: 10,
  },
  detailValue: {
    fontSize: 10,
    color: '#191C1F',
    fontWeight: 'bold',
  },
  table: {
    width: '100%',
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    padding: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    padding: 8,
  },
  th: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#64748B',
  },
  td: {
    fontSize: 9,
    color: '#334155',
  },
  col1: { width: '40%' },
  col2: { width: '15%', textAlign: 'center' },
  col3: { width: '15%', textAlign: 'center' },
  col4: { width: '15%', textAlign: 'right' },
  col5: { width: '15%', textAlign: 'right' },
  
  totalsSection: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 5,
    width: '50%',
  },
  totalLabel: {
    fontSize: 10,
    color: '#64748B',
    marginRight: 20,
  },
  totalValue: {
    fontSize: 10,
    color: '#191C1F',
    fontWeight: 'bold',
    width: 80,
    textAlign: 'right',
  },
  grandTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#DAA520', // Gold
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#94A3B8',
  },
});

// Helper types matching the Prisma/App models
interface InvoiceTemplateProps {
  invoice: {
    invoiceNumber: string;
    issueDate: Date | string;
    dueDate: Date | string | null;
    status: string;
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    notes: string | null;
    user: {
      name: string | null;
      email: string;
      address: string | null;
      city: string | null;
      country: string | null;
      phone: string | null;
    };
    container: {
      containerNumber: string;
      vesselName: string | null;
      loadingPort: string | null;
      destinationPort: string | null;
    };
    lineItems: Array<{
      id: string;
      description: string;
      type: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
  };
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (date: Date | string | null) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ invoice }) => {
  // Determine status color
  const statusColor = 
    invoice.status === 'PAID' ? '#22C55E' : 
    invoice.status === 'OVERDUE' ? '#EF4444' : 
    invoice.status === 'SENT' ? '#3B82F6' : 
    '#64748B';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={styles.subtitle}>#{invoice.invoiceNumber}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{invoice.status}</Text>
          </View>
        </View>

        {/* Bill To & Details */}
        <View style={styles.billToSection}>
          <View style={styles.billToCol}>
            <Text style={[styles.label, { marginBottom: 5 }]}>BILL TO</Text>
            <Text style={[styles.value, { fontWeight: 'bold' }]}>{invoice.user.name || 'Valued Customer'}</Text>
            <Text style={styles.value}>{invoice.user.email}</Text>
            {invoice.user.phone && <Text style={styles.value}>{invoice.user.phone}</Text>}
            {invoice.user.address && (
              <Text style={[styles.value, { marginTop: 4 }]}>
                {invoice.user.address}
                {invoice.user.city ? `, ${invoice.user.city}` : ''}
                {invoice.user.country ? `, ${invoice.user.country}` : ''}
              </Text>
            )}
          </View>

          <View style={styles.detailsCol}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Issue Date:</Text>
              <Text style={styles.detailValue}>{formatDate(invoice.issueDate)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Due Date:</Text>
              <Text style={styles.detailValue}>{formatDate(invoice.dueDate)}</Text>
            </View>
            <View style={[styles.detailRow, { marginTop: 8 }]}>
              <Text style={styles.detailLabel}>Container:</Text>
              <Text style={styles.detailValue}>{invoice.container.containerNumber}</Text>
            </View>
            {invoice.container.vesselName && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Vessel:</Text>
                <Text style={styles.detailValue}>{invoice.container.vesselName}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.col1]}>Description</Text>
            <Text style={[styles.th, styles.col2]}>Type</Text>
            <Text style={[styles.th, styles.col3]}>Qty</Text>
            <Text style={[styles.th, styles.col4]}>Price</Text>
            <Text style={[styles.th, styles.col5]}>Amount</Text>
          </View>

          {invoice.lineItems.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[styles.td, styles.col1]}>{item.description}</Text>
              <Text style={[styles.td, styles.col2]}>{item.type.replace('_', ' ')}</Text>
              <Text style={[styles.td, styles.col3]}>{item.quantity}</Text>
              <Text style={[styles.td, styles.col4]}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={[styles.td, styles.col5, { fontWeight: 'bold' }]}>{formatCurrency(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
          </View>
          {invoice.discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount:</Text>
              <Text style={[styles.totalValue, { color: '#22C55E' }]}>-{formatCurrency(invoice.discount)}</Text>
            </View>
          )}
          {invoice.tax > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax:</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.tax)}</Text>
            </View>
          )}
          <View style={[styles.totalRow, { marginTop: 5 }]}>
            <Text style={[styles.totalLabel, { fontSize: 12, fontWeight: 'bold', color: '#191C1F' }]}>TOTAL:</Text>
            <Text style={[styles.totalValue, styles.grandTotal]}>{formatCurrency(invoice.total)}</Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={{ marginTop: 30, padding: 10, backgroundColor: '#F8FAFC', borderRadius: 4 }}>
            <Text style={{ fontSize: 9, fontWeight: 'bold', marginBottom: 4, color: '#64748B' }}>NOTES</Text>
            <Text style={{ fontSize: 9, color: '#334155' }}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Thank you for your business. Please make checks payable to JACXI Shipping.
        </Text>
      </Page>
    </Document>
  );
};

export default InvoiceTemplate;
