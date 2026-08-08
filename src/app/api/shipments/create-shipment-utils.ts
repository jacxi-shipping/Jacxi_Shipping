import { PaymentStatus } from '@prisma/client';

export function hasProvidedValue(value: unknown): boolean {
  return value !== null && value !== undefined && `${value}`.trim() !== '';
}

export function parseOptionalInt(value: unknown): number | null {
  if (!hasProvidedValue(value)) {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number.parseInt(`${value}`, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseOptionalFloat(value: unknown): number | null {
  if (!hasProvidedValue(value)) {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number.parseFloat(`${value}`);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseOptionalDate(value: unknown): Date | null {
  if (!hasProvidedValue(value)) {
    return null;
  }

  const parsed = new Date(`${value}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function resolvePaymentStatus(paymentMode: 'CASH' | 'DUE' | null | undefined): PaymentStatus {
  if (paymentMode === 'CASH') {
    return PaymentStatus.COMPLETED;
  }

  return PaymentStatus.PENDING;
}

type PrismaLikeError = {
  code?: unknown;
  message?: unknown;
  meta?: {
    target?: unknown;
  };
  name?: unknown;
};

export function mapShipmentCreateError(error: unknown): { status: number; message: string } {
  const prismaError = error as PrismaLikeError | null;
  const code = typeof prismaError?.code === 'string' ? prismaError.code : null;

  if (code === 'P2002') {
    const target = Array.isArray(prismaError?.meta?.target)
      ? prismaError.meta.target.join(', ')
      : typeof prismaError?.meta?.target === 'string'
      ? prismaError.meta.target
      : null;

    return {
      status: 409,
      message: target
        ? `A record with the same ${target} already exists.`
        : 'A record with the same unique value already exists.',
    };
  }

  if (code === 'P2003') {
    return {
      status: 400,
      message: 'Related data is invalid or missing. Please verify your selected user/container and try again.',
    };
  }

  if (code === 'P2025') {
    return {
      status: 404,
      message: 'A related record required to create this shipment was not found.',
    };
  }

  if (typeof prismaError?.name === 'string' && prismaError.name === 'PrismaClientValidationError') {
    return {
      status: 400,
      message: 'Invalid shipment data. Please review the entered values and try again.',
    };
  }

  if (error instanceof Error && error.message.trim()) {
    return {
      status: 500,
      message: error.message,
    };
  }

  return {
    status: 500,
    message: 'Internal server error',
  };
}
