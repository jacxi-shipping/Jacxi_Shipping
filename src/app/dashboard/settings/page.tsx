'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  UploadCloud,
  PhoneCall,
  ArrowRight,
  FileText,
  DollarSign,
  Bot,
  CheckCircle2,
  PlugZap,
  XCircle,
} from 'lucide-react';
import { Box, Tab, Tabs, Typography } from '@mui/material';

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
import {
  DEFAULT_SHIPPING_RATE_CONFIG,
  normalizeShippingRateConfig,
  US_STATES,
  type ShippingRateCalculatorConfig,
} from '@/lib/shipping-rate-calculator';

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
  calculatorConfig: DEFAULT_SHIPPING_RATE_CONFIG,
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
  calculatorConfig: ShippingRateCalculatorConfig;
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

type AiConnectivityStatus = {
  provider: string;
  configured: boolean;
  model: string;
  lookbackHours: number;
  stats: {
    totalRuns: number;
    providerRuns: number;
    tokenRouterRuns: number;
    fallbackRuns: number;
    successRuns: number;
    failedRuns: number;
    successRate: number | null;
  };
  latestLog: {
    provider: string;
    model: string | null;
    status: string;
    createdAt: string;
  } | null;
  latestSuccess: {
    provider: string;
    model: string | null;
    createdAt: string;
  } | null;
  latestFailure: {
    provider: string;
    model: string | null;
    status: string;
    createdAt: string;
  } | null;
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

const parseJsonResponse = async (response: Response) => {
  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {
      message: text.startsWith('<!DOCTYPE')
        ? `Server returned an HTML error page with status ${response.status}`
        : text || `Request failed with status ${response.status}`,
    };
  }
};

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === 'admin';
  const [activeTab, setActiveTab] = useState(0);

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
  const [ratePdfFile, setRatePdfFile] = useState<File | null>(null);
  const [rateConfig, setRateConfig] = useState<ShippingRateCalculatorConfig>(DEFAULT_SHIPPING_RATE_CONFIG);
  const [aiConnectivity, setAiConnectivity] = useState<AiConnectivityStatus | null>(null);
  const [aiTestResult, setAiTestResult] = useState<{
    latencyMs: number;
    responsePreview: string;
    model: string;
    testedAt: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [savingSecurity, setSavingSecurity] = useState(false);
  const [savingRates, setSavingRates] = useState(false);
  const [importingRates, setImportingRates] = useState(false);
  const [refreshingAiConnectivity, setRefreshingAiConnectivity] = useState(false);
  const [testingAiConnectivity, setTestingAiConnectivity] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.replace('/auth/signin?callbackUrl=/dashboard/settings');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [profileRes, settingsRes, backupRes, aiConnectivityRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/settings'),
          isAdmin ? fetch('/api/settings/backup', { cache: 'no-store' }) : Promise.resolve(null),
          isAdmin ? fetch('/api/settings/ai-connectivity', { cache: 'no-store' }) : Promise.resolve(null),
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
          const calculatorConfig = normalizeShippingRateConfig(values.calculatorConfig);
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
            calculatorConfig,
          });
          setRateConfig(calculatorConfig);
        }

        if (backupRes?.ok) {
          const data = await backupRes.json();
          setBackupState(prev => ({
            ...prev,
            info: {
              lastBackupAt: data.lastBackupAt ?? null,
              backupPath: data.backupPath ?? null,
            },
            loading: false
          }));
        } else {
          setBackupState(prev => ({
            ...prev,
            loading: false,
          }));
        }

        if (aiConnectivityRes?.ok) {
          const data = await aiConnectivityRes.json();
          setAiConnectivity(data);
        }
      } catch (error) {
        console.error('Error fetching settings data:', error);
        toast.error('Failed to load settings data');
        setBackupState(prev => ({
          ...prev,
          loading: false,
        }));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin, session, status, router]);

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

  const handleRateConfigChange = <T extends keyof ShippingRateCalculatorConfig>(
    field: T,
    value: ShippingRateCalculatorConfig[T],
  ) => {
    setRateConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleStateRateChange = (stateCode: string, value: string) => {
    const parsed = Number(value);
    setRateConfig(prev => ({
      ...prev,
      stateRates: {
        ...prev.stateRates,
        [stateCode]: Number.isFinite(parsed) ? parsed : 0,
      },
    }));
  };

  const handleSaveRates = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingRates(true);
    try {
      const response = await fetch('/api/settings/shipping-rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rateConfig),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || 'Failed to save rate settings');
      setRateConfig(data.config);
      setSettingsForm(prev => ({ ...prev, calculatorConfig: data.config }));
      toast.success('Calculator rates saved');
    } catch (error) {
      console.error(error);
      toast.error('Unable to save calculator rates');
    } finally {
      setSavingRates(false);
    }
  };

  const handleImportRatesPdf = async () => {
    if (!ratePdfFile) {
      toast.error('Select a rate PDF first');
      return;
    }

    setImportingRates(true);
    try {
      const formData = new FormData();
      formData.append('file', ratePdfFile);
      const response = await fetch('/api/settings/shipping-rates/import-pdf', {
        method: 'POST',
        body: formData,
      });
      const data = await parseJsonResponse(response);
      if (!response.ok) throw new Error(data?.message || 'Failed to import PDF rates');
      setRateConfig(data.config);
      setSettingsForm(prev => ({ ...prev, calculatorConfig: data.config }));
      setRatePdfFile(null);
      toast.success(`Imported ${data.importedAuctionRateCount || data.importedCount} rates from PDF`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Unable to import PDF rates');
    } finally {
      setImportingRates(false);
    }
  };

  const refreshAiConnectivity = async (showToastOnError = true) => {
    try {
      setRefreshingAiConnectivity(true);
      const response = await fetch('/api/settings/ai-connectivity', { cache: 'no-store' });
      const data = await parseJsonResponse(response);
      if (!response.ok) throw new Error(data?.message || 'Failed to load AI connectivity');
      setAiConnectivity(data);
      return true;
    } catch (error) {
      if (showToastOnError) {
        toast.error(error instanceof Error ? error.message : 'Unable to refresh AI connectivity');
      }
      return false;
    } finally {
      setRefreshingAiConnectivity(false);
    }
  };

  const handleTestAiConnectivity = async () => {
    try {
      setTestingAiConnectivity(true);
      const response = await fetch('/api/settings/ai-connectivity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await parseJsonResponse(response);

      if (!response.ok) {
        if (data?.status) setAiConnectivity(data.status);
        throw new Error(data?.message || 'AI connectivity test failed');
      }

      setAiConnectivity(data.status);
      setAiTestResult({
        latencyMs: data.latencyMs,
        responsePreview: data.responsePreview,
        model: data.model,
        testedAt: new Date().toISOString(),
      });
      toast.success('AI connectivity test passed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'AI connectivity test failed');
    } finally {
      setTestingAiConnectivity(false);
    }
  };

  const notificationSummary = useMemo(() => {
    const channels = [];
    if (settingsForm.notifyShipmentEmail || settingsForm.notifyPaymentEmail) channels.push('Email');
    if (settingsForm.notifyShipmentPush) channels.push('Push');
    if (settingsForm.notifyCriticalSms) channels.push('SMS');
    return channels.length ? channels.join(' + ') : 'Disabled';
  }, [settingsForm]);

  const settingsTabs = useMemo(() => {
    const tabs = [
      { label: 'Profile', icon: <User className="h-4 w-4" /> },
      { label: 'Preferences', icon: <Palette className="h-4 w-4" /> },
      { label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
      { label: isAdmin ? 'Security & Backup' : 'Security', icon: <Shield className="h-4 w-4" /> },
    ];

    if (isAdmin) {
      tabs.push(
        { label: 'AI', icon: <Bot className="h-4 w-4" /> },
        { label: 'Call Agent', icon: <PhoneCall className="h-4 w-4" /> },
        { label: 'Price Calculator', icon: <DollarSign className="h-4 w-4" /> },
      );
    }

    return tabs;
  }, [isAdmin]);

  const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => {
    return (
      <div role="tabpanel" hidden={value !== index} id={`settings-tabpanel-${index}`} aria-labelledby={`settings-tab-${index}`}>
        {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
      </div>
    );
  };

  if (status === 'loading' || loading) {
    return <LoadingState fullScreen message="Loading settings..." />;
  }

  return (
    <DashboardSurface>
      <Box sx={{ px: 2, pt: 2 }}>
        <Breadcrumbs />
      </Box>

      <PageHeader 
        title={isAdmin ? 'Admin Settings' : 'Settings'} 
        description={isAdmin ? 'Manage your profile, preferences, and system configuration' : 'Manage your profile, preferences, and account settings'}
      />

      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 15,
          border: '1px solid var(--border)',
          borderRadius: '12px',
          backgroundColor: 'var(--panel)',
          boxShadow: '0 12px 28px rgba(var(--text-primary-rgb),0.08)',
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 52,
            '& .MuiTabs-flexContainer': {
              gap: 0.25,
              px: 1,
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 650,
              color: 'var(--text-secondary)',
              minHeight: 52,
              borderRadius: '10px',
              my: 0.75,
              px: 1.5,
              '&:hover': {
                color: 'var(--accent-gold)',
                backgroundColor: 'rgba(var(--accent-gold-rgb), 0.08)',
              },
            },
            '& .Mui-selected': {
              color: 'var(--accent-gold) !important',
              backgroundColor: 'rgba(var(--accent-gold-rgb), 0.1)',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: 'var(--accent-gold)',
              height: 3,
            },
          }}
        >
          {settingsTabs.map((tab, index) => (
            <Tab
              key={tab.label}
              id={`settings-tab-${index}`}
              aria-controls={`settings-tabpanel-${index}`}
              icon={tab.icon}
              iconPosition="start"
              label={tab.label}
            />
          ))}
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={5}>
      {isAdmin ? (
        <DashboardPanel
          title="Call Agent"
          description="Open the dedicated voice settings screen for Twilio endpoint URLs, Gemini readiness, and webhook status."
        >
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneCall className="w-4 h-4" />
                Voice webhook and live media setup
              </Typography>
              <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)', mt: 1, lineHeight: 1.7 }}>
                Review the Twilio webhook URL, the live stream WebSocket URL, and whether Gemini Live and webhook protection are configured.
              </Typography>
            </Box>
            <Link href="/dashboard/settings/call-agent" style={{ textDecoration: 'none' }}>
              <Button variant="primary" icon={<ArrowRight className="w-4 h-4" />}>
                Open Call Agent
              </Button>
            </Link>
          </Box>
        </DashboardPanel>
      ) : null}
      </TabPanel>

      <TabPanel value={activeTab} index={4}>
      {isAdmin ? (
        <DashboardPanel
          title="AI Connectivity"
          description="TokenRouter provider status, recent usage, fallbacks, and a live connectivity test."
          actions={
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw className="w-4 h-4" />}
                onClick={() => void refreshAiConnectivity()}
                loading={refreshingAiConnectivity}
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<PlugZap className="w-4 h-4" />}
                onClick={() => void handleTestAiConnectivity()}
                loading={testingAiConnectivity}
                disabled={!aiConnectivity?.configured}
              >
                Test AI
              </Button>
            </Box>
          }
        >
          <div className="space-y-4">
            <DashboardGrid className="grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
              <StatsCard
                icon={aiConnectivity?.configured ? <CheckCircle2 style={{ fontSize: 18 }} /> : <XCircle style={{ fontSize: 18 }} />}
                title="TokenRouter"
                value={aiConnectivity?.configured ? 'Connected' : 'Missing Key'}
                subtitle={aiConnectivity?.model || 'MiniMax-M3'}
                variant={aiConnectivity?.configured ? 'success' : 'error'}
                size="md"
              />
              <StatsCard
                icon={<Bot style={{ fontSize: 18 }} />}
                title="24h AI Runs"
                value={aiConnectivity ? String(aiConnectivity.stats.providerRuns) : '0'}
                subtitle={`${aiConnectivity?.stats.tokenRouterRuns ?? 0} TokenRouter`}
                variant="info"
                size="md"
              />
              <StatsCard
                icon={<Activity style={{ fontSize: 18 }} />}
                title="24h Success"
                value={aiConnectivity?.stats.successRate === null || aiConnectivity?.stats.successRate === undefined ? 'No Runs' : `${aiConnectivity.stats.successRate}%`}
                subtitle={`${aiConnectivity?.stats.failedRuns ?? 0} failed`}
                variant={(aiConnectivity?.stats.failedRuns ?? 0) > 0 ? 'warning' : 'success'}
                size="md"
              />
              <StatsCard
                icon={<RefreshCw style={{ fontSize: 18 }} />}
                title="Fallbacks"
                value={aiConnectivity ? String(aiConnectivity.stats.fallbackRuns) : '0'}
                subtitle={`Last ${aiConnectivity?.lookbackHours ?? 24} hours`}
                variant={(aiConnectivity?.stats.fallbackRuns ?? 0) > 0 ? 'warning' : 'default'}
                size="md"
              />
            </DashboardGrid>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
              <Box sx={{ p: 2, border: '1px solid var(--border)', borderRadius: 2, bgcolor: 'var(--background)' }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', mb: 1 }}>
                  Latest activity
                </Typography>
                <Typography sx={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {aiConnectivity?.latestLog
                    ? `${aiConnectivity.latestLog.provider} · ${aiConnectivity.latestLog.status}`
                    : 'No AI activity logged yet'}
                </Typography>
                <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)', mt: 0.75 }}>
                  {aiConnectivity?.latestLog
                    ? `${aiConnectivity.latestLog.model || 'Unknown model'} · ${formatRelativeTime(aiConnectivity.latestLog.createdAt)}`
                    : 'Run a dashboard brief, document extraction, shipment draft, or connectivity test to create a log.'}
                </Typography>
              </Box>

              <Box sx={{ p: 2, border: '1px solid var(--border)', borderRadius: 2, bgcolor: 'var(--background)' }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', mb: 1 }}>
                  Last test result
                </Typography>
                <Typography sx={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {aiTestResult ? `${aiTestResult.latencyMs} ms · ${aiTestResult.model}` : 'No test run this session'}
                </Typography>
                <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)', mt: 0.75 }}>
                  {aiTestResult
                    ? `${aiTestResult.responsePreview} · ${formatRelativeTime(aiTestResult.testedAt)}`
                    : aiConnectivity?.configured
                      ? 'Use Test AI to verify live provider connectivity.'
                      : 'Set TOKENROUTER_API_KEY to enable live testing.'}
                </Typography>
              </Box>
            </Box>
          </div>
        </DashboardPanel>
      ) : null}
      </TabPanel>

      <TabPanel value={activeTab} index={0}>
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
          icon={isAdmin ? <Activity style={{ fontSize: 18 }} /> : <Palette style={{ fontSize: 18 }} />}
          title={isAdmin ? 'Last Backup' : 'Theme'}
          value={isAdmin ? (backupState.info?.lastBackupAt ? new Date(backupState.info.lastBackupAt).toLocaleDateString() : 'None') : settingsForm.theme}
          variant={isAdmin ? (backupState.info?.lastBackupAt ? 'success' : 'error') : 'default'}
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
      </TabPanel>

      <DashboardGrid className="grid-cols-1 lg:grid-cols-2">
        {/* Profile Section */}
        {activeTab === 0 ? (
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
        ) : null}

        {/* Preferences Section */}
        {activeTab === 1 ? (
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
        ) : null}

        {/* Notifications Section */}
        {activeTab === 2 ? (
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
        ) : null}

        {/* System & Backup */}
        {activeTab === 3 ? (
        <DashboardPanel 
          title={isAdmin ? 'System & Backup' : 'Security'} 
          description={isAdmin ? 'Database management and security' : 'Account security controls'}
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
                {isAdmin ? 'Require authenticator verification for admin dashboard sign-in.' : 'Require extra verification for your account sign-in.'}
              </Typography>
            </div>

            {isAdmin ? (
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
            ) : null}
          </div>
        </DashboardPanel>
        ) : null}
      </DashboardGrid>

      <TabPanel value={activeTab} index={6}>
      {isAdmin ? (
        <DashboardPanel
          title="Price Calculator"
          description="Configure dashboard calculator rates and import state prices from PDF sheets."
        >
          <form onSubmit={handleSaveRates} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                label="Destination"
                value={rateConfig.destinationLabel}
                onChange={(e) => handleRateConfigChange('destinationLabel', e.target.value)}
                placeholder="Jebel Ali, UAE"
              />
              <FormField
                label="Fallback Rate"
                type="number"
                value={rateConfig.fallbackRate}
                onChange={(e) => handleRateConfigChange('fallbackRate', Number(e.target.value))}
                leftIcon={<DollarSign className="w-4 h-4" />}
              />
              <FormField
                label="Currency"
                value={rateConfig.currency}
                onChange={(e) => handleRateConfigChange('currency', e.target.value.toUpperCase())}
                placeholder="USD"
              />
            </div>

            <div className="p-4 border border-[var(--border)] rounded-lg bg-[var(--background)]">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <Typography variant="subtitle2" fontWeight="600">Import Rates From PDF</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Reads rows like CA $1300, California 1300, or similar state/rate pairs.
                  </Typography>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setRatePdfFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="rate-pdf-upload"
                  />
                  <label htmlFor="rate-pdf-upload">
                    <Button component="span" variant="outline" icon={<FileText className="w-4 h-4" />}>
                      {ratePdfFile ? ratePdfFile.name : 'Select PDF'}
                    </Button>
                  </label>
                  <Button
                    type="button"
                    onClick={handleImportRatesPdf}
                    disabled={!ratePdfFile || importingRates}
                    loading={importingRates}
                    variant="primary"
                  >
                    Import PDF
                  </Button>
                </div>
              </div>
              {rateConfig.updatedFromPdfName ? (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
                  Last imported from {rateConfig.updatedFromPdfName}
                </Typography>
              ) : null}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {US_STATES.map((state) => (
                <FormField
                  key={state.code}
                  label={`${state.code} Rate`}
                  type="number"
                  value={rateConfig.stateRates[state.code] ?? ''}
                  onChange={(e) => handleStateRateChange(state.code, e.target.value)}
                  helperText={state.name}
                />
              ))}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={savingRates} loading={savingRates} variant="primary">
                Save Calculator
              </Button>
            </div>
          </form>
        </DashboardPanel>
      ) : null}
      </TabPanel>
    </DashboardSurface>
  );
}
