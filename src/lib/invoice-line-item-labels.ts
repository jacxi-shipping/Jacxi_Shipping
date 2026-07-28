export function getInvoiceLineItemDisplayLabel(type: string, description: string): string {
  const normalizedType = (type || '').toUpperCase();
  const normalizedDescription = (description || '').toLowerCase();

  if (normalizedDescription.includes('port charges')) {
    return 'Port Charges';
  }

  if (normalizedDescription.includes('fuel')) {
    return 'Fuel';
  }

  if (normalizedDescription.includes('towing')) {
    return 'Towing';
  }

  if (normalizedDescription.includes('customs')) {
    return 'Customs';
  }

  if (normalizedDescription.includes('storage')) {
    return 'Storage Fee';
  }

  if (normalizedDescription.includes('handling')) {
    return 'Handling Fee';
  }

  if (normalizedDescription.includes('insurance')) {
    return 'Insurance';
  }

  switch (normalizedType) {
    case 'SHIPPING_FEE':
      return 'Shipping Fee';
    case 'CUSTOMS_FEE':
    case 'CUSTOMS':
      return 'Customs';
    case 'STORAGE_FEE':
      return 'Storage Fee';
    case 'HANDLING_FEE':
      return 'Handling Fee';
    case 'INSURANCE':
      return 'Insurance';
    case 'OTHER_FEE':
    case 'OTHER':
      return 'Other';
    default:
      return type.replace(/_/g, ' ');
  }
}
