import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PaymentStatus } from '@prisma/client';
import {
  hasProvidedValue,
  mapShipmentCreateError,
  parseOptionalDate,
  parseOptionalFloat,
  parseOptionalInt,
  resolvePaymentStatus,
} from './create-shipment-utils';

describe('create-shipment-utils', () => {
  it('parses optional numeric values safely', () => {
    assert.equal(parseOptionalInt('2024'), 2024);
    assert.equal(parseOptionalInt(''), null);
    assert.equal(parseOptionalInt('abc'), null);

    assert.equal(parseOptionalFloat('1450.50'), 1450.5);
    assert.equal(parseOptionalFloat(''), null);
    assert.equal(parseOptionalFloat('abc'), null);
  });

  it('parses optional dates safely', () => {
    const date = parseOptionalDate('2026-07-29');
    assert.ok(date instanceof Date);
    assert.equal(parseOptionalDate(''), null);
    assert.equal(parseOptionalDate('not-a-date'), null);
  });

  it('detects provided values and resolves payment status with enum values', () => {
    assert.equal(hasProvidedValue(' value '), true);
    assert.equal(hasProvidedValue(''), false);
    assert.equal(hasProvidedValue(null), false);

    assert.equal(resolvePaymentStatus('CASH'), PaymentStatus.COMPLETED);
    assert.equal(resolvePaymentStatus('DUE'), PaymentStatus.PENDING);
    assert.equal(resolvePaymentStatus(undefined), PaymentStatus.PENDING);
  });

  it('maps known Prisma-like errors to actionable API responses', () => {
    assert.deepEqual(
      mapShipmentCreateError({ code: 'P2002', meta: { target: ['vehicleVIN'] } }),
      { status: 409, message: 'A record with the same vehicleVIN already exists.' }
    );

    assert.deepEqual(
      mapShipmentCreateError({ name: 'PrismaClientValidationError' }),
      { status: 400, message: 'Invalid shipment data. Please review the entered values and try again.' }
    );
  });
});
