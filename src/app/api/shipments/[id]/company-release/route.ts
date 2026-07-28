import { NextResponse } from 'next/server';
import { z } from 'zod';
import { companySupportsRole } from '@/lib/company-roles';
import { routeDeps } from '@/lib/route-deps';
import { sendShipmentWorkflowNotifications } from '@/lib/workflow-notifications';
import { ensureWorkflowMoveAllowed } from '@/lib/workflow-access';

const companyReleaseSchema = z.object({
  companyId: z.string().min(1),
  origin: z.string().optional(),
  destination: z.string().optional(),
});

function generateReferenceNumber() {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `TRN-${year}-${random}`;
}

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

    const created = await routeDeps.prisma.$transaction(async (tx) => {
      let referenceNumber = generateReferenceNumber();
      let attempts = 0;

      while (attempts < 5) {
        const existing = await tx.transit.findUnique({ where: { referenceNumber } });
        if (!existing) break;
        referenceNumber = generateReferenceNumber();
        attempts += 1;
      }

      if (attempts >= 5) {
        throw new Error('Could not generate transit reference');
      }

      const transit = await tx.transit.create({
        data: {
          referenceNumber,
          origin,
          destination,
          dispatchDate: startedAt,
          status: 'IN_TRANSIT',
          createdBy: session.user!.id as string,
        },
      });

      await tx.transitEvent.create({
        data: {
          transitId: transit.id,
          companyId: company.id,
          origin,
          destination,
          status: 'COMPANY_RELEASED',
          description: `Shipment ${shipment.id} released to ${company.name}`,
          eventDate: startedAt,
          createdBy: session.user!.id as string,
        },
      });

      const updatedShipment = await tx.shipment.update({
        where: { id: shipment.id },
        data: {
          transitId: transit.id,
          status: 'IN_TRANSIT_TO_DESTINATION',
          shippingCompanyId: company.id,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return { transit, updatedShipment };
    });

    const shipmentLabel = buildShipmentLabel(created.updatedShipment);
    await sendShipmentWorkflowNotifications(
      session.user.id as string,
      [
        {
          shipmentId: created.updatedShipment.id,
          shipmentUserId: created.updatedShipment.userId,
          title: 'Shipment workflow updated',
          customerDescription: `Your shipment ${shipmentLabel} has been released to ${company.name} and is now in destination transit.`,
          internalDescription: `Shipment ${shipmentLabel} was released to company ${company.name}.`,
          link: `/dashboard/shipments/${created.updatedShipment.id}`,
        },
      ],
      {
        prisma: routeDeps.prisma,
        createNotificationsFn: routeDeps.createNotifications,
      },
    );

    return NextResponse.json({
      shipment: created.updatedShipment,
      transit: {
        id: created.transit.id,
        referenceNumber: created.transit.referenceNumber,
        dispatchDate: created.transit.dispatchDate,
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
