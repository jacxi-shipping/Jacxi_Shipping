'use client';

import { useRef } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Box, TextField, Typography } from '@mui/material';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, toast } from '@/components/design-system';
import { getPortalBrandIdentity } from '@/lib/partner-portal-branding';

type PortalBrandingInfo = {
  id: string;
  name: string;
  code: string | null;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  isActive?: boolean;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type PortalBrandingSettingsPanelProps = {
  portalId: string;
  portal: PortalBrandingInfo | null;
  canEdit: boolean;
  onSaved?: (portal: PortalBrandingInfo) => void;
  compact?: boolean;
};

export default function PortalBrandingSettingsPanel({
  portalId,
  portal,
  canEdit,
  onSaved,
  compact = false,
}: PortalBrandingSettingsPanelProps) {
  const [form, setForm] = useState({ companyLabel: '', accentColor: '', logoUrl: '' });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [pendingLogoPreviewUrl, setPendingLogoPreviewUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setForm({
      companyLabel: portal?.companyLabel || '',
      accentColor: portal?.accentColor || '',
      logoUrl: portal?.logoUrl || '',
    });
  }, [portal?.accentColor, portal?.companyLabel, portal?.logoUrl]);

  useEffect(() => () => {
    if (pendingLogoPreviewUrl) {
      URL.revokeObjectURL(pendingLogoPreviewUrl);
    }
  }, [pendingLogoPreviewUrl]);

  const brand = useMemo(
    () => getPortalBrandIdentity({
      name: portal?.name,
      companyLabel: form.companyLabel,
      accentColor: form.accentColor,
      logoUrl: form.logoUrl,
    }),
    [form.accentColor, form.companyLabel, form.logoUrl, portal?.name],
  );

  const normalizeLogoFile = async (file: File) => {
    const imageUrl = URL.createObjectURL(file);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const nextImage = new Image();
        nextImage.onload = () => resolve(nextImage);
        nextImage.onerror = () => reject(new Error('Failed to read the selected logo image'));
        nextImage.src = imageUrl;
      });

      const targetSize = 512;
      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas is not available in this browser');
      }

      const cropSize = Math.min(image.width, image.height);
      const sourceX = Math.max(0, (image.width - cropSize) / 2);
      const sourceY = Math.max(0, (image.height - cropSize) / 2);

      context.clearRect(0, 0, targetSize, targetSize);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, targetSize, targetSize);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((nextBlob) => {
          if (!nextBlob) {
            reject(new Error('Failed to normalize the logo image'));
            return;
          }

          resolve(nextBlob);
        }, 'image/png', 0.92);
      });

      const normalizedName = file.name.replace(/\.[^.]+$/, '') || 'portal-logo';
      return new File([blob], `${normalizedName}-normalized.png`, { type: 'image/png' });
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  };

  const handleSave = async (nextForm?: Partial<typeof form>) => {
    if (!canEdit) {
      return;
    }

    try {
      setSaving(true);
      const payload = { ...form, ...nextForm };
      const response = await fetch(`/api/partner-portals/${portalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save branding settings');
      }

      setForm(payload);
      toast.success('Portal branding updated');
      onSaved?.(data.portal);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save branding settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !canEdit) {
      return;
    }

    try {
      const normalizedFile = await normalizeLogoFile(file);
      const nextPreviewUrl = URL.createObjectURL(normalizedFile);

      setPendingLogoFile(normalizedFile);
      setPendingLogoPreviewUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }
        return nextPreviewUrl;
      });
      toast.success('Logo preview prepared');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to prepare portal logo');
    }
  };

  const handleUploadPreparedLogo = async () => {
    if (!pendingLogoFile || !canEdit) {
      return;
    }

    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('file', pendingLogoFile);

      const uploadResponse = await fetch(`/api/partner-portals/${portalId}/logo`, {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || 'Failed to upload portal logo');
      }

      const nextLogoUrl = uploadData.url as string;
      setForm((prev) => ({ ...prev, logoUrl: nextLogoUrl }));
      await handleSave({ logoUrl: nextLogoUrl });
      if (pendingLogoPreviewUrl) {
        URL.revokeObjectURL(pendingLogoPreviewUrl);
      }
      setPendingLogoFile(null);
      setPendingLogoPreviewUrl(null);
      toast.success('Portal logo uploaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload portal logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDiscardPreparedLogo = () => {
    if (pendingLogoPreviewUrl) {
      URL.revokeObjectURL(pendingLogoPreviewUrl);
    }

    setPendingLogoFile(null);
    setPendingLogoPreviewUrl(null);
  };

  const handleClearLogo = async () => {
    setForm((prev) => ({ ...prev, logoUrl: '' }));
    await handleSave({ logoUrl: '' });
  };

  return (
    <DashboardPanel
      title="Partner Branding"
      description="Let this portal present a partner identity while still running inside your system."
      footer={canEdit ? 'These settings update the portal shell, workspace headings, and preview surfaces for this partner.' : 'Portal branding is controlled by portal admins or internal managers.'}
    >
      <Box sx={{ display: 'grid', gap: 2.5, gridTemplateColumns: compact ? '1fr' : { xs: '1fr', xl: 'minmax(0, 1.15fr) minmax(300px, 0.85fr)' } }}>
        <Box sx={{ display: 'grid', gap: 2 }}>
          <TextField
            label="Company Label"
            placeholder="Partner company name shown in the portal"
            value={form.companyLabel}
            onChange={(event) => setForm((prev) => ({ ...prev, companyLabel: event.target.value }))}
            disabled={!canEdit || saving}
          />
          <TextField
            label="Accent Color"
            placeholder="#0f766e"
            helperText="Use a 6-digit hex color. Example: #0f766e"
            value={form.accentColor}
            onChange={(event) => setForm((prev) => ({ ...prev, accentColor: event.target.value }))}
            disabled={!canEdit || saving}
          />
          <TextField
            label="Logo URL"
            placeholder="https://..."
            helperText="You can paste a public image URL or upload a logo. Uploaded images are center-cropped and normalized to a square for consistent shell display."
            value={form.logoUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, logoUrl: event.target.value }))}
            disabled={!canEdit || saving || uploadingLogo}
          />

          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            hidden
            onChange={(event) => void handleLogoSelected(event)}
          />

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {canEdit ? (
              <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={saving || uploadingLogo}>
                {pendingLogoFile ? 'Choose Different Logo' : form.logoUrl ? 'Replace Logo' : 'Choose Logo'}
              </Button>
            ) : null}
            {canEdit && form.logoUrl ? (
              <Button variant="outline" size="sm" onClick={() => void handleClearLogo()} disabled={saving || uploadingLogo}>
                Remove Logo
              </Button>
            ) : null}
          </Box>

          {pendingLogoPreviewUrl ? (
            <Box sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2, display: 'grid', gap: 1.25, bgcolor: 'rgba(15,23,42,0.03)' }}>
              <Typography sx={{ fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Crop Preview
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                This is the exact square crop and normalized size that will be uploaded for the portal shell.
              </Typography>
              <Box sx={{ width: 160, height: 160, borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border)', bgcolor: '#fff' }}>
                <Box component="img" src={pendingLogoPreviewUrl} alt="Prepared portal logo preview" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button variant="primary" size="sm" onClick={() => void handleUploadPreparedLogo()} disabled={saving || uploadingLogo}>
                  {uploadingLogo ? 'Uploading...' : 'Upload Prepared Logo'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDiscardPreparedLogo} disabled={uploadingLogo}>
                  Discard
                </Button>
              </Box>
            </Box>
          ) : null}

          {canEdit ? (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" onClick={() => void handleSave()} disabled={saving || uploadingLogo || Boolean(pendingLogoFile)}>
                {saving ? 'Saving...' : 'Save Branding'}
              </Button>
            </Box>
          ) : null}
        </Box>

        <Box
          sx={{
            border: '1px solid var(--border)',
            borderRadius: 3,
            overflow: 'hidden',
            background: `linear-gradient(145deg, rgba(${brand.accentRgb}, 0.22), rgba(${brand.accentRgb}, 0.08) 42%, rgba(255,255,255,0.94) 100%)`,
            boxShadow: '0 20px 40px rgba(var(--text-primary-rgb),0.08)',
          }}
        >
          <Box sx={{ p: 2.5, display: 'grid', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {brand.logoUrl ? (
                <Box
                  component="img"
                  src={pendingLogoPreviewUrl || brand.logoUrl}
                  alt={`${brand.companyLabel} logo`}
                  sx={{ width: 52, height: 52, borderRadius: 2, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.5)', bgcolor: 'rgba(255,255,255,0.88)' }}
                />
              ) : (
                <Box sx={{ width: 52, height: 52, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: brand.accentColor, color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>
                  {brand.companyLabel.slice(0, 1).toUpperCase()}
                </Box>
              )}
              <Box>
                <Typography sx={{ fontSize: '0.76rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Branding Preview
                </Typography>
                <Typography sx={{ fontSize: '1.15rem', fontWeight: 800 }}>{brand.companyLabel}</Typography>
                <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{portal?.name || 'Portal Workspace'}</Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.72)' }}>
                <Typography sx={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-secondary)' }}>
                  Partner Label
                </Typography>
                <Typography sx={{ fontSize: '0.96rem', fontWeight: 700 }}>{brand.companyLabel}</Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.72)' }}>
                <Typography sx={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-secondary)' }}>
                  Accent
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 18, height: 18, borderRadius: 999, bgcolor: brand.accentColor, border: '1px solid rgba(15,23,42,0.12)' }} />
                  <Typography sx={{ fontSize: '0.9rem', fontWeight: 700 }}>{brand.accentColor}</Typography>
                </Box>
              </Box>
            </Box>

            <Typography sx={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              The portal keeps your main system structure, but adds partner-specific identity in the header, navigation, and workspace cards.
            </Typography>
          </Box>
        </Box>
      </Box>
    </DashboardPanel>
  );
}