"use client";

import { Box, Typography } from '@mui/material';
import { ReactNode } from 'react';

/**
 * StatusBadge Component
 * 
 * Displays status with appropriate colors and styling.
 * Used for shipment status, payment status, etc.
 */

// Shipment Status Types
export type ShipmentStatus = 
  | 'ON_HAND' 
  | 'IN_TRANSIT' 
  | 'AT_PORT' 
  | 'CUSTOMS' 
  | 'RELEASED' 
  | 'DELIVERED' 
  | 'CANCELLED' 
  | 'DELAYED'
  // Container Statuses
  | 'CREATED'
  | 'WAITING_FOR_LOADING'
  | 'LOADED'
  | 'ARRIVED_PORT'
  | 'CUSTOMS_CLEARANCE'
  | 'CLOSED';

// Payment Status Types
export type PaymentStatus = 
  | 'PAID' 
  | 'PENDING' 
  | 'OVERDUE' 
  | 'PARTIAL' 
  | 'REFUNDED';

// Generic Status Types
export type GenericStatus = 
  | 'SUCCESS' 
  | 'WARNING' 
  | 'ERROR' 
  | 'INFO' 
  | 'DEFAULT';

export type StatusType = ShipmentStatus | PaymentStatus | GenericStatus | string;

export interface StatusBadgeProps {
  status: StatusType;
  variant?: 'default' | 'dot' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  className?: string;
}

// Status color mappings
const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  // Shipment Statuses
  ON_HAND: {
    bg: 'rgba(16, 185, 129, 0.15)',
    text: 'var(--success)',
    border: 'var(--success)',
  },
  IN_TRANSIT: {
    bg: 'rgba(59, 130, 246, 0.15)',
    text: 'var(--info)',
    border: 'var(--info)',
  },
  AT_PORT: {
    bg: 'rgba(245, 158, 11, 0.15)',
    text: 'var(--warning)',
    border: 'var(--warning)',
  },
  CUSTOMS: {
    bg: 'rgba(139, 92, 246, 0.15)',
    text: '#8B5CF6',
    border: '#8B5CF6',
  },
  RELEASED: {
    bg: 'rgba(16, 185, 129, 0.15)',
    text: 'var(--success)',
    border: 'var(--success)',
  },
  DELIVERED: {
    bg: 'rgba(5, 150, 105, 0.15)',
    text: '#059669',
    border: '#059669',
  },
  CANCELLED: {
    bg: 'rgba(107, 114, 128, 0.15)',
    text: 'var(--text-secondary)',
    border: 'var(--text-secondary)',
  },
  DELAYED: {
    bg: 'rgba(239, 68, 68, 0.15)',
    text: 'var(--error)',
    border: 'var(--error)',
  },

  // Container Statuses
  CREATED: {
    bg: 'rgba(107, 114, 128, 0.15)',
    text: 'var(--text-secondary)',
    border: 'var(--text-secondary)',
  },
  WAITING_FOR_LOADING: {
    bg: 'rgba(245, 158, 11, 0.15)',
    text: 'var(--warning)',
    border: 'var(--warning)',
  },
  LOADED: {
    bg: 'rgba(59, 130, 246, 0.15)',
    text: 'var(--info)',
    border: 'var(--info)',
  },
  ARRIVED_PORT: {
    bg: 'rgba(16, 185, 129, 0.15)',
    text: 'var(--success)',
    border: 'var(--success)',
  },
  CUSTOMS_CLEARANCE: {
    bg: 'rgba(249, 115, 22, 0.15)',
    text: '#F97316',
    border: '#F97316',
  },
  CLOSED: {
    bg: 'rgba(75, 85, 99, 0.15)',
    text: 'rgb(75, 85, 99)',
    border: 'rgb(75, 85, 99)',
  },

  // Payment Statuses
  PAID: {
    bg: 'rgba(16, 185, 129, 0.15)',
    text: 'var(--success)',
    border: 'var(--success)',
  },
  PENDING: {
    bg: 'rgba(245, 158, 11, 0.15)',
    text: 'var(--warning)',
    border: 'var(--warning)',
  },
  OVERDUE: {
    bg: 'rgba(239, 68, 68, 0.15)',
    text: 'var(--error)',
    border: 'var(--error)',
  },
  PARTIAL: {
    bg: 'rgba(59, 130, 246, 0.15)',
    text: 'var(--info)',
    border: 'var(--info)',
  },
  REFUNDED: {
    bg: 'rgba(107, 114, 128, 0.15)',
    text: 'var(--text-secondary)',
    border: 'var(--text-secondary)',
  },

  // Generic Statuses
  SUCCESS: {
    bg: 'rgba(16, 185, 129, 0.15)',
    text: 'var(--success)',
    border: 'var(--success)',
  },
  WARNING: {
    bg: 'rgba(245, 158, 11, 0.15)',
    text: 'var(--warning)',
    border: 'var(--warning)',
  },
  ERROR: {
    bg: 'rgba(239, 68, 68, 0.15)',
    text: 'var(--error)',
    border: 'var(--error)',
  },
  INFO: {
    bg: 'rgba(59, 130, 246, 0.15)',
    text: 'var(--info)',
    border: 'var(--info)',
  },
  DEFAULT: {
    bg: 'var(--panel)',
    text: 'var(--text-primary)',
    border: 'var(--border)',
  },
};

// Format status text for display
function formatStatusText(status: string): string {
  return status
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

// Size configurations
const sizeConfig = {
  sm: {
    fontSize: '0.6875rem',
    padding: '3px 10px',
    height: '22px',
    dotSize: '6px',
    gap: '4px',
  },
  md: {
    fontSize: '0.75rem',
    padding: '4px 12px',
    height: '24px',
    dotSize: '8px',
    gap: '6px',
  },
  lg: {
    fontSize: '0.8125rem',
    padding: '6px 16px',
    height: '28px',
    dotSize: '10px',
    gap: '8px',
  },
};

export default function StatusBadge({
  status,
  variant = 'default',
  size = 'md',
  icon,
  className,
}: StatusBadgeProps) {
  const normalizedStatus = status.toUpperCase().replace(/\s+/g, '_');
  const colors = statusColors[normalizedStatus] || statusColors.DEFAULT;
  const config = sizeConfig[size];

  // Default variant (filled background)
  if (variant === 'default') {
    return (
      <Box
        component="span"
        className={className}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: config.gap,
          height: config.height,
          px: config.padding,
          borderRadius: '12px',
          backgroundColor: colors.bg,
          border: '1px solid',
          borderColor: colors.border,
          fontSize: config.fontSize,
          fontWeight: 600,
          color: colors.text,
          whiteSpace: 'nowrap',
          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        {icon && (
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              fontSize: `${parseFloat(config.fontSize) * 0.9}rem`,
              lineHeight: 1,
            }}
          >
            {icon}
          </Box>
        )}
        <Typography
          component="span"
          sx={{
            fontSize: 'inherit',
            fontWeight: 'inherit',
            letterSpacing: '0.025em',
            lineHeight: 1,
            textTransform: 'capitalize',
          }}
        >
          {formatStatusText(status)}
        </Typography>
      </Box>
    );
  }

  // Dot variant (with colored dot)
  if (variant === 'dot') {
    return (
      <Box
        component="span"
        className={className}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: config.gap,
          fontSize: config.fontSize,
          fontWeight: 500,
          color: 'var(--text-primary)',
        }}
      >
        <Box
          sx={{
            width: config.dotSize,
            height: config.dotSize,
            borderRadius: '50%',
            backgroundColor: colors.text,
            flexShrink: 0,
            boxShadow: `0 0 0 2px ${colors.bg}`,
          }}
        />
        {icon && (
          <Box 
            sx={{ 
              display: 'flex', 
              fontSize: `${parseFloat(config.fontSize) * 0.9}rem`,
              color: colors.text,
              lineHeight: 1,
            }}
          >
            {icon}
          </Box>
        )}
        <Typography
          component="span"
          sx={{
            fontSize: 'inherit',
            fontWeight: 'inherit',
            textTransform: 'capitalize',
            lineHeight: 1,
          }}
        >
          {formatStatusText(status)}
        </Typography>
      </Box>
    );
  }

  // Outline variant (bordered, no background)
  if (variant === 'outline') {
    return (
      <Box
        component="span"
        className={className}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: config.gap,
          height: config.height,
          px: config.padding,
          borderRadius: '12px',
          backgroundColor: 'transparent',
          border: '1.5px solid',
          borderColor: colors.border,
          fontSize: config.fontSize,
          fontWeight: 600,
          color: colors.text,
          whiteSpace: 'nowrap',
          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            backgroundColor: colors.bg,
            transform: 'translateY(-1px)',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          },
        }}
      >
        {icon && (
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              fontSize: `${parseFloat(config.fontSize) * 0.9}rem`,
              lineHeight: 1,
            }}
          >
            {icon}
          </Box>
        )}
        <Typography
          component="span"
          sx={{
            fontSize: 'inherit',
            fontWeight: 'inherit',
            letterSpacing: '0.025em',
            textTransform: 'capitalize',
            lineHeight: 1,
          }}
        >
          {formatStatusText(status)}
        </Typography>
      </Box>
    );
  }

  return null;
}

// Convenience components for specific status types
export function ShipmentStatusBadge({ 
  status, 
  ...props 
}: Omit<StatusBadgeProps, 'status'> & { status: ShipmentStatus }) {
  return <StatusBadge status={status} {...props} />;
}

export function PaymentStatusBadge({ 
  status, 
  ...props 
}: Omit<StatusBadgeProps, 'status'> & { status: PaymentStatus }) {
  return <StatusBadge status={status} {...props} />;
}
