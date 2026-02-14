'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface ShipmentTrendsChartProps {
  data: Array<{
    date: string;
    shipments: number;
    inTransit: number;
  }>;
  className?: string;
}

export function ShipmentTrendsChart({ data, className }: ShipmentTrendsChartProps) {
  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  }, [data]);

  return (
    <div className={className} style={{ minHeight: '300px', width: '100%' }}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
          <XAxis
            dataKey="date"
            stroke="var(--text-secondary)"
            style={{ fontSize: '12px' }}
            tick={{ fill: 'var(--text-secondary)' }}
          />
          <YAxis
            stroke="var(--text-secondary)"
            style={{ fontSize: '12px' }}
            tick={{ fill: 'var(--text-secondary)' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
            }}
            labelStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
          />
          <Legend
            wrapperStyle={{ color: 'var(--text-secondary)', fontSize: '12px' }}
          />
          <Line
            type="monotone"
            dataKey="shipments"
            stroke="var(--accent-gold)"
            strokeWidth={2}
            dot={{ fill: 'var(--accent-gold)', r: 4 }}
            activeDot={{ r: 6 }}
            name="Total Shipments"
          />
          <Line
            type="monotone"
            dataKey="inTransit"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ fill: '#10B981', r: 4 }}
            activeDot={{ r: 6 }}
            name="In Transit"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
