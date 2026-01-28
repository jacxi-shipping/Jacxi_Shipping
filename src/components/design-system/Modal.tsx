"use client";

import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  IconButton, 
  Box,
  Typography
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Modal Component
 * 
 * Accessible modal dialog with animations and consistent styling.
 */

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  disableBackdropClick?: boolean;
  className?: string;
}

// Size configurations
const sizeConfig = {
  sm: '400px',
  md: '600px',
  lg: '800px',
  xl: '1000px',
  full: '95vw',
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  actions,
  size = 'md',
  showCloseButton = true,
  disableBackdropClick = false,
  className,
}: ModalProps) {
  const handleBackdropClick = () => {
    if (!disableBackdropClick) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleBackdropClick}
      maxWidth={false}
      className={className}
      PaperProps={{
        sx: {
          width: '100%',
          maxWidth: sizeConfig[size],
          borderRadius: 3,
          bgcolor: 'var(--panel)',
          backgroundImage: 'none',
          boxShadow: '0 24px 60px rgba(var(--text-primary-rgb), 0.15), 0 8px 16px rgba(var(--text-primary-rgb), 0.1)',
          m: 2,
        },
      }}
      slotProps={{
        backdrop: {
          sx: {
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
          },
        },
      }}
    >
      {/* Header */}
      {(title || showCloseButton) && (
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            px: 3,
            py: 2.5,
            borderBottom: '1px solid var(--border)',
          }}
        >
          {title && (
            <Typography
              sx={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                flex: 1,
              }}
            >
              {title}
            </Typography>
          )}
          {showCloseButton && (
            <IconButton
              onClick={onClose}
              sx={{
                color: 'var(--text-secondary)',
                '&:hover': {
                  bgcolor: 'rgba(var(--border-rgb), 0.2)',
                },
              }}
            >
              <Close sx={{ fontSize: 20 }} />
            </IconButton>
          )}
        </DialogTitle>
      )}

      {/* Content */}
      <DialogContent
        sx={{
          px: 3,
          py: 3,
          color: 'var(--text-primary)',
        }}
      >
        {children}
      </DialogContent>

      {/* Actions */}
      {actions && (
        <DialogActions
          sx={{
            px: 3,
            py: 2.5,
            gap: 1.5,
            borderTop: '1px solid var(--border)',
          }}
        >
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
}

// Confirmation Dialog Variant
export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  severity?: 'info' | 'warning' | 'error';
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  severity = 'info',
  loading = false,
}: ConfirmDialogProps) {
  const severityColors = {
    info: 'var(--info)',
    warning: 'var(--warning)',
    error: 'var(--error)',
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      actions={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: severityColors[severity],
              color: '#FFFFFF',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </>
      }
    >
      <Typography sx={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {message}
      </Typography>
    </Modal>
  );
}
