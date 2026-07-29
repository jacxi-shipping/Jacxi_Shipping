import { NextResponse } from 'next/server';
import { z } from 'zod';
import { companySupportsRole } from '@/lib/company-roles';
import { routeDeps } from '@/lib/route-deps';
import { sendShipmentWorkflowNotifications } from '@/lib/workflow-notifications';
import { ensureWorkflowMoveAllowed } from '@/lib/workflow-access';

const COMPANY_RELEASED_AUDIT_ACTION = 'COMPANY_RELEASED';
const COMPANY_RELEASE_UNDONE_AUDIT_ACTION = 'COMPANY_RELEASE_UNDONE';

const companyReleaseSchema = z.object({
  companyId: z.string().min(1),
  origin: z.string().optional(),
  destination: z.string().optional(),
});

function buildShipmentLabel(shipment: {
  vehicleYear?: number | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleVIN?: string | null;
  id: string;
}) {
  const vehicleLabel = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (shipment.vehicleVIN && vehicleLabel) {
    return `${vehicleLabel} (${shipment.vehicleVIN})`;
  }

  return shipment.vehicleVIN || vehicleLabel || shipment.id;
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  try {
    const session = await routeDeps.auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (
      !ensureWorkflowMoveAllowed(session.user?.role) ||
      !routeDeps.hasPermission(session.user?.role, 'shipments:manage') ||
      !routeDeps.hasPermission(session.user?.role, 'transits:manage')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const shipment = await routeDeps.prisma.shipment.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        userId: true,
        status: true,
        transitId: true,
        shippingCompanyId: true,
        vehicleYear: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleVIN: true,
        container: {
          select: {
            status: true,
            loadingPort: true,
            destinationPort: true,
          },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const isReleased = String(shipment.status) === 'RELEASED' || shipment.container?.status === 'RELEASED';

    if (!isReleased) {
      return NextResponse.json(
        { error: 'Shipment can be released to a company only after release' },
        { status: 400 },
      );
    }

    if (shipment.transitId) {
      return NextResponse.json({ error: 'Shipment is already assigned to transit' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = companyReleaseSchema.parse(body);

    const company = await routeDeps.prisma.company.findUnique({
      where: { id: validatedData.companyId },
      select: {
        id: true,
        name: true,
        isActive: true,
        companyType: true,
        isShipping: true,
        isTransit: true,
      },
    });

    const supportsShippingOrTransit =
      companySupportsRole(company, 'SHIPPING') || companySupportsRole(company, 'TRANSIT');

    if (!company || !company.isActive || !supportsShippingOrTransit) {
      return NextResponse.json({ error: 'Shipping company not found' }, { status: 404 });
    }

    const origin = validatedData.origin || shipment.container?.loadingPort || 'Dubai, UAE';
    const destination =
      validatedData.destination || shipment.container?.destinationPort || 'Kabul, Afghanistan';
    const startedAt = new Date();

    const updatedShipment = await routeDeps.prisma.$transaction(async (tx) => {
      await tx.shipmentAuditLog.createMany({
        data: [
          {
            shipmentId: shipment.id,
            action: COMPANY_RELEASED_AUDIT_ACTION,
            description: `Shipment ${shipment.id} released to ${company.name}`,
            performedBy: session.user!.id as string,
            oldValue: shipment.shippingCompanyId,
            newValue: company.id,
            metadata: {
              companyId: company.id,
              companyName: company.name,
              origin,
              destination,
              releasedAt: startedAt.toISOString(),
            },
          },
        ],
      });

      return tx.shipment.update({
        where: { id: shipment.id },
        data: {
          shippingCompanyId: company.id,
          status: 'RELEASED',
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    });

    const shipmentLabel = buildShipmentLabel(updatedShipment);
    await sendShipmentWorkflowNotifications(
      session.user.id as string,
      [
        {
          shipmentId: updatedShipment.id,
          shipmentUserId: updatedShipment.userId,
          title: 'Shipment workflow updated',
          customerDescription: `Your shipment ${shipmentLabel} has been released to ${company.name} and is waiting for destination transit assignment.`,
          internalDescription: `Shipment ${shipmentLabel} was released to company ${company.name}.`,
          link: `/dashboard/shipments/${updatedShipment.id}`,
        },
      ],
      {
        prisma: routeDeps.prisma,
        createNotificationsFn: routeDeps.createNotifications,
      },
    );

    return NextResponse.json({
      shipment: updatedShipment,
      companyRelease: {
        companyId: company.id,
        companyName: company.name,
        origin,
        destination,
        releasedAt: startedAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }

    console.error('Error releasing shipment to company:', error);
    return NextResponse.json(
      { error: 'Failed to release shipment to company' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  try {
    const session = await routeDeps.auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (
      !ensureWorkflowMoveAllowed(session.user?.role) ||
      !routeDeps.hasPermission(session.user?.role, 'shipments:manage')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const shipment = await routeDeps.prisma.shipment.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        userId: true,
        status: true,
        transitId: true,
        shippingCompanyId: true,
        vehicleYear: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleVIN: true,
        shippingCompany: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    if (!shipment.shippingCompanyId) {
      return NextResponse.json({ error: 'Shipment is not currently company released' }, { status: 400 });
    }

    if (shipment.transitId) {
      return NextResponse.json(
        { error: 'Cannot undo company release after transit assignment' },
        { status: 400 },
      );
    }

    const updatedShipment = await routeDeps.prisma.$transaction(async (tx) => {
      await tx.shipmentAuditLog.createMany({
        data: [
          {
            shipmentId: shipment.id,
            action: COMPANY_RELEASE_UNDONE_AUDIT_ACTION,
            description: `Company release cleared for shipment ${shipment.id}`,
            performedBy: session.user!.id as string,
            oldValue: shipment.shippingCompanyId,
            newValue: null,
            metadata: {
              companyId: shipment.shippingCompanyId,
              companyName: shipment.shippingCompany?.name ?? null,
              clearedAt: new Date().toISOString(),
            },
          },
        ],
      });

      return tx.shipment.update({
        where: { id: shipment.id },
        data: {
          shippingCompanyId: null,
          status: 'RELEASED',
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    });

    const shipmentLabel = buildShipmentLabel(updatedShipment);
    const companyName = shipment.shippingCompany?.name || 'the assigned company';
    await sendShipmentWorkflowNotifications(
      session.user.id as string,
      [
        {
          shipmentId: updatedShipment.id,
          shipmentUserId: updatedShipment.userId,
          title: 'Shipment workflow updated',
          customerDescription: `Company release was cleared for your shipment ${shipmentLabel}.`,
          internalDescription: `Company release for shipment ${shipmentLabel} was cleared from ${companyName}.`,
          link: `/dashboard/shipments/${updatedShipment.id}`,
        },
      ],
      {
        prisma: routeDeps.prisma,
        createNotificationsFn: routeDeps.createNotifications,
      },
    );

    return NextResponse.json({ shipment: updatedShipment });
  } catch (error) {
    console.error('Error undoing company release:', error);
    return NextResponse.json(
      { error: 'Failed to undo company release' },
      { status: 500 },
    );
  }
}
