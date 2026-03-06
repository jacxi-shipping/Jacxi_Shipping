import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateCompanyLedgerBalances } from '@/lib/company-ledger';
import { recalculateUserLedgerBalances } from '@/lib/user-ledger';
import { hasAnyPermission } from '@/lib/rbac';
import { z } from 'zod';

const damageSchema = z.object({
  shipmentId: z.string().min(1),
  damageType: z.enum(['WE_PAY', 'COMPANY_PAYS']),
  amount: z.number().positive(),
  description: z.string().min(1),
});

// GET - List damage records for a container
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasAnyPermission(session.user?.role, ['finance:view', 'containers:read_all'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const damages = await prisma.containerDamage.findMany({
      where: { containerId: params.id },
      include: {
        shipment: {
          select: {
            id: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleVIN: true,
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ damages, count: damages.length });
  } catch (error) {
    console.error('Error fetching container damages:', error);
    return NextResponse.json({ error: 'Failed to fetch damages' }, { status: 500 });
  }
}

// POST - Add a damage record
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasAnyPermission(session.user?.role, ['finance:manage', 'containers:manage'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch container with company and shipments
    const container = await prisma.container.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        companyId: true,
        shipments: {
          select: {
            id: true,
            userId: true,
            vehicleYear: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleVIN: true,
          },
        },
      },
    });

    if (!container) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    if (!container.companyId) {
      return NextResponse.json(
        { error: 'This container must be assigned to a shipping company before adding expenses or damages.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = damageSchema.parse(body);

    // Ensure the shipment belongs to this container
    const shipment = container.shipments.find((s) => s.id === validatedData.shipmentId);
    if (!shipment) {
      return NextResponse.json(
        { error: 'Shipment does not belong to this container' },
        { status: 400 }
      );
    }

    const damage = await prisma.$transaction(async (tx) => {
      // Create the damage record
      const createdDamage = await tx.containerDamage.create({
        data: {
          containerId: params.id,
          shipmentId: validatedData.shipmentId,
          damageType: validatedData.damageType,
          amount: validatedData.amount,
          description: validatedData.description,
        },
      });

      const reference = `container-damage:${createdDamage.id}`;
      const vehicleLabel = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
        .filter(Boolean)
        .join(' ') || 'Vehicle';
      const vinSuffix = shipment.vehicleVIN ? ` (VIN: ${shipment.vehicleVIN})` : '';

      if (validatedData.damageType === 'WE_PAY') {
        // WE_PAY: credit user ledger (compensation to customer)
        await tx.ledgerEntry.create({
          data: {
            userId: shipment.userId,
            shipmentId: validatedData.shipmentId,
            description: `Damage compensation - ${validatedData.description} for ${vehicleLabel}${vinSuffix}`,
            type: 'CREDIT',
            amount: validatedData.amount,
            balance: 0,
            createdBy: session.user!.id as string,
            notes: validatedData.description,
            metadata: {
              isDamage: true,
              damageType: 'WE_PAY',
              containerDamageId: createdDamage.id,
              containerId: params.id,
            },
          },
        });

        await recalculateUserLedgerBalances(tx, shipment.userId);
      } else {
        // COMPANY_PAYS: debit company ledger
        await tx.companyLedgerEntry.create({
          data: {
            companyId: container.companyId as string,
            description: `Shipment damage charge - ${validatedData.description} for ${vehicleLabel}${vinSuffix}`,
            type: 'DEBIT',
            amount: validatedData.amount,
            balance: 0,
            category: 'Shipment Damage',
            reference,
            notes: validatedData.description,
            createdBy: session.user!.id as string,
            metadata: {
              isDamage: true,
              damageType: 'COMPANY_PAYS',
              containerDamageId: createdDamage.id,
              containerId: params.id,
              shipmentId: validatedData.shipmentId,
            },
          },
        });

        await recalculateCompanyLedgerBalances(tx, container.companyId as string);
      }

      return createdDamage;
    });

    // Create audit log
    await prisma.containerAuditLog.create({
      data: {
        containerId: params.id,
        action: 'DAMAGE_ADDED',
        description: `Damage added: ${validatedData.damageType} - $${validatedData.amount} - ${validatedData.description}`,
        performedBy: session.user.id as string,
        newValue: JSON.stringify({
          damageType: validatedData.damageType,
          amount: validatedData.amount,
          shipmentId: validatedData.shipmentId,
        }),
      },
    });

    return NextResponse.json({ damage, message: 'Damage record created successfully' }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    console.error('Error creating damage record:', error);
    return NextResponse.json({ error: 'Failed to create damage record' }, { status: 500 });
  }
}

// DELETE - Remove a damage record
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();

    if (!session?.user || !hasAnyPermission(session.user?.role, ['finance:manage', 'containers:manage'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const damageId = searchParams.get('damageId');

    if (!damageId) {
      return NextResponse.json({ error: 'Damage ID required' }, { status: 400 });
    }

    const damage = await prisma.containerDamage.findUnique({
      where: { id: damageId },
      include: {
        container: { select: { id: true, companyId: true } },
        shipment: { select: { id: true, userId: true } },
      },
    });

    if (!damage) {
      return NextResponse.json({ error: 'Damage record not found' }, { status: 404 });
    }

    if (damage.containerId !== params.id) {
      return NextResponse.json({ error: 'Damage does not belong to this container' }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      // Remove linked ledger entries
      if (damage.damageType === 'WE_PAY') {
        const linkedEntries = await tx.ledgerEntry.findMany({
          where: {
            metadata: { path: ['containerDamageId'], equals: damageId },
          },
          select: { id: true, userId: true },
        });

        if (linkedEntries.length > 0) {
          await tx.ledgerEntry.deleteMany({
            where: { id: { in: linkedEntries.map((e) => e.id) } },
          });
          const userIds = Array.from(new Set(linkedEntries.map((e) => e.userId)));
          for (const userId of userIds) {
            await recalculateUserLedgerBalances(tx, userId);
          }
        }
      } else {
        const linkedEntries = await tx.companyLedgerEntry.findMany({
          where: {
            metadata: { path: ['containerDamageId'], equals: damageId },
          },
          select: { id: true, companyId: true },
        });

        if (linkedEntries.length > 0) {
          await tx.companyLedgerEntry.deleteMany({
            where: { id: { in: linkedEntries.map((e) => e.id) } },
          });
          const companyIds = new Set(linkedEntries.map((e) => e.companyId));
          for (const companyId of companyIds) {
            await recalculateCompanyLedgerBalances(tx, companyId);
          }
        }
      }

      await tx.containerDamage.delete({ where: { id: damageId } });
    });

    return NextResponse.json({ message: 'Damage record deleted successfully' });
  } catch (error) {
    console.error('Error deleting damage record:', error);
    return NextResponse.json({ error: 'Failed to delete damage record' }, { status: 500 });
  }
}
