import { LineItemType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

type DbClient = Prisma.TransactionClient | typeof prisma;

const db = (client: DbClient) => client as typeof prisma;

/**
 * Generate the next invoice number (INV-YYYY-NNNN).
 * Must be called inside a transaction to be race-safe.
 */
export async function generateInvoiceNumber(client: DbClient): Promise<string> {
  const count = await db(client).userInvoice.count();
  const year = new Date().getFullYear();
  return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
}

/**
 * Get the active (non-cancelled) invoice for a shipment.
 * Returns the most recently created invoice to ensure deterministic results when
 * multiple invoices (e.g. original + supplemental) exist for the same shipment.
 */
export async function getShipmentInvoice(shipmentId: string, client: DbClient = prisma) {
  return db(client).userInvoice.findFirst({
    where: {
      shipmentId,
      status: { not: 'CANCELLED' },
    },
    orderBy: { createdAt: 'desc' },
    select: { id: true, subtotal: true, discount: true, tax: true, status: true },
  });
}

/**
 * Map a free-form expense type string to a Prisma LineItemType enum value.
 */
export function mapExpenseTypeToLineItemType(expenseType: string): LineItemType {
  const normalized = expenseType.toUpperCase().replace(/[- ]/g, '_');
  const map: Record<string, LineItemType> = {
    SHIPPING_FEE: LineItemType.SHIPPING_FEE,
    SHIPPING: LineItemType.SHIPPING_FEE,
    INSURANCE: LineItemType.INSURANCE,
    CUSTOMS: LineItemType.CUSTOMS_FEE,
    CUSTOMS_FEE: LineItemType.CUSTOMS_FEE,
    STORAGE_FEE: LineItemType.STORAGE_FEE,
    STORAGE: LineItemType.STORAGE_FEE,
    HANDLING_FEE: LineItemType.HANDLING_FEE,
    HANDLING: LineItemType.HANDLING_FEE,
    TOWING: LineItemType.HANDLING_FEE,
    PORT_CHARGES: LineItemType.HANDLING_FEE,
    FUEL: LineItemType.OTHER_FEE,
    OTHER: LineItemType.OTHER_FEE,
  };
  return map[normalized] ?? LineItemType.OTHER_FEE;
}

/**
 * Add an expense line item to a shipment's pending invoice and update the invoice total.
 * Safe to call inside or outside a Prisma transaction.
 * Returns the invoiceId if updated, or null if no active invoice found.
 */
export async function addExpenseLineItemToShipmentInvoice(
  shipmentId: string,
  lineItemData: {
    description: string;
    type: LineItemType;
    amount: number;
    quantity?: number;
  },
  client: DbClient = prisma
): Promise<string | null> {
  const invoice = await getShipmentInvoice(shipmentId, client);
  if (!invoice) return null;

  // Only modify mutable (DRAFT / PENDING) invoices.
  // SENT and OVERDUE invoices are already issued documents; adding a line item to them
  // would cause the expense to appear on both the original issued invoice AND a new
  // supplemental invoice, resulting in double-counting and preventing supplement creation.
  const mutableStatuses = ['DRAFT', 'PENDING'];
  if (!mutableStatuses.includes(invoice.status)) return null;

  const quantity = lineItemData.quantity ?? 1;
  const unitPrice = lineItemData.amount / quantity;

  await db(client).invoiceLineItem.create({
    data: {
      invoiceId: invoice.id,
      shipmentId,
      description: lineItemData.description,
      type: lineItemData.type,
      quantity,
      unitPrice,
      amount: lineItemData.amount,
    },
  });

  const newSubtotal = invoice.subtotal + lineItemData.amount;
  const newTotal = newSubtotal - (invoice.discount ?? 0) + (invoice.tax ?? 0);

  await db(client).userInvoice.update({
    where: { id: invoice.id },
    data: { subtotal: newSubtotal, total: newTotal },
  });

  return invoice.id;
}
