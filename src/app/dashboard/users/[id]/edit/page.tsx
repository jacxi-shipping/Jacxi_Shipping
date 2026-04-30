'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Save, Loader2, AlertCircle, Key, Copy, RefreshCw, Trash2 } from 'lucide-react';
import { Box, Typography, Alert, Divider } from '@mui/material';
import { 
  DashboardSurface, 
  DashboardPanel 
} from '@/components/dashboard/DashboardSurface';
import { 
  PageHeader, 
  Button, 
  Breadcrumbs, 
  FormField, 
  LoadingState,
  toast,
} from '@/components/design-system';
import { formatLoginCode } from '@/lib/loginCode';

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
  const [loginCode, setLoginCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);

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
          setLoginCode(data.user.loginCode || null);
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

  const handleCopyLoginCode = () => {
    if (!loginCode) return;
    navigator.clipboard.writeText(loginCode);
    toast.success('Login code copied to clipboard');
  };

  const handleGenerateLoginCode = async () => {
    setGeneratingCode(true);
    try {
      const response = await fetch('/api/users/login-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate login code');
      }

      setLoginCode(data.loginCode);
      toast.success('Login code generated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate login code';
      toast.error(message);
    } finally {
      setGeneratingCode(false);
    }
  };

  const handleDeleteLoginCode = async () => {
    if (!confirm('Are you sure you want to remove this login code? The user will no longer be able to use it to login.')) {
      return;
    }

    setGeneratingCode(true);
    try {
      const response = await fetch(`/api/users/login-code?userId=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove login code');
      }

      setLoginCode(null);
      toast.success('Login code removed successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove login code';
      toast.error(message);
    } finally {
      setGeneratingCode(false);
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

          <Divider sx={{ my: 3, borderColor: 'var(--border)' }} />

          {/* Login Code Management Section */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Key className="w-4 h-4" />
              Login Code Management
            </Typography>
            
            {loginCode ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'var(--text-secondary)', mb: 1, display: 'block' }}>
                    Current Login Code
                  </Typography>
                  <Box 
                    sx={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      bgcolor: 'var(--background)',
                      border: '2px solid var(--accent-gold)',
                      borderRadius: 2,
                      p: 2,
                    }}
                  >
                    <Key className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
                    <Box 
                      sx={{ 
                        fontSize: '1.5rem', 
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        fontFamily: 'monospace',
                        letterSpacing: '0.2em',
                        flex: 1,
                      }}
                    >
                      {formatLoginCode(loginCode)}
                    </Box>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Copy className="w-4 h-4" />}
                      onClick={handleCopyLoginCode}
                      type="button"
                    >
                      Copy
                    </Button>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<RefreshCw className="w-4 h-4" />}
                    onClick={handleGenerateLoginCode}
                    disabled={generatingCode}
                    type="button"
                  >
                    {generatingCode ? 'Regenerating...' : 'Regenerate Code'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Trash2 className="w-4 h-4" />}
                    onClick={handleDeleteLoginCode}
                    disabled={generatingCode}
                    type="button"
                  >
                    Remove Code
                  </Button>
                </Box>

                <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: 1.5 }}>
                  This user can login using this code at <Box component="span" sx={{ color: 'var(--accent-gold)', fontWeight: 500 }}>/auth/simple-login</Box>
                </Typography>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 3, bgcolor: 'var(--background)', borderRadius: 2, border: '1px dashed var(--border)' }}>
                <Typography sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)', mb: 2 }}>
                  No login code set for this user
                </Typography>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Key className="w-4 h-4" />}
                  onClick={handleGenerateLoginCode}
                  disabled={generatingCode}
                  type="button"
                >
                  {generatingCode ? 'Generating...' : 'Generate Login Code'}
                </Button>
              </Box>
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
