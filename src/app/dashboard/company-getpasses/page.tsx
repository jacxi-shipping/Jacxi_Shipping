'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Building2, Clock3, ExternalLink, Undo2 } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Breadcrumbs, Button, EmptyState, toast } from '@/components/design-system';

type GetpassShipment = {
  id: string;
  vehicleType: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehicleVIN: string | null;
  status: string;
  companyGetpassStartedAt: string;
  shippingCompany: { id: string; name: string } | null;
  container: { id: string; containerNumber: string } | null;
  expenses: {
    shipping: number;
    dispatch: number;
    total: number;
  };
};

function formatElapsedTime(startedAt: string, now: number) {
  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

function formatVehicle(shipment: GetpassShipment) {
  return [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || shipment.vehicleType;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export default function CompanyGetpassesPage() {
  const [shipments, setShipments] = useState<GetpassShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const fetchGetpasses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/company-getpasses', { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load Company Getpasses');
      }

      setShipments(data.shipments || []);
    } catch (error) {
      toast.error('Unable to load Company Getpasses', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchGetpasses();
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const handleUndo = async (shipmentId: string) => {
    setUndoingId(shipmentId);

    try {
      const response = await fetch(`/api/shipments/${shipmentId}/company-getpass`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to undo Company Getpass');
      }

      setShipments((currentShipments) => currentShipments.filter((shipment) => shipment.id !== shipmentId));
      toast.success('Company Getpass timer undone');
    } catch (error) {
      toast.error('Unable to undo Company Getpass', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setUndoingId(null);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardSurface>
        <div className="flex flex-col gap-4">
          <Breadcrumbs items={[{ label: 'Company Getpasses', href: '' }]} />
          <DashboardPanel title="Company Getpasses" description="Active shipment getpass timers by shipping company">
            {loading ? (
              <div className="py-10 text-center text-sm text-[var(--text-secondary)]">Loading Company Getpasses...</div>
            ) : shipments.length === 0 ? (
              <EmptyState
                icon={<Clock3 className="h-8 w-8" />}
                title="No active Company Getpasses"
                description="Start a getpass timer from a shipment in the shipping stage."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-[var(--border)] text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    <tr>
                      <th className="px-3 py-3">Shipment</th>
                      <th className="px-3 py-3">Shipping Company</th>
                      <th className="px-3 py-3">Container</th>
                      <th className="px-3 py-3">Expenses</th>
                      <th className="px-3 py-3">Elapsed</th>
                      <th className="px-3 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipments.map((shipment) => (
                      <tr key={shipment.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="px-3 py-4">
                          <p className="font-semibold text-[var(--text-primary)]">{formatVehicle(shipment)}</p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">VIN: {shipment.vehicleVIN || 'Not recorded'}</p>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-2 text-[var(--text-primary)]">
                            <Building2 className="h-4 w-4 text-[var(--accent-gold)]" />
                            <span>{shipment.shippingCompany?.name || 'Not assigned'}</span>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-[var(--text-primary)]">{shipment.container?.containerNumber || 'Not assigned'}</td>
                        <td className="px-3 py-4">
                          <p className="font-semibold text-[var(--text-primary)]">{formatMoney(shipment.expenses.total)}</p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            Shipping {formatMoney(shipment.expenses.shipping)} | Dispatch {formatMoney(shipment.expenses.dispatch)}
                          </p>
                        </td>
                        <td className="px-3 py-4">
                          <span className="font-mono text-base font-semibold tabular-nums text-[var(--text-primary)]">
                            {formatElapsedTime(shipment.companyGetpassStartedAt, now)}
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex justify-end gap-2">
                            <Link href={`/dashboard/shipments/${shipment.id}?tab=company-getpass`}>
                              <Button variant="outline" size="sm" aria-label={`Open ${formatVehicle(shipment)} getpass`}>
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleUndo(shipment.id)}
                              disabled={undoingId === shipment.id}
                            >
                              <Undo2 className="mr-2 h-4 w-4" />
                              {undoingId === shipment.id ? 'Undoing...' : 'Undo'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </DashboardPanel>
        </div>
      </DashboardSurface>
    </ProtectedRoute>
  );
}