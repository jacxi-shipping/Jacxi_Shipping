import assert from 'node:assert/strict';
import test from 'node:test';
import { getInvoiceLineItemDisplayLabel } from './invoice-line-item-labels';

test('preserves the selected expense type in invoice labels', () => {
  assert.equal(
    getInvoiceLineItemDisplayLabel('OTHER_FEE', 'Docking fee - port charges for vehicle (VIN ABC123)'),
    'Port Charges'
  );

  assert.equal(
    getInvoiceLineItemDisplayLabel('OTHER_FEE', 'Extra service - fuel for vehicle (VIN ABC123)'),
    'Fuel'
  );

  assert.equal(
    getInvoiceLineItemDisplayLabel('HANDLING_FEE', 'Loading support - towing for vehicle (VIN ABC123)'),
    'Towing'
  );
});
