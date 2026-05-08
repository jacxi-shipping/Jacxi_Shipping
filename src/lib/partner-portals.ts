import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';

export const PARTNER_PORTAL_ADMIN_ROLE = 'ADMIN';

export function canManagePartnerPortals(role: string | null | undefined) {
  return hasPermission(role, 'users:manage') || hasPermission(role, 'customers:manage');
}

export function canReadPartnerPortalCustomers(role: string | null | undefined) {
  return hasPermission(role, 'customers:view') || hasPermission(role, 'customers:manage');
}

export function canReadPartnerPortalShipments(role: string | null | undefined) {
  return hasPermission(role, 'shipments:read_all') || hasPermission(role, 'shipments:manage');
}

export function canAssignShipmentsToPartnerPortals(role: string | null | undefined) {
  return hasPermission(role, 'shipments:manage');
}

export function canManagePortalMemberships(membershipRole: string | null | undefined) {
  return membershipRole === PARTNER_PORTAL_ADMIN_ROLE;
}

export async function getPartnerPortalMembership(portalId: string, userId: string) {
  return prisma.partnerPortalMembership.findUnique({
    where: {
      portalId_userId: {
        portalId,
        userId,
      },
    },
    include: {
      portal: {
        select: {
          id: true,
          name: true,
          code: true,
          isActive: true,
        },
      },
    },
  });
}

export async function getPartnerPortalOrThrow(portalId: string) {
  return prisma.partnerPortal.findUnique({
    where: { id: portalId },
    select: {
      id: true,
      name: true,
      code: true,
      isActive: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}