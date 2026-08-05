import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { getShipmentWorkflowStage } from '@/lib/shipment-workflow-stage';

export async function POST(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (
      !hasPermission(session.user.role, 'workflow:move') ||
      !hasPermission(session.user.role, 'shipments:manage')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        containerId: true,
        transitId: true,
        companyGetpassStartedAt: true,
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

    if (getShipmentWorkflowStage(shipment) !== 'SHIPPING') {
      return NextResponse.json(
        { error: 'Company Getpass is available only while the shipment is in shipping' },
        { status: 400 },
      );
    }

    if (!shipment.shippingCompany) {
      return NextResponse.json(
        { error: 'Assign a shipping company before starting Company Getpass' },
        { status: 400 },
      );
    }

    const companyGetpassStartedAt = shipment.companyGetpassStartedAt ?? new Date();

    if (!shipment.companyGetpassStartedAt) {
      await prisma.shipment.update({
        where: { id: shipment.id },
        data: { companyGetpassStartedAt },
      });
    }

    return NextResponse.json({
      company: shipment.shippingCompany,
      companyGetpassStartedAt,
    });
  } catch (error) {
    console.error('Error starting Company Getpass:', error);
    return NextResponse.json({ error: 'Failed to start Company Getpass' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const { id } = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (
      !hasPermission(session.user.role, 'workflow:move') ||
      !hasPermission(session.user.role, 'shipments:manage')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      select: { id: true, companyGetpassStartedAt: true },
    });

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    if (!shipment.companyGetpassStartedAt) {
      return NextResponse.json({ error: 'Company Getpass has not been started' }, { status: 400 });
    }

    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { companyGetpassStartedAt: null },
    });

    return NextResponse.json({ companyGetpassStartedAt: null });
  } catch (error) {
    console.error('Error undoing Company Getpass:', error);
    return NextResponse.json({ error: 'Failed to undo Company Getpass' }, { status: 500 });
  }
}