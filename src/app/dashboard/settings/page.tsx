'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Bell, 
  Palette, 
  Shield, 
  Activity, 
  Sun, 
  Moon, 
  Database, 
  RefreshCw, 
  UploadCloud 
} from 'lucide-react';
import { Box, Typography } from '@mui/material';

import { 
  DashboardSurface, 
  DashboardPanel, 
  DashboardGrid 
} from '@/components/dashboard/DashboardSurface';
import { 
  Button, 
  Breadcrumbs, 
  toast, 
  PageHeader, 
  StatsCard, 
  FormField,
  Select,
  LoadingState
} from '@/components/design-system';

const DEFAULT_SETTINGS = {
  theme: 'futuristic',
  accentColor: 'var(--accent-gold)',
  sidebarDensity: 'comfortable',
  animationsEnabled: true,
  notifyShipmentEmail: true,
  notifyShipmentPush: true,
  notifyPaymentEmail: true,
  notifyCriticalSms: false,
  twoFactorEnabled: false,
  language: 'en',
};

type ProfileData = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  createdAt: string;
  updatedAt: string;
};

type UserSettingsData = {
  theme: string;
  accentColor: string;
  sidebarDensity: string;
  animationsEnabled: boolean;
  notifyShipmentEmail: boolean;
  notifyShipmentPush: boolean;
  notifyPaymentEmail: boolean;
  notifyCriticalSms: boolean;
  twoFactorEnabled: boolean;
  language: string;
  createdAt: string;
  updatedAt: string;
};

type BackupInfo = {
  lastBackupAt: string | null;
  backupPath: string | null;
};

type BackupState = {
  loading: boolean;
  running: boolean;
  info: BackupInfo | null;
};

const formatRelativeTime = (value?: string | null) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes <= 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString();
};

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', address: '', city: '', country: '' });
  const [settings, setSettings] = useState<UserSettingsData | null>(null);
  const [settingsForm, setSettingsForm] = useState(DEFAULT_SETTINGS);
  const [backupState, setBackupState] = useState<BackupState>({
    loading: true,
    running: false,
    info: null,
  });
  const [backupFile, setBackupFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    const role = session?.user?.role;
    if (!session || role !== 'admin') {
      router.replace('/dashboard');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [profileRes, settingsRes, backupRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/settings'),
          fetch('/api/settings/backup', { cache: 'no-store' })
        ]);

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data.user);
          setProfileForm({
            name: data.user.name ?? '',
            phone: data.user.phone ?? '',
            address: data.user.address ?? '',
            city: data.user.city ?? '',
            country: data.user.country ?? '',
          });
        }

        if (settingsRes.ok) {
          const data = await settingsRes.json();
          const values = data.settings;
          setSettings(values);
          setSettingsForm({
            theme: values.theme,
            accentColor: values.accentColor,
            sidebarDensity: values.sidebarDensity,
            animationsEnabled: values.animationsEnabled,
            notifyShipmentEmail: values.notifyShipmentEmail,
            notifyShipmentPush: values.notifyShipmentPush,
            notifyPaymentEmail: values.notifyPaymentEmail,
            notifyCriticalSms: values.notifyCriticalSms,
            twoFactorEnabled: values.twoFactorEnabled,
            language: values.language,
          });
        }

        if (backupRes.ok) {
          const data = await backupRes.json();
          setBackupState(prev => ({
            ...prev,
            info: {
              lastBackupAt: data.lastBackupAt ?? null,
              backupPath: data.backupPath ?? null,
            },
            loading: false
          }));
        }
      } catch (error) {
        console.error('Error fetching settings data:', error);
        toast.error('Failed to load settings data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session, status, router]);

  const handleProfileFieldChange = (field: keyof typeof profileForm, value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      if (!response.ok) throw new Error('Failed to update profile');
      const data = await response.json();
      setProfile(data.user);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Unable to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const updateSettings = async (fields: Partial<typeof settingsForm>, successMessage: string) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (!response.ok) throw new Error('Failed to update settings');
      const data = await response.json();
      setSettings(data.settings);
      setSettingsForm(prev => ({ ...prev, ...fields }));
      toast.success(successMessage);
    } catch (error) {
      console.error(error);
      toast.error('Unable to update settings');
    }
  };

  const handleSavePreferences = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingPreferences(true);
    await updateSettings(
      {
        theme: settingsForm.theme,
        accentColor: settingsForm.accentColor,
        sidebarDensity: settingsForm.sidebarDensity,
        animationsEnabled: settingsForm.animationsEnabled,
        language: settingsForm.language,
      },
      'Preferences saved'
    );
    setSavingPreferences(false);
  };

  const handleSaveNotifications = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingNotifications(true);
    await updateSettings(
      {
        notifyShipmentEmail: settingsForm.notifyShipmentEmail,
        notifyShipmentPush: settingsForm.notifyShipmentPush,
        notifyPaymentEmail: settingsForm.notifyPaymentEmail,
        notifyCriticalSms: settingsForm.notifyCriticalSms,
      },
      'Notification preferences saved'
    );
    setSavingNotifications(false);
  };

  const handleToggleTwoFactor = async () => {
    setSavingSecurity(true);
    await updateSettings(
      { twoFactorEnabled: !settingsForm.twoFactorEnabled },
      settingsForm.twoFactorEnabled ? 'Two-factor authentication disabled' : 'Two-factor authentication enabled'
    );
    setSavingSecurity(false);
  };

  const handleCreateBackup = async () => {
    setBackupState(prev => ({ ...prev, running: true }));
    try {
      const response = await fetch('/api/settings/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'backup' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Failed to create backup');
      
      setBackupState(prev => ({
        ...prev,
        info: {
          lastBackupAt: data.lastBackupAt ?? prev.info?.lastBackupAt ?? null,
          backupPath: data.backupPath ?? prev.info?.backupPath ?? null,
        },
      }));
      toast.success('Backup created successfully');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create backup');
    } finally {
      setBackupState(prev => ({ ...prev, running: false }));
    }
  };

  const handleRestoreBackup = async () => {
    if (!backupFile) {
      toast.error('Please select a backup file');
      return;
    }
    
    setBackupState(prev => ({ ...prev, running: true }));
    try {
      const content = await backupFile.text();
      const response = await fetch('/api/settings/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', backupContent: content }),
      });
      
      if (!response.ok) throw new Error('Failed to restore backup');
      toast.success('Database restored successfully');
      setBackupFile(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to restore database');
    } finally {
      setBackupState(prev => ({ ...prev, running: false }));
    }
  };

  const notificationSummary = useMemo(() => {
    const channels = [];
    if (settingsForm.notifyShipmentEmail || settingsForm.notifyPaymentEmail) channels.push('Email');
    if (settingsForm.notifyShipmentPush) channels.push('Push');
    if (settingsForm.notifyCriticalSms) channels.push('SMS');
    return channels.length ? channels.join(' + ') : 'Disabled';
  }, [settingsForm]);

  if (status === 'loading' || loading) {
    return <LoadingState fullScreen message="Loading settings..." />;
  }

  return (
    <DashboardSurface>
      <Box sx={{ px: 2, pt: 2 }}>
        <Breadcrumbs />
      </Box>

      <PageHeader 
        title="Admin Settings" 
        description="Manage your profile, preferences, and system configuration"
      />

      <DashboardGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={<Shield style={{ fontSize: 18 }} />}
          title="Security Score"
          value={settingsForm.twoFactorEnabled ? '92%' : '68%'}
          variant={settingsForm.twoFactorEnabled ? 'success' : 'warning'}
          size="md"
        />
        <StatsCard
          icon={<Bell style={{ fontSize: 18 }} />}
          title="Notifications"
          value={settingsForm.notifyShipmentEmail ? 'Active' : 'Paused'}
          subtitle={notificationSummary}
          variant="info"
          size="md"
        />
        <StatsCard
          icon={<Activity style={{ fontSize: 18 }} />}
          title="Last Backup"
          value={backupState.info?.lastBackupAt ? new Date(backupState.info.lastBackupAt).toLocaleDateString() : 'None'}
          variant={backupState.info?.lastBackupAt ? 'success' : 'error'}
          size="md"
        />
        <StatsCard
          icon={<User style={{ fontSize: 18 }} />}
          title="Profile Status"
          value={profile?.name ? 'Complete' : 'Incomplete'}
          variant="default"
          size="md"
        />
      </DashboardGrid>

      <DashboardGrid className="grid-cols-1 lg:grid-cols-2">
        {/* Profile Section */}
        <DashboardPanel 
          title="Profile & Identity" 
          description="Update your personal information"
        >
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Full Name"
                value={profileForm.name}
                onChange={(e) => handleProfileFieldChange('name', e.target.value)}
                placeholder="John Doe"
              />
              <FormField
                label="Phone Number"
                value={profileForm.phone}
                onChange={(e) => handleProfileFieldChange('phone', e.target.value)}
                placeholder="+1 234 567 8900"
              />
              <FormField
                label="Address"
                value={profileForm.address}
                onChange={(e) => handleProfileFieldChange('address', e.target.value)}
                placeholder="123 Main St"
              />
              <FormField
                label="City"
                value={profileForm.city}
                onChange={(e) => handleProfileFieldChange('city', e.target.value)}
                placeholder="New York"
              />
              <FormField
                label="Country"
                value={profileForm.country}
                onChange={(e) => handleProfileFieldChange('country', e.target.value)}
                placeholder="USA"
              />
              <FormField
                label="Email"
                value={session?.user?.email ?? ''}
                disabled
                helperText="Contact admin to change email"
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={savingProfile} variant="primary">
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </form>
        </DashboardPanel>

        {/* Preferences Section */}
        <DashboardPanel 
          title="Interface Preferences" 
          description="Customize your dashboard experience"
        >
          <form onSubmit={handleSavePreferences} className="space-y-4">
            <Select
              label="Theme"
              value={settingsForm.theme}
              onChange={(value) => setSettingsForm(prev => ({ ...prev, theme: String(value) }))}
              options={[
                { value: 'futuristic', label: 'Futuristic Dark' },
                { value: 'dark', label: 'Classic Dark' },
                { value: 'light', label: 'Adaptive Light' },
              ]}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Sidebar Density"
                value={settingsForm.sidebarDensity}
                onChange={(value) => setSettingsForm(prev => ({ ...prev, sidebarDensity: String(value) }))}
                options={[
                  { value: 'comfortable', label: 'Comfortable' },
                  { value: 'compact', label: 'Compact' },
                ]}
              />
              <Select
                label="Language"
                value={settingsForm.language}
                onChange={(value) => setSettingsForm(prev => ({ ...prev, language: String(value) }))}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'ar', label: 'Arabic' },
                  { value: 'fr', label: 'French' },
                ]}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={savingPreferences} variant="primary">
                {savingPreferences ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </form>
        </DashboardPanel>

        {/* Notifications Section */}
        <DashboardPanel 
          title="Notification Rules" 
          description="Manage your alert preferences"
        >
          <form onSubmit={handleSaveNotifications} className="space-y-4">
            {[
              { key: 'notifyShipmentEmail', label: 'Email: Shipment Updates' },
              { key: 'notifyShipmentPush', label: 'Push: Shipment Updates' },
              { key: 'notifyPaymentEmail', label: 'Email: Payment Reminders' },
              { key: 'notifyCriticalSms', label: 'SMS: Critical Alerts' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-3 border border-[var(--border)] rounded-lg">
                <Typography variant="body2" color="text.primary">
                  {item.label}
                </Typography>
                <Button
                  type="button"
                  variant={settingsForm[item.key as keyof typeof settingsForm] ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSettingsForm(prev => ({ 
                    ...prev, 
                    [item.key]: !prev[item.key as keyof typeof settingsForm] 
                  }))}
                >
                  {settingsForm[item.key as keyof typeof settingsForm] ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={savingNotifications} variant="primary">
                {savingNotifications ? 'Saving...' : 'Save Rules'}
              </Button>
            </div>
          </form>
        </DashboardPanel>

        {/* System & Backup */}
        <DashboardPanel 
          title="System & Backup" 
          description="Database management and security"
        >
          <div className="space-y-6">
            <div className="p-4 border border-[var(--border)] rounded-lg bg-[var(--background)]">
              <div className="flex items-center justify-between mb-2">
                <Typography variant="subtitle2" fontWeight="600">Two-Factor Authentication</Typography>
                <Button 
                  variant={settingsForm.twoFactorEnabled ? 'primary' : 'outline'} 
                  size="sm"
                  onClick={handleToggleTwoFactor}
                  disabled={savingSecurity}
                >
                  {settingsForm.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
              <Typography variant="caption" color="text.secondary">
                Require authenticator verification for admin dashboard sign-in.
              </Typography>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Typography variant="subtitle2" fontWeight="600">Create Backup</Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Generate a JSON snapshot of current data.
                </Typography>
                <Button 
                  onClick={handleCreateBackup} 
                  disabled={backupState.running}
                  variant="primary"
                  fullWidth
                  icon={backupState.running ? <RefreshCw className="animate-spin" /> : <Database />}
                >
                  {backupState.running ? 'Backing up...' : 'Create Backup'}
                </Button>
              </div>

              <div className="space-y-2">
                <Typography variant="subtitle2" fontWeight="600">Restore Data</Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Upload a JSON backup file to restore.
                </Typography>
                <input
                  type="file"
                  accept="application/json"
                  onChange={(e) => setBackupFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="backup-upload"
                />
                <label htmlFor="backup-upload">
                  <Button 
                    component="span" 
                    variant="outline" 
                    fullWidth
                    icon={<UploadCloud />}
                  >
                    {backupFile ? 'File Selected' : 'Select File'}
                  </Button>
                </label>
                {backupFile && (
                  <Button 
                    onClick={handleRestoreBackup}
                    disabled={backupState.running}
                     variant="danger"
                    fullWidth
                    size="sm"
                  >
                    Confirm Restore
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DashboardPanel>
      </DashboardGrid>
    </DashboardSurface>
  );
}
