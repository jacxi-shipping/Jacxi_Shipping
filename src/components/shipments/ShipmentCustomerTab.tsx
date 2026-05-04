'use client';

import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import type { Shipment } from '@/components/shipments/shipment-detail-types';

type ShipmentCustomerTabProps = {
  user: Shipment['user'];
};

export default function ShipmentCustomerTab({ user }: ShipmentCustomerTabProps) {
  return (
    <DashboardPanel title="Customer Information">
      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
          <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Name</p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{user.name || 'N/A'}</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
          <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Email</p>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{user.email}</p>
        </div>
        {user.phone && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Phone</p>
            <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{user.phone}</p>
          </div>
        )}
      </div>
    </DashboardPanel>
  );
}