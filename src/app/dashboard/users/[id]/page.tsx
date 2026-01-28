'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Edit,
  Package,
  Clock
} from 'lucide-react';
import { Box, Typography, Chip } from '@mui/material';
import { 
  DashboardSurface, 
  DashboardPanel, 
  DashboardGrid 
} from '@/components/dashboard/DashboardSurface';
import { 
  PageHeader, 
  Button, 
  Breadcrumbs, 
  LoadingState, 
  EmptyState 
} from '@/components/design-system';
import ShipmentCard from '@/components/dashboard/ShipmentCard';

interface UserDetail {
  id: string;
  name: string | null;
  email: string;
  role: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  shipments: any[]; // Using any[] for now as ShipmentCard handles the type mapping
}

export default function UserViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    // Auth check
    if (!session || (session.user.role !== 'admin' && session.user.id !== id)) {
      router.replace('/dashboard');
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/users/${id}`);
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          console.error('Failed to fetch user');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id, session, status, router]);

  if (loading || status === 'loading') {
    return <LoadingState />;
  }

  if (!user) {
    return (
      <DashboardSurface>
        <EmptyState 
          title="User Not Found" 
          description="The user you are looking for does not exist or has been removed."
          icon={<User className="w-12 h-12" />}
          action={
            <Link href="/dashboard/users">
              <Button variant="primary">Back to Users</Button>
            </Link>
          }
        />
      </DashboardSurface>
    );
  }

  return (
    <DashboardSurface>
      <Box sx={{ px: 2, pt: 2 }}>
        <Breadcrumbs />
      </Box>

      <PageHeader
        title={user.name || 'User Profile'}
        description={`Member since ${new Date(user.createdAt).toLocaleDateString()}`}
        actions={
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Link href="/dashboard/users" style={{ textDecoration: 'none' }}>
              <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
            </Link>
            {session?.user?.role === 'admin' && (
              <Link href={`/dashboard/users/${id}/edit`} style={{ textDecoration: 'none' }}>
                <Button variant="primary" icon={<Edit className="w-4 h-4" />}>
                  Edit Profile
                </Button>
              </Link>
            )}
          </Box>
        }
      />

      <DashboardGrid className="grid-cols-1 lg:grid-cols-3">
        {/* User Info Panel */}
        <DashboardPanel title="Profile Details" className="lg:col-span-1">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 2, borderBottom: '1px solid var(--border)' }}>
              <div className="w-16 h-16 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center">
                <User className="w-8 h-8 text-[var(--accent-gold)]" />
              </div>
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {user.name || 'No Name'}
                </Typography>
                <Chip 
                  label={user.role.toUpperCase()} 
                  size="small"
                  sx={{ 
                    mt: 0.5,
                    bgcolor: user.role === 'admin' ? 'rgba(var(--accent-gold-rgb), 0.1)' : 'var(--panel)',
                    color: user.role === 'admin' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.7rem'
                  }} 
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Mail className="w-5 h-5 text-[var(--text-secondary)]" />
                <Box>
                  <Typography variant="caption" color="text.secondary">Email</Typography>
                  <Typography variant="body2">{user.email}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Phone className="w-5 h-5 text-[var(--text-secondary)]" />
                <Box>
                  <Typography variant="caption" color="text.secondary">Phone</Typography>
                  <Typography variant="body2">{user.phone || 'Not provided'}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Calendar className="w-5 h-5 text-[var(--text-secondary)]" />
                <Box>
                  <Typography variant="caption" color="text.secondary">Joined</Typography>
                  <Typography variant="body2">{new Date(user.createdAt).toLocaleDateString()}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Clock className="w-5 h-5 text-[var(--text-secondary)]" />
                <Box>
                  <Typography variant="caption" color="text.secondary">Last Updated</Typography>
                  <Typography variant="body2">{new Date(user.updatedAt).toLocaleDateString()}</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </DashboardPanel>

        {/* Shipments Panel */}
        <Box className="lg:col-span-2">
          <DashboardPanel 
            title={`Shipments (${user.shipments.length})`} 
            description="History of all vehicle shipments"
            fullHeight
          >
            {user.shipments.length > 0 ? (
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                {user.shipments.map((shipment) => (
                  <ShipmentCard key={shipment.id} {...shipment} />
                ))}
              </Box>
            ) : (
              <EmptyState
                icon={<Package className="w-10 h-10" />}
                title="No Shipments"
                description="This user hasn't created any shipments yet."
              />
            )}
          </DashboardPanel>
        </Box>
      </DashboardGrid>
    </DashboardSurface>
  );
}
