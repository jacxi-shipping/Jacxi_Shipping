'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';

interface ContainerUtilizationChartProps {
  data: Array<{
    containerNumber: string;
    utilization: number;
    capacity: number;
  }>;
  className?: string;
}

export function ContainerUtilizationChart({ data, className }: ContainerUtilizationChartProps) {
  const chartData = useMemo(() => {
    return data.map(item => ({
      name: item.containerNumber,
      utilization: item.utilization,
      remaining: item.capacity - item.utilization,
    }));
  }, [data]);

  const getBarColor = (utilization: number, capacity: number) => {
    const percentage = (utilization / capacity) * 100;
    if (percentage >= 90) return '#EF4444'; // Red
    if (percentage >= 70) return '#F59E0B'; // Amber
    return '#10B981'; // Green
  };

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
          <XAxis
            dataKey="name"
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
          <Bar dataKey="utilization" stackId="a" fill="var(--accent-gold)" name="Used">
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry.utilization, entry.capacity)}
              />
            ))}
          </Bar>
          <Bar
            dataKey="remaining"
            stackId="a"
            fill="var(--border)"
            opacity={0.3}
            name="Available"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
