import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { routeDeps } from '@/lib/route-deps';
import {
  canManagePartnerPortals,
  canManagePortalMemberships,
  getPartnerPortalMembership,
  getPartnerPortalOrThrow,
} from '@/lib/partner-portals';

const updatePortalSettingsSchema = z.object({
  companyLabel: z.string().trim().max(120).optional().or(z.literal('')),
  accentColor: z.string().trim().regex(/^#([0-9a-fA-F]{6})$/, 'Accent color must be a 6-digit hex code').optional().or(z.literal('')),
  logoUrl: z.string().trim().url().optional().or(z.literal('')),
  notifyOnShipmentAssigned: z.boolean().optional(),
  autoAssignToSingleCustomer: z.boolean().optional(),
  defaultShipmentNotes: z.string().trim().max(1000).optional().or(z.literal('')),
  requireCustomerLinkForReady: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ portalId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const portal = await getPartnerPortalOrThrow(portalId);

    if (!portal) {
      return NextResponse.json({ error: 'Partner portal not found' }, { status: 404 });
    }

    const membership = await getPartnerPortalMembership(portalId, session.user.id);
    const hasInternalAccess = canManagePartnerPortals(session.user.role);

    if (!membership && !hasInternalAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ portal });
  } catch (error) {
    routeDeps.logger.error('Failed to fetch portal settings', error);
    return NextResponse.json({ error: 'Failed to fetch portal settings' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ portalId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requesterMembership = await getPartnerPortalMembership(portalId, session.user.id);
    const isInternalManager = canManagePartnerPortals(session.user.role);

    if (!isInternalManager && !canManagePortalMemberships(requesterMembership?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const portal = await getPartnerPortalOrThrow(portalId);
    if (!portal) {
      return NextResponse.json({ error: 'Partner portal not found' }, { status: 404 });
    }

    const payload = updatePortalSettingsSchema.parse(await request.json());

    const updatedPortal = await routeDeps.prisma.partnerPortal.update({
      where: { id: portalId },
      data: {
        companyLabel: payload.companyLabel || null,
        accentColor: payload.accentColor || null,
        logoUrl: payload.logoUrl || null,
        ...(payload.notifyOnShipmentAssigned !== undefined ? { notifyOnShipmentAssigned: payload.notifyOnShipmentAssigned } : {}),
        ...(payload.autoAssignToSingleCustomer !== undefined ? { autoAssignToSingleCustomer: payload.autoAssignToSingleCustomer } : {}),
        ...(payload.defaultShipmentNotes !== undefined ? { defaultShipmentNotes: payload.defaultShipmentNotes || null } : {}),
        ...(payload.requireCustomerLinkForReady !== undefined ? { requireCustomerLinkForReady: payload.requireCustomerLinkForReady } : {}),
      },
      select: {
        id: true,
        name: true,
        code: true,
        companyLabel: true,
        accentColor: true,
        logoUrl: true,
        notifyOnShipmentAssigned: true,
        autoAssignToSingleCustomer: true,
        defaultShipmentNotes: true,
        requireCustomerLinkForReady: true,
        isActive: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ portal: updatedPortal });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
    }

    routeDeps.logger.error('Failed to update portal settings', error);
    return NextResponse.json({ error: 'Failed to update portal settings' }, { status: 500 });
  }
}