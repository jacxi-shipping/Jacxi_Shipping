import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getShipmentCreateErrorResponse } from './shipment-create-error.ts';

describe('getShipmentCreateErrorResponse', () => {
  it('maps duplicate VIN constraint errors to a clear 400 response', () => {
    const response = getShipmentCreateErrorResponse({
      name: 'PrismaClientKnownRequestError',
      code: 'P2002',
      meta: { target: ['vehicleVIN'] },
      message: 'Unique constraint failed on the fields: (`vehicleVIN`)',
    });

    assert.deepStrictEqual(response, {
      status: 400,
      message: 'A shipment with this VIN already exists.',
    });
  });

  it('surfaces shipment status enum mismatches clearly', () => {
    const response = getShipmentCreateErrorResponse({
      name: 'PrismaClientUnknownRequestError',
      message:
        'message: "column \\"status\\" is of type \\"ShipmentStatus\\" but expression is of type \\"ShipmentSimpleStatus\\""',
    });

    assert.deepStrictEqual(response, {
      status: 500,
      message:
        'Shipment status enum mismatch detected in the database configuration. Please run the latest migrations and try again.',
    });
  });

  it('maps Prisma validation errors to a user-correctable message', () => {
    const response = getShipmentCreateErrorResponse({
      name: 'PrismaClientValidationError',
      message: 'Invalid invocation',
    });

    assert.deepStrictEqual(response, {
      status: 400,
      message: 'Invalid shipment data. Please review the form values and try again.',
    });
  });
});
