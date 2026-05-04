'use client';

import { Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField } from '@mui/material';
import AddShipmentExpenseModal from '@/components/shipments/AddShipmentExpenseModal';
import PhotoLightbox from '@/components/shipments/PhotoLightbox';
import type {
  AvailableDispatchOption,
  ExpenseActionContext,
  ShipmentPhotoLightboxState,
} from '@/components/shipments/shipment-detail-types';

type ShipmentDetailOverlaysProps = {
  lightbox: ShipmentPhotoLightboxState;
  canDeleteArrivalLightbox: boolean;
  downloading: boolean;
  onCloseLightbox: () => void;
  onNavigateLightbox: (index: number) => void;
  onDeleteFromLightbox?: (index: number) => void | Promise<void>;
  onDownloadPhoto: (url: string, index: number) => void | Promise<void>;
  onDownloadAllPhotos: (urls: string[], label: string) => void | Promise<void>;
  canManageWorkflow: boolean;
  openAssignDispatch: boolean;
  onCloseAssignDispatch: () => void;
  loadingDispatches: boolean;
  assigningDispatch: boolean;
  availableDispatches: AvailableDispatchOption[];
  dispatchIdToAssign: string;
  onDispatchIdChange: (value: string) => void;
  onAssignDispatch: () => void | Promise<void>;
  openAssignTransit: boolean;
  onCloseAssignTransit: () => void;
  assigningTransit: boolean;
  transitIdToAssign: string;
  onTransitIdChange: (value: string) => void;
  releaseTokenToAssign: string;
  onReleaseTokenChange: (value: string) => void;
  showReleaseToken: boolean;
  onToggleReleaseToken: () => void;
  onAssignTransit: () => void | Promise<void>;
  shipmentId: string | null;
  expenseAction: ExpenseActionContext | null;
  onCloseExpenseAction: () => void;
  onExpenseSuccess: () => void;
};

export default function ShipmentDetailOverlays({
  lightbox,
  canDeleteArrivalLightbox,
  downloading,
  onCloseLightbox,
  onNavigateLightbox,
  onDeleteFromLightbox,
  onDownloadPhoto,
  onDownloadAllPhotos,
  canManageWorkflow,
  openAssignDispatch,
  onCloseAssignDispatch,
  loadingDispatches,
  assigningDispatch,
  availableDispatches,
  dispatchIdToAssign,
  onDispatchIdChange,
  onAssignDispatch,
  openAssignTransit,
  onCloseAssignTransit,
  assigningTransit,
  transitIdToAssign,
  onTransitIdChange,
  releaseTokenToAssign,
  onReleaseTokenChange,
  showReleaseToken,
  onToggleReleaseToken,
  onAssignTransit,
  shipmentId,
  expenseAction,
  onCloseExpenseAction,
  onExpenseSuccess,
}: ShipmentDetailOverlaysProps) {
  return (
    <>
      {lightbox && (
        <PhotoLightbox
          images={lightbox.images}
          index={lightbox.index}
          title={lightbox.title}
          canDelete={canDeleteArrivalLightbox}
          onClose={onCloseLightbox}
          onNavigate={onNavigateLightbox}
          onDelete={onDeleteFromLightbox ? (index) => Promise.resolve(onDeleteFromLightbox(index)) : undefined}
          onDownload={(url, index) => Promise.resolve(onDownloadPhoto(url, index))}
          onDownloadAll={(urls) => Promise.resolve(onDownloadAllPhotos(urls, lightbox.title))}
          downloading={downloading}
        />
      )}

      {canManageWorkflow && (
        <Dialog open={openAssignDispatch} onClose={() => !assigningDispatch && onCloseAssignDispatch()} maxWidth="xs" fullWidth>
          <DialogTitle>Assign Shipment to Dispatch</DialogTitle>
          <DialogContent sx={{ pt: 1.5 }}>
            <TextField
              select
              fullWidth
              label="Dispatch"
              value={dispatchIdToAssign}
              onChange={(event) => onDispatchIdChange(event.target.value)}
              helperText={loadingDispatches ? 'Loading pending dispatches...' : 'Select a dispatch route for this shipment'}
              size="small"
              disabled={loadingDispatches || assigningDispatch}
            >
              {availableDispatches.map((dispatch) => (
                <MenuItem key={dispatch.id} value={dispatch.id}>
                  {dispatch.referenceNumber} - {dispatch.company.name} ({dispatch.origin} → {dispatch.destination})
                </MenuItem>
              ))}
            </TextField>
            {!loadingDispatches && availableDispatches.length === 0 && (
              <p className="mt-3 text-sm text-[var(--text-secondary)]">No pending dispatches are available.</p>
            )}
          </DialogContent>
          <DialogActions>
            <button
              onClick={onCloseAssignDispatch}
              disabled={assigningDispatch}
              style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)' }}
            >
              Cancel
            </button>
            <button
              onClick={() => void onAssignDispatch()}
              disabled={assigningDispatch || loadingDispatches || !dispatchIdToAssign}
              style={{ padding: '6px 16px', borderRadius: 6, background: 'var(--accent-gold)', border: 'none', cursor: 'pointer', fontWeight: 600, color: '#fff' }}
            >
              {assigningDispatch ? 'Assigning...' : 'Assign'}
            </button>
          </DialogActions>
        </Dialog>
      )}

      {canManageWorkflow && (
        <Dialog open={openAssignTransit} onClose={() => !assigningTransit && onCloseAssignTransit()} maxWidth="xs" fullWidth>
          <DialogTitle>Assign Shipment to Transit</DialogTitle>
          <DialogContent sx={{ pt: 1.5 }}>
            <TextField
              fullWidth
              label="Transit ID"
              value={transitIdToAssign}
              onChange={(event) => onTransitIdChange(event.target.value)}
              helperText="Paste the transit ID from the Transits page"
              size="small"
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Release Token"
              type={showReleaseToken ? 'text' : 'password'}
              value={releaseTokenToAssign}
              onChange={(event) => onReleaseTokenChange(event.target.value)}
              helperText="Paste the shipment release token to verify"
              size="small"
              InputProps={{
                endAdornment: (
                  <button
                    type="button"
                    onClick={onToggleReleaseToken}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
                  >
                    {showReleaseToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                ),
              }}
            />
          </DialogContent>
          <DialogActions>
            <button
              onClick={onCloseAssignTransit}
              disabled={assigningTransit}
              style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)' }}
            >
              Cancel
            </button>
            <button
              onClick={() => void onAssignTransit()}
              disabled={assigningTransit}
              style={{ padding: '6px 16px', borderRadius: 6, background: 'var(--accent-gold)', border: 'none', cursor: 'pointer', fontWeight: 600, color: '#fff' }}
            >
              {assigningTransit ? 'Assigning...' : 'Assign'}
            </button>
          </DialogActions>
        </Dialog>
      )}

      {shipmentId && (
        <AddShipmentExpenseModal
          open={Boolean(expenseAction)}
          onClose={onCloseExpenseAction}
          shipmentId={shipmentId}
          modalTitle={expenseAction?.modalTitle}
          contextType={expenseAction?.contextType}
          contextId={expenseAction?.contextId}
          onSuccess={onExpenseSuccess}
        />
      )}
    </>
  );
}