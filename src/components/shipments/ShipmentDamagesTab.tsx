'use client';

import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import type { Shipment } from '@/components/shipments/shipment-detail-types';

type ShipmentDamagesTabProps = {
  damages: Shipment['containerDamages'];
};

export default function ShipmentDamagesTab({ damages }: ShipmentDamagesTabProps) {
  return (
    <DashboardPanel title="Shipment Damages" description="Damage records logged for this shipment from container operations">
      {damages && damages.length > 0 ? (
        <div className="space-y-3">
          {damages.map((damage) => (
            <div key={damage.id} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{damage.description}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Added on {new Date(damage.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
                    style={{
                      background: damage.damageType === 'WE_PAY' ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.15)',
                      color: damage.damageType === 'WE_PAY' ? 'rgb(34,197,94)' : 'rgb(249,115,22)',
                      border: damage.damageType === 'WE_PAY' ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(249,115,22,0.35)',
                    }}
                  >
                    {damage.damageType === 'WE_PAY' ? 'We Pay (Customer Credit)' : 'Company Pays'}
                  </span>
                  <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">${damage.amount.toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-[var(--border)] bg-[var(--background)] py-8 text-center text-sm text-[var(--text-secondary)]">
          No damages have been recorded for this shipment.
        </p>
      )}
    </DashboardPanel>
  );
}