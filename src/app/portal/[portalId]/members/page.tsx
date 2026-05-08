'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import { Box, MenuItem, TextField, Typography } from '@mui/material';
import { useSession } from 'next-auth/react';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, EmptyState, toast } from '@/components/design-system';
import { PortalActivityList } from '@/components/partner-portals/PortalActivityList';
import { DataTable, type Column } from '@/components/ui/DataTable';

type PortalInfo = {
  id: string;
  name: string;
  code: string | null;
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

export default function PortalMembersPage() {
  const params = useParams();
  const { data: session } = useSession();
  const portalId = String(params.portalId || '');
  const [portal, setPortal] = useState<PortalInfo | null>(null);
  const [memberships, setMemberships] = useState<PortalMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberRoleDrafts, setMemberRoleDrafts] = useState<Record<string, string>>({});
  const [savingMembershipRoleId, setSavingMembershipRoleId] = useState<string | null>(null);
  const [removingMembershipId, setRemovingMembershipId] = useState<string | null>(null);
  const [regeneratingLoginCodeMembershipId, setRegeneratingLoginCodeMembershipId] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', phone: '', city: '', country: '', membershipRole: 'STAFF' });
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ loginCode: string; simpleLoginUrl: string; portalUrl: string; email: string; name: string | null } | null>(null);
  const [loginCodeResult, setLoginCodeResult] = useState<{ loginCode: string; simpleLoginUrl: string; portalUrl: string; email: string; name: string | null } | null>(null);
  const [activities, setActivities] = useState<PortalActivity[]>([]);

  const currentMembership = useMemo(
    () => memberships.find((membership) => membership.user.id === session?.user?.id) || null,
    [memberships, session?.user?.id],
  );
  const canManageMembers = currentMembership?.role === 'ADMIN';

  const fetchMemberships = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/partner-portals/${portalId}/memberships`, { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load portal members');
      }

      setPortal(data.portal);
      setMemberships(data.memberships || []);
      setMemberRoleDrafts(
        Object.fromEntries((data.memberships || []).map((membership: PortalMembership) => [membership.id, membership.role]))
      );

      const activityResponse = await fetch(`/api/partner-portals/${portalId}/activity?limit=10`, { cache: 'no-store' });
      const activityData = await activityResponse.json();
      if (activityResponse.ok) {
        setActivities(activityData.activities || []);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to load portal members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMemberships();
  }, [portalId]);

  const handleCopyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      console.error(error);
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const handleUpdateMembershipRole = async (membership: PortalMembership) => {
    const nextRole = memberRoleDrafts[membership.id] || membership.role;

    if (!canManageMembers || nextRole === membership.role) {
      return;
    }

    try {
      setSavingMembershipRoleId(membership.id);
      const response = await fetch(`/api/partner-portals/${portalId}/memberships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: membership.user.id, role: nextRole }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update portal role');
      }

      toast.success('Portal role updated');
      await fetchMemberships();
    } catch (error) {
      setMemberRoleDrafts((prev) => ({ ...prev, [membership.id]: membership.role }));
      toast.error(error instanceof Error ? error.message : 'Failed to update portal role');
    } finally {
      setSavingMembershipRoleId(null);
    }
  };

  const handleRemoveMembership = async (membershipId: string) => {
    if (!canManageMembers) {
      return;
    }

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
      await fetchMemberships();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove portal member');
    } finally {
      setRemovingMembershipId(null);
    }
  };

  const handleRegenerateLoginCode = async (membership: PortalMembership) => {
    if (!canManageMembers) {
      return;
    }

    try {
      setRegeneratingLoginCodeMembershipId(membership.id);
      const response = await fetch(`/api/partner-portals/${portalId}/memberships/${membership.id}/login-code`, { method: 'POST' });
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

  const handleInvitePortalUser = async () => {
    if (!canManageMembers) {
      return;
    }

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
      await fetchMemberships();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to invite portal user');
    } finally {
      setInviting(false);
    }
  };

  const columns = useMemo<Column<PortalMembership>[]>(() => [
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
      render: (_, row) => canManageMembers ? (
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
      ) : row.role,
    },
    {
      key: 'appRole',
      header: 'App Role',
      render: (_, row) => row.user.role,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => canManageMembers ? (
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
      ) : 'Read only',
    },
  ], [canManageMembers, memberRoleDrafts, regeneratingLoginCodeMembershipId, removingMembershipId, savingMembershipRoleId]);

  return (
    <DashboardSurface>
      <DashboardPanel
        title={portal ? `${portal.name} Members` : 'Portal Members'}
        description={canManageMembers ? 'Manage portal members, roles, and access codes.' : 'Portal member list'}
      >
        {loading ? (
          <Box sx={{ color: 'var(--text-secondary)' }}>Loading portal members...</Box>
        ) : memberships.length === 0 ? (
          <EmptyState icon={<PeopleOutlineIcon />} title="No members" description="This portal does not have any members yet." />
        ) : (
          <Box sx={{ display: 'grid', gap: 3 }}>
            {!canManageMembers ? (
              <EmptyState icon={<Inventory2OutlinedIcon />} title="Portal admin access required" description="Only portal admins can invite members, change roles, remove members, or regenerate access codes." />
            ) : null}

            <DataTable data={memberships} columns={columns} keyField="id" />

            {canManageMembers ? (
              <DashboardPanel title="Create Portal User" description="Create a portal member account and get a login code immediately.">
                <Box sx={{ display: 'grid', gap: 2 }}>
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
                  {inviteResult ? (
                    <Box sx={{ border: '1px solid rgba(var(--accent-gold-rgb), 0.28)', bgcolor: 'rgba(var(--accent-gold-rgb), 0.08)', borderRadius: 2, p: 2, display: 'grid', gap: 0.75 }}>
                      <Typography sx={{ fontWeight: 700 }}>Portal user created</Typography>
                      <Typography><strong>Name:</strong> {inviteResult.name || inviteResult.email}</Typography>
                      <Typography><strong>Email:</strong> {inviteResult.email}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography><strong>Login Code:</strong> {inviteResult.loginCode}</Typography>
                        <Button variant="outline" size="sm" onClick={() => void handleCopyValue(inviteResult.loginCode, 'Login code')}>Copy</Button>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography><strong>Simple Login Link:</strong> {inviteResult.simpleLoginUrl}</Typography>
                        <Button variant="outline" size="sm" onClick={() => void handleCopyValue(inviteResult.simpleLoginUrl, 'Simple login link')}>Copy</Button>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography><strong>Portal Path:</strong> {inviteResult.portalUrl}</Typography>
                        <Button variant="outline" size="sm" onClick={() => void handleCopyValue(inviteResult.portalUrl, 'Portal path')}>Copy</Button>
                      </Box>
                    </Box>
                  ) : null}

                  {loginCodeResult ? (
                    <Box sx={{ border: '1px solid rgba(var(--accent-gold-rgb), 0.28)', bgcolor: 'rgba(var(--accent-gold-rgb), 0.08)', borderRadius: 2, p: 2, display: 'grid', gap: 0.75 }}>
                      <Typography sx={{ fontWeight: 700 }}>Portal login code refreshed</Typography>
                      <Typography><strong>Name:</strong> {loginCodeResult.name || loginCodeResult.email}</Typography>
                      <Typography><strong>Email:</strong> {loginCodeResult.email}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography><strong>Login Code:</strong> {loginCodeResult.loginCode}</Typography>
                        <Button variant="outline" size="sm" onClick={() => void handleCopyValue(loginCodeResult.loginCode, 'Login code')}>Copy</Button>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography><strong>Simple Login Link:</strong> {loginCodeResult.simpleLoginUrl}</Typography>
                        <Button variant="outline" size="sm" onClick={() => void handleCopyValue(loginCodeResult.simpleLoginUrl, 'Simple login link')}>Copy</Button>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography><strong>Portal Path:</strong> {loginCodeResult.portalUrl}</Typography>
                        <Button variant="outline" size="sm" onClick={() => void handleCopyValue(loginCodeResult.portalUrl, 'Portal path')}>Copy</Button>
                      </Box>
                    </Box>
                  ) : null}
                </Box>
              </DashboardPanel>
            ) : null}

            {canManageMembers ? (
              <DashboardPanel title="Portal Activity" description="Recent membership and access-code changes for this portal">
                <PortalActivityList
                  activities={activities}
                  emptyTitle="No portal activity yet"
                  emptyDescription="Role changes, member invites, removals, and login-code refreshes will appear here."
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Link href={`/portal/${portalId}/activity`} style={{ textDecoration: 'none' }}>
                    <Button variant="outline" size="sm">View All Activity</Button>
                  </Link>
                </Box>
              </DashboardPanel>
            ) : null}
          </Box>
        )}
      </DashboardPanel>
    </DashboardSurface>
  );
}