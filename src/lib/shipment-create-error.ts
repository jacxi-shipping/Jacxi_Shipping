type ShipmentCreateErrorResponse = {
  status: number;
  message: string;
};

type PrismaLikeError = {
  name?: string;
  code?: string;
  message?: string;
  meta?: {
    target?: unknown;
  };
};

function isPrismaLikeError(value: unknown): value is PrismaLikeError {
  return typeof value === 'object' && value !== null;
}

function extractPostgresMessage(rawMessage: string): string | null {
  const postgresMessageMatch = rawMessage.match(/message:\s*"([^"]+)"/i);
  if (postgresMessageMatch?.[1]) {
    return postgresMessageMatch[1];
  }

  const normalizedLines = rawMessage
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !line.startsWith('Invalid `') &&
        !line.includes('invocation') &&
        !line.startsWith('Error occurred during query execution:')
    );

  return normalizedLines[0] ?? null;
}

export function getShipmentCreateErrorResponse(error: unknown): ShipmentCreateErrorResponse {
  if (isPrismaLikeError(error) && typeof error.code === 'string') {
    if (error.code === 'P2002') {
      const targetFields = Array.isArray(error.meta?.target)
        ? error.meta?.target.map((field) => String(field))
        : [];

      if (targetFields.includes('vehicleVIN')) {
        return {
          status: 400,
          message: 'A shipment with this VIN already exists.',
        };
      }

      return {
        status: 409,
        message: 'A unique field conflict occurred while creating the shipment.',
      };
    }

    if (error.code === 'P2003') {
      return {
        status: 400,
        message: 'Shipment references an invalid related record (user, container, or company).',
      };
    }

    if (error.code === 'P2025') {
      return {
        status: 404,
        message: 'A related record required to create this shipment could not be found.',
      };
    }
  }

  if (isPrismaLikeError(error) && error.name === 'PrismaClientValidationError') {
    return {
      status: 400,
      message: 'Invalid shipment data. Please review the form values and try again.',
    };
  }

  if (isPrismaLikeError(error) && error.name === 'PrismaClientUnknownRequestError') {
    const rawMessage = typeof error.message === 'string' ? error.message : '';
    if (/ShipmentStatus/i.test(rawMessage) && /ShipmentSimpleStatus/i.test(rawMessage)) {
      return {
        status: 500,
        message:
          'Shipment status enum mismatch detected in the database configuration. Please run the latest migrations and try again.',
      };
    }

    const postgresMessage = extractPostgresMessage(rawMessage);
    if (postgresMessage) {
      return {
        status: 500,
        message: `Database error while creating shipment: ${postgresMessage}`,
      };
    }
  }

  if (error instanceof Error && error.message) {
    return {
      status: 500,
      message: error.message,
    };
  }

  return {
    status: 500,
    message: 'Failed to create shipment due to an unexpected server error.',
  };
}
