'use client';

import { useEffect, useState } from 'react';
import { Building2, Clock3, Play, Undo2 } from 'lucide-react';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, toast } from '@/components/design-system';

type ShipmentCompanyGetpassTabProps = {
  shipmentId: string;
  company: { id: string; name: string } | null;
  startedAt: string | null;
  canStart: boolean;
  onStarted: (startedAt: string) => void;
  onUndone: () => void;
};

function formatElapsedTime(startedAt: string, now: number) {
  const elapsedSeconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(elapsedSeconds / 3600);
  const minutes = Math.floor((elapsedSeconds % 3600) / 60);
  const seconds = elapsedSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':');
}

export default function ShipmentCompanyGetpassTab({
  shipmentId,
  company,
  startedAt,
  canStart,
  onStarted,
  onUndone,
}: ShipmentCompanyGetpassTabProps) {
  const [now, setNow] = useState(() => Date.now());
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!startedAt) return;

    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [startedAt]);

  const handleStart = async () => {
    setStarting(true);

    try {
      const response = await fetch(`/api/shipments/${shipmentId}/company-getpass`, { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start Company Getpass');
      }

      onStarted(data.companyGetpassStartedAt);
      setNow(Date.now());
      toast.success('Company Getpass timer started', { description: `Tracking ${data.company.name}` });
    } catch (error) {
      toast.error('Unable to start Company Getpass', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setStarting(false);
    }
  };

  const handleUndo = async () => {
    setStarting(true);

    try {
      const response = await fetch(`/api/shipments/${shipmentId}/company-getpass`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to undo Company Getpass');
      }

      onUndone();
      toast.success('Company Getpass timer undone');
    } catch (error) {
      toast.error('Unable to undo Company Getpass', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setStarting(false);
    }
  };

  return (
    <DashboardPanel title="Company Getpass" description="Track the time since the shipping company getpass started">
      <div className="flex flex-col gap-6 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--accent-gold)]">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Shipping Company</p>
            <p className="truncate text-base font-semibold text-[var(--text-primary)]">{company?.name || 'Company not assigned'}</p>
          </div>
        </div>

        {startedAt ? (
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="rounded-lg border border-[rgba(34,197,94,0.32)] bg-[rgba(34,197,94,0.10)] px-5 py-3 text-center">
              <div className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wide text-[rgb(21,128,61)]">
                <Clock3 className="h-4 w-4" />
                Elapsed Time
              </div>
              <p className="mt-1 font-mono text-3xl font-semibold tabular-nums text-[var(--text-primary)]">
                {formatElapsedTime(startedAt, now)}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void handleUndo()} disabled={!canStart || starting}>
              <Undo2 className="mr-2 h-4 w-4" />
              Undo Getpass
            </Button>
          </div>
        ) : (
          <Button onClick={() => void handleStart()} disabled={!canStart || !company || starting}>
            <Play className="mr-2 h-4 w-4" />
            {starting ? 'Starting...' : 'Start Getpass'}
          </Button>
        )}
      </div>
    </DashboardPanel>
  );
}