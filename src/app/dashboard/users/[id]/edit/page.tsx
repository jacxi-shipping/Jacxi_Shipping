'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Save, Loader2, AlertCircle } from 'lucide-react';
import { Box, Typography, Alert } from '@mui/material';
import { 
  DashboardSurface, 
  DashboardPanel 
} from '@/components/dashboard/DashboardSurface';
import { 
  PageHeader, 
  Button, 
  Breadcrumbs, 
  FormField, 
  LoadingState 
} from '@/components/design-system';

const userSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  role: z.enum(['user', 'admin', 'manager', 'customer_service']),
});

type UserFormData = z.infer<typeof userSchema>;

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  useEffect(() => {
    if (status === 'loading') return;
    
    // Auth check
    if (!session || session.user.role !== 'admin') {
      router.replace('/dashboard');
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/users/${id}`);
        if (response.ok) {
          const data = await response.json();
          reset({
            name: data.user.name || '',
            email: data.user.email,
            phone: data.user.phone || '',
            address: data.user.address || '',
            city: data.user.city || '',
            country: data.user.country || '',
            role: data.user.role,
          });
        } else {
          setError('Failed to fetch user details');
        }
      } catch (error) {
        setError('An error occurred while fetching user');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id, session, status, router, reset]);

  const onSubmit = async (data: UserFormData) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        router.push(`/dashboard/users/${id}`);
        router.refresh();
      } else {
        const result = await response.json();
        setError(result.message || 'Failed to update user');
      }
    } catch (error) {
      setError('An error occurred while updating user');
    }
  };

  if (loading || status === 'loading') {
    return <LoadingState />;
  }

  return (
    <DashboardSurface>
      <Box sx={{ px: 2, pt: 2 }}>
        <Breadcrumbs />
      </Box>

      <PageHeader
        title="Edit User"
        description="Update user profile information"
        actions={
          <Link href={`/dashboard/users/${id}`} style={{ textDecoration: 'none' }}>
            <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>
              Cancel
            </Button>
          </Link>
        }
      />

      <DashboardPanel className="max-w-2xl mx-auto">
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} icon={<AlertCircle className="w-5 h-5" />}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            label="Full Name"
            placeholder="John Doe"
            error={!!errors.name}
            helperText={errors.name?.message}
            {...register('name')}
          />

          <FormField
            label="Email Address"
            placeholder="john@example.com"
            type="email"
            error={!!errors.email}
            helperText={errors.email?.message}
            {...register('email')}
          />

          <FormField
            label="Phone Number"
            placeholder="+1 (555) 000-0000"
            error={!!errors.phone}
            helperText={errors.phone?.message}
            {...register('phone')}
          />

          <FormField
            label="Address"
            placeholder="123 Main St"
            error={!!errors.address}
            helperText={errors.address?.message}
            {...register('address')}
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <FormField
              label="City"
              placeholder="New York"
              error={!!errors.city}
              helperText={errors.city?.message}
              {...register('city')}
            />

            <FormField
              label="Country"
              placeholder="United States"
              error={!!errors.country}
              helperText={errors.country?.message}
              {...register('country')}
            />
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Role</Typography>
            <select
              {...register('role')}
              className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent outline-none transition-all"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="customer_service">Customer Service</option>
            </select>
            {errors.role && (
              <Typography color="error" variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                {errors.role.message}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 2 }}>
            <Link href={`/dashboard/users/${id}`} style={{ textDecoration: 'none' }}>
              <Button variant="ghost" type="button">Cancel</Button>
            </Link>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={isSubmitting}
              icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </form>
      </DashboardPanel>
    </DashboardSurface>
  );
}
