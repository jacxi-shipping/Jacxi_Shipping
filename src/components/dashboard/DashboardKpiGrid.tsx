import { StatsCard } from '@/components/design-system';
import { DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { DollarSign, Package, Ship, Truck } from 'lucide-react';

type DashboardKpiGridProps = {
  activeShipmentsCount: number;
  activeContainersCount: number;
  pendingRevenue: string;
  canManageDispatches: boolean;
  activeDispatchesCount: number;
};

export default function DashboardKpiGrid({
  activeShipmentsCount,
  activeContainersCount,
  pendingRevenue,
  canManageDispatches,
  activeDispatchesCount,
}: DashboardKpiGridProps) {
  return (
    <div id="stats-grid">
      <DashboardGrid className={canManageDispatches ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}>
        <StatsCard
          title="Active Shipments"
          value={activeShipmentsCount}
          icon={<Package className="w-5 h-5" />}
          variant="default"
          subtitle="On hand or moving"
          trend={{ value: 0, isPositive: true }}
        />
        <StatsCard
          title="Active Containers"
          value={activeContainersCount}
          icon={<Ship className="w-5 h-5" />}
          variant="info"
        />
        <StatsCard
          title="Pending Revenue"
          value={pendingRevenue}
          icon={<DollarSign className="w-5 h-5" />}
          variant="warning"
        />
        {canManageDispatches && (
          <StatsCard
            title="Active Dispatches"
            value={activeDispatchesCount}
            icon={<Truck className="w-5 h-5" />}
            variant="success"
            subtitle="Pending, dispatched, or at port"
          />
        )}
      </DashboardGrid>
    </div>
  );
}