'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { Autocomplete, Box, MenuItem, Tab, Tabs, TextField, Typography } from '@mui/material';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Breadcrumbs, Button, EmptyState, toast } from '@/components/design-system';
import { PortalActivityList } from '@/components/partner-portals/PortalActivityList';
import PortalBrandingSettingsPanel from '@/components/partner-portals/PortalBrandingSettingsPanel';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { useSession } from 'next-auth/react';
import { hasPermission } from '@/lib/rbac';

type PortalInfo = {
  id: string;
  name: string;
  code: string | null;
  customDomain?: string | null;
  customDomainVerifiedAt?: string | null;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  notes: string | null;
};

type PortalMembership = {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
};

type PortalActivity = {
  id: string;
  action: string;
  performedAt: string;
  actor: { id: string; name: string | null; email: string | null };
  target: { id: string | null; name: string | null; email: string | null };
  summary: string;
  changes?: Record<string, unknown>;
};

type PortalCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  _count?: { shipmentAssignments: number };
};

type ShipmentAssignment = {
  id: string;
  assignedAt: string;
  partnerCustomer: { id: string; name: string } | null;
  shipment: {
    id: string;
    vehicleType: string;
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleYear: number | null;
    vehicleVIN: string | null;
    status: string;
  };
};

type UserOption = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

type ShipmentOption = {
  id: string;
  vehicleType: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehicleVIN: string | null;
  status: string;
  user?: { name: string | null; email: string };
};

type PortalManageTab = 'shipments' | 'members' | 'activity' | 'branding' | 'customers';

export default function PartnerPortalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const portalId = String(params.portalId || '');
  const [portal, setPortal] = useState<PortalInfo | null>(null);
  const [memberships, setMemberships] = useState<PortalMembership[]>([]);
  const [customers, setCustomers] = useState<PortalCustomer[]>([]);
  const [assignments, setAssignments] = useState<ShipmentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [memberRole, setMemberRole] = useState('STAFF');
  const [savingMember, setSavingMember] = useState(false);
  const [memberRoleDrafts, setMemberRoleDrafts] = useState<Record<string, string>>({});
  const [savingMembershipRoleId, setSavingMembershipRoleId] = useState<string | null>(null);
  const [removingMembershipId, setRemovingMembershipId] = useState<string | null>(null);
  const [regeneratingLoginCodeMembershipId, setRegeneratingLoginCodeMembershipId] = useState<string | null>(null);
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [shipmentResults, setShipmentResults] = useState<ShipmentOption[]>([]);
  const [savingShipmentId, setSavingShipmentId] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', phone: '', city: '', country: '', membershipRole: 'STAFF' });
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ loginCode: string; simpleLoginUrl: string; portalUrl: string; email: string; name: string | null } | null>(null);
  const [loginCodeResult, setLoginCodeResult] = useState<{ loginCode: string; simpleLoginUrl: string; portalUrl: string; email: string; name: string | null } | null>(null);
  const [activities, setActivities] = useState<PortalActivity[]>([]);
  const [activeTab, setActiveTab] = useState<PortalManageTab>('shipments');

  const renderAccessResult = (
    result: { loginCode: string; simpleLoginUrl: string; portalUrl: string; email: string; name: string | null },
    title: string,
  ) => (
    <Box sx={{ border: '1px solid rgba(var(--accent-gold-rgb), 0.28)', bgcolor: 'rgba(var(--accent-gold-rgb), 0.08)', borderRadius: 2, p: 2, display: 'grid', gap: 0.75 }}>
      <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
      <Typography sx={{ color: 'var(--text-secondary)' }}>
        Share the sign-in page and code with this user. The workspace route is where they land after sign-in.
      </Typography>
      <Typography><strong>Name:</strong> {result.name || result.email}</Typography>
      <Typography><strong>Email:</strong> {result.email}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography><strong>Login Code:</strong> {result.loginCode}</Typography>
        <Button variant="outline" size="sm" onClick={() => void handleCopyValue(result.loginCode, 'Login code')}>Copy</Button>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography><strong>Sign-In Page:</strong> {result.simpleLoginUrl}</Typography>
        <Button variant="outline" size="sm" onClick={() => void handleCopyValue(result.simpleLoginUrl, 'Sign-in page')}>Copy</Button>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography><strong>Workspace Route:</strong> {result.portalUrl}</Typography>
        <Button variant="outline" size="sm" onClick={() => void handleCopyValue(result.portalUrl, 'Workspace route')}>Copy</Button>
      </Box>
    </Box>
  );

  const handleCopyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      console.error(error);
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const canAccess = hasPermission(session?.user?.role, 'customers:manage') || hasPermission(session?.user?.role, 'users:manage');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !canAccess) {
      router.replace('/dashboard');
    }
  }, [canAccess, router, session, status]);

  const fetchPortalData = async () => {
    try {
      setLoading(true);
      const [membershipsResponse, customersResponse, assignmentsResponse] = await Promise.all([
        fetch(`/api/partner-portals/${portalId}/memberships`, { cache: 'no-store' }),
        fetch(`/api/partner-portals/${portalId}/customers`, { cache: 'no-store' }),
        fetch(`/api/partner-portals/${portalId}/shipments`, { cache: 'no-store' }),
      ]);

      const membershipsData = await membershipsResponse.json();
      const customersData = await customersResponse.json();
      const assignmentsData = await assignmentsResponse.json();

      if (!membershipsResponse.ok) throw new Error(membershipsData.error || 'Failed to load memberships');
      if (!customersResponse.ok) throw new Error(customersData.error || 'Failed to load customers');
      if (!assignmentsResponse.ok) throw new Error(assignmentsData.error || 'Failed to load assignments');

      setPortal(membershipsData.portal);
      setMemberships(membershipsData.memberships || []);
      setMemberRoleDrafts(
        Object.fromEntries(
          (membershipsData.memberships || []).map((membership: PortalMembership) => [membership.id, membership.role])
        )
      );
      setCustomers(customersData.customers || []);
      setAssignments(assignmentsData.assignments || []);

      const activityResponse = await fetch(`/api/partner-portals/${portalId}/activity?limit=10`, { cache: 'no-store' });
      const activityData = await activityResponse.json();
      if (activityResponse.ok) {
        setActivities(activityData.activities || []);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to load portal details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && canAccess) {
      void fetchPortalData();
    }
  }, [portalId, status, canAccess]);

  useEffect(() => {
    if (!canAccess) return;
    const controller = new AbortController();

    const fetchUsers = async () => {
      try {
        const query = new URLSearchParams({ page: '1', pageSize: '20' });
        if (memberSearch.trim()) query.set('query', memberSearch.trim());
        const response = await fetch(`/api/users?${query.toString()}`, { signal: controller.signal });
        const data = await response.json();
        if (response.ok) {
          setUsers(data.users || []);
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error(error);
        }
      }
    };

    void fetchUsers();
    return () => controller.abort();
  }, [memberSearch, canAccess]);

  useEffect(() => {
    if (!canAccess || shipmentSearch.trim().length < 2) {
      setShipmentResults([]);
      return;
    }

    const controller = new AbortController();
    const fetchShipments = async () => {
      try {
        const query = new URLSearchParams({ page: '1', limit: '20', search: shipmentSearch.trim() });
        const response = await fetch(`/api/shipments?${query.toString()}`, { signal: controller.signal });
        const data = await response.json();
        if (response.ok) {
          const assignedIds = new Set(assignments.map((assignment) => assignment.shipment.id));
          setShipmentResults((data.shipments || []).filter((shipment: ShipmentOption) => !assignedIds.has(shipment.id)));
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error(error);
        }
      }
    };

    void fetchShipments();
    return () => controller.abort();
  }, [shipmentSearch, canAccess, assignments]);

  const membershipColumns = useMemo<Column<PortalMembership>[]>(() => [
    {
      key: 'user',
      header: 'Member',
      render: (_, row) => row.user.name || row.user.email,
    },
    {
      key: 'email',
      header: 'Email',
      render: (_, row) => row.user.email,
    },
    {
      key: 'role',
      header: 'Portal Role',
      render: (_, row) => (
        <TextField
          select
          size="small"
          value={memberRoleDrafts[row.id] || row.role}
          onChange={(event) => setMemberRoleDrafts((prev) => ({ ...prev, [row.id]: event.target.value }))}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="ADMIN">ADMIN</MenuItem>
          <MenuItem value="STAFF">STAFF</MenuItem>
        </TextField>
      ),
    },
    {
      key: 'appRole',
      header: 'App Role',
      render: (_, row) => row.user.role,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleUpdateMembershipRole(row)}
            disabled={savingMembershipRoleId === row.id || (memberRoleDrafts[row.id] || row.role) === row.role}
          >
            {savingMembershipRoleId === row.id ? 'Saving...' : 'Save Role'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleRegenerateLoginCode(row)}
            disabled={regeneratingLoginCodeMembershipId === row.id || row.user.role !== 'user'}
          >
            {regeneratingLoginCodeMembershipId === row.id ? 'Generating...' : 'Regenerate Code'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleRemoveMembership(row.id)} disabled={removingMembershipId === row.id}>
            {removingMembershipId === row.id ? 'Removing...' : 'Remove'}
          </Button>
        </Box>
      ),
    },
  ], [memberRoleDrafts, regeneratingLoginCodeMembershipId, removingMembershipId, savingMembershipRoleId]);

  const assignmentColumns = useMemo<Column<ShipmentAssignment>[]>(() => [
    {
      key: 'vehicle',
      header: 'Shipment',
      render: (_, row) => [row.shipment.vehicleYear, row.shipment.vehicleMake, row.shipment.vehicleModel].filter(Boolean).join(' ') || row.shipment.vehicleType,
    },
    {
      key: 'vin',
      header: 'VIN',
      render: (_, row) => row.shipment.vehicleVIN || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, row) => row.shipment.status,
    },
    {
      key: 'customer',
      header: 'Portal Customer',
      render: (_, row) => row.partnerCustomer?.name || 'Unassigned',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Link href={`/portal/${portalId}/shipments/${row.shipment.id}`} style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm">View</Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => void handleUnassignShipment(row.shipment.id)} disabled={savingShipmentId === row.shipment.id}>
            {savingShipmentId === row.shipment.id ? 'Removing...' : 'Unassign'}
          </Button>
        </Box>
      ),
    },
  ], [portalId, savingShipmentId]);

  const customerColumns = useMemo<Column<PortalCustomer>[]>(() => [
    { key: 'name', header: 'Customer', sortable: true },
    {
      key: 'email',
      header: 'Email',
      render: (_, row) => row.email || '—',
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (_, row) => row.phone || '—',
    },
    {
      key: 'count',
      header: 'Assigned Shipments',
      render: (_, row) => row._count?.shipmentAssignments || 0,
    },
  ], []);

  const handleAddMember = async () => {
    if (!selectedUser) {
      toast.error('Select a user first');
      return;
    }

    try {
      setSavingMember(true);
      const response = await fetch(`/api/partner-portals/${portalId}/memberships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, role: memberRole }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save portal member');
      }

      toast.success('Portal member saved');
      setSelectedUser(null);
      setMemberSearch('');
      await fetchPortalData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save portal member');
    } finally {
      setSavingMember(false);
    }
  };

  const handleUpdateMembershipRole = async (membership: PortalMembership) => {
    const nextRole = memberRoleDrafts[membership.id] || membership.role;

    if (nextRole === membership.role) {
      return;
    }

    try {
      setSavingMembershipRoleId(membership.id);
      const response = await fetch(`/api/partner-portals/${portalId}/memberships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: membership.user.id,
          role: nextRole,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update portal role');
      }

      toast.success('Portal role updated');
      await fetchPortalData();
    } catch (error) {
      setMemberRoleDrafts((prev) => ({ ...prev, [membership.id]: membership.role }));
      toast.error(error instanceof Error ? error.message : 'Failed to update portal role');
    } finally {
      setSavingMembershipRoleId(null);
    }
  };

  const handleRemoveMembership = async (membershipId: string) => {
    if (!confirm('Remove this member from the portal?')) {
      return;
    }

    try {
      setRemovingMembershipId(membershipId);
      const response = await fetch(`/api/partner-portals/${portalId}/memberships/${membershipId}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove portal member');
      }

      toast.success('Portal member removed');
      await fetchPortalData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove portal member');
    } finally {
      setRemovingMembershipId(null);
    }
  };

  const handleRegenerateLoginCode = async (membership: PortalMembership) => {
    try {
      setRegeneratingLoginCodeMembershipId(membership.id);
      const response = await fetch(`/api/partner-portals/${portalId}/memberships/${membership.id}/login-code`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate login code');
      }

      setLoginCodeResult({
        loginCode: data.loginCode,
        simpleLoginUrl: data.simpleLoginUrl,
        portalUrl: data.portalUrl,
        email: data.user.email,
        name: data.user.name,
      });
      toast.success('Login code regenerated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to regenerate login code');
    } finally {
      setRegeneratingLoginCodeMembershipId(null);
    }
  };

  const handleAssignShipment = async (shipmentId: string) => {
    try {
      setSavingShipmentId(shipmentId);
      const response = await fetch(`/api/partner-portals/${portalId}/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign shipment');
      }

      toast.success('Shipment assigned to portal');
      setShipmentSearch('');
      setShipmentResults([]);
      await fetchPortalData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign shipment');
    } finally {
      setSavingShipmentId(null);
    }
  };

  const handleUnassignShipment = async (shipmentId: string) => {
    if (!confirm('Remove this shipment from the portal? The partner will no longer see it.')) {
      return;
    }

    try {
      setSavingShipmentId(shipmentId);
      const response = await fetch(`/api/partner-portals/${portalId}/shipments/${shipmentId}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unassign shipment');
      }

      toast.success('Shipment removed from portal');
      await fetchPortalData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to unassign shipment');
    } finally {
      setSavingShipmentId(null);
    }
  };

  const handleInvitePortalUser = async () => {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    try {
      setInviting(true);
      const response = await fetch(`/api/partner-portals/${portalId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite portal user');
      }

      setInviteResult({
        loginCode: data.loginCode,
        simpleLoginUrl: data.simpleLoginUrl,
        portalUrl: data.portalUrl,
        email: data.user.email,
        name: data.user.name,
      });
      setInviteForm({ name: '', email: '', phone: '', city: '', country: '', membershipRole: 'STAFF' });
      toast.success('Portal user ready');
      await fetchPortalData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to invite portal user');
    } finally {
      setInviting(false);
    }
  };

  if (status === 'loading' || !session || !canAccess) {
    return null;
  }

  return (
    <DashboardSurface>
      <Box sx={{ px: 2, pt: 2 }}>
        <Breadcrumbs />
      </Box>

      <DashboardPanel
        title={portal ? portal.name : 'Portal'}
        description={portal?.code ? `Portal code: ${portal.code}` : 'Partner portal detail'}
        actions={
          <Link href="/dashboard/partner-portals" style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm">Back to Portals</Button>
          </Link>
        }
      >
        {loading ? (
          <Box sx={{ color: 'var(--text-secondary)' }}>Loading portal details...</Box>
        ) : (
          <Box sx={{ display: 'grid', gap: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'var(--border)' }}>
              <Tabs
                value={activeTab}
                onChange={(_, value) => setActiveTab(value)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    minHeight: 48,
                    '&:hover': {
                      color: 'var(--accent-gold)',
                    },
                  },
                  '& .Mui-selected': {
                    color: 'var(--accent-gold) !important',
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: 'var(--accent-gold)',
                  },
                }}
              >
                <Tab value="shipments" label={`Shipments (${assignments.length})`} />
                <Tab value="members" label={`Members (${memberships.length})`} />
                <Tab value="activity" label={`Activity (${activities.length})`} />
                <Tab value="branding" label="Branding" />
                <Tab value="customers" label={`Customers (${customers.length})`} />
              </Tabs>
            </Box>

            {activeTab === 'shipments' ? (
              <DashboardPanel title="Assigned Shipments" description="Shipments visible to this partner workspace">
                {assignments.length === 0 ? (
                  <EmptyState icon={<Inventory2OutlinedIcon />} title="No assigned shipments" description="Search below and assign the first shipment into this portal." />
                ) : (
                  <DataTable data={assignments} columns={assignmentColumns} keyField="id" />
                )}

                <Box sx={{ mt: 3, display: 'grid', gap: 2 }}>
                  <Typography sx={{ fontWeight: 700 }}>Assign Shipment</Typography>
                  <TextField label="Search shipments by vehicle or VIN" value={shipmentSearch} onChange={(event) => setShipmentSearch(event.target.value)} />
                  {shipmentResults.length > 0 ? (
                    <Box sx={{ display: 'grid', gap: 1 }}>
                      {shipmentResults.map((shipment) => (
                        <Box key={shipment.id} sx={{ border: '1px solid var(--border)', borderRadius: 2, px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                          <Box>
                            <Typography sx={{ fontWeight: 600 }}>
                              {[shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || shipment.vehicleType}
                            </Typography>
                            <Typography sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              {shipment.vehicleVIN || 'No VIN'} • {shipment.status} • {shipment.user?.name || shipment.user?.email || 'No owner'}
                            </Typography>
                          </Box>
                          <Button variant="outline" size="sm" onClick={() => void handleAssignShipment(shipment.id)} disabled={savingShipmentId === shipment.id}>
                            {savingShipmentId === shipment.id ? 'Assigning...' : 'Assign'}
                          </Button>
                        </Box>
                      ))}
                    </Box>
                  ) : shipmentSearch.trim().length >= 2 ? (
                    <Box sx={{ color: 'var(--text-secondary)' }}>No unassigned search results found.</Box>
                  ) : null}
                </Box>
              </DashboardPanel>
            ) : null}

            {activeTab === 'members' ? (
              <DashboardPanel title="Portal Members" description="Users who can enter this workspace">
                {memberships.length === 0 ? (
                  <EmptyState icon={<PeopleOutlineIcon />} title="No members" description="Add the first member below." />
                ) : (
                  <DataTable data={memberships} columns={membershipColumns} keyField="id" />
                )}

                <Box sx={{ mt: 3, display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 200px auto' }, alignItems: 'start' }}>
                  <Autocomplete
                    options={users}
                    value={selectedUser}
                    onChange={(_, value) => setSelectedUser(value)}
                    onInputChange={(_, value) => setMemberSearch(value)}
                    getOptionLabel={(option) => option.name ? `${option.name} (${option.email})` : option.email}
                    renderInput={(params) => <TextField {...params} label="Add user to portal" placeholder="Search users by name or email" />}
                  />
                  <TextField select label="Portal Role" value={memberRole} onChange={(event) => setMemberRole(event.target.value)}>
                    <MenuItem value="ADMIN">ADMIN</MenuItem>
                    <MenuItem value="STAFF">STAFF</MenuItem>
                  </TextField>
                  <Button variant="primary" onClick={() => void handleAddMember()} disabled={savingMember}>
                    {savingMember ? 'Saving...' : 'Add Member'}
                  </Button>
                </Box>

                <Box sx={{ mt: 4, display: 'grid', gap: 2 }}>
                  <Typography sx={{ fontWeight: 700 }}>Create Portal User</Typography>
                  <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' } }}>
                    <TextField label="Name" value={inviteForm.name} onChange={(event) => setInviteForm((prev) => ({ ...prev, name: event.target.value }))} />
                    <TextField label="Email" value={inviteForm.email} onChange={(event) => setInviteForm((prev) => ({ ...prev, email: event.target.value }))} />
                    <TextField label="Phone" value={inviteForm.phone} onChange={(event) => setInviteForm((prev) => ({ ...prev, phone: event.target.value }))} />
                    <TextField label="City" value={inviteForm.city} onChange={(event) => setInviteForm((prev) => ({ ...prev, city: event.target.value }))} />
                    <TextField label="Country" value={inviteForm.country} onChange={(event) => setInviteForm((prev) => ({ ...prev, country: event.target.value }))} />
                    <TextField select label="Portal Role" value={inviteForm.membershipRole} onChange={(event) => setInviteForm((prev) => ({ ...prev, membershipRole: event.target.value }))}>
                      <MenuItem value="ADMIN">ADMIN</MenuItem>
                      <MenuItem value="STAFF">STAFF</MenuItem>
                    </TextField>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="primary" onClick={() => void handleInvitePortalUser()} disabled={inviting}>
                      {inviting ? 'Preparing...' : 'Create User And Access Code'}
                    </Button>
                  </Box>

                  {inviteResult ? renderAccessResult(inviteResult, 'Portal user created') : null}

                  {loginCodeResult ? renderAccessResult(loginCodeResult, 'Portal login code refreshed') : null}
                </Box>
              </DashboardPanel>
            ) : null}

            {activeTab === 'activity' ? (
              <DashboardPanel title="Portal Activity" description="Recent membership and access-code changes for this portal">
                <PortalActivityList
                  activities={activities}
                  emptyTitle="No portal activity yet"
                  emptyDescription="Role changes, member invites, removals, and login-code refreshes will appear here."
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Link href={`/dashboard/partner-portals/${portalId}/activity`} style={{ textDecoration: 'none' }}>
                    <Button variant="outline" size="sm">View All Activity</Button>
                  </Link>
                </Box>
              </DashboardPanel>
            ) : null}

            {activeTab === 'branding' ? (
              <PortalBrandingSettingsPanel
                portalId={portalId}
                portal={portal}
                canEdit={true}
                onSaved={(nextPortal) => setPortal((prev) => prev ? ({ ...prev, ...nextPortal }) : ({
                  id: nextPortal.id,
                  name: nextPortal.name,
                  code: nextPortal.code,
                  companyLabel: nextPortal.companyLabel || null,
                  accentColor: nextPortal.accentColor || null,
                  logoUrl: nextPortal.logoUrl || null,
                  isActive: nextPortal.isActive ?? true,
                  notes: nextPortal.notes || null,
                }))}
              />
            ) : null}

            {activeTab === 'customers' ? (
              <DashboardPanel title="Portal Customers" description="Customers created inside this partner workspace">
                {customers.length === 0 ? (
                  <EmptyState icon={<PersonOutlineIcon />} title="No portal customers" description="The partner can create their own customers from the portal workspace." />
                ) : (
                  <DataTable data={customers} columns={customerColumns} keyField="id" />
                )}
              </DashboardPanel>
            ) : null}
          </Box>
        )}
      </DashboardPanel>
    </DashboardSurface>
  );
}