import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../../api/users';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ErrorState } from '../../components/shared/ErrorState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Input } from '../../components/ui/Input';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { AdminStackParamList } from '../../navigation/AdminNavigator';

type RouteProps = RouteProp<AdminStackParamList, 'UserEdit'>;

const roleOptions = [
  { label: 'Admin', value: 'admin' },
  { label: 'Manager', value: 'manager' },
  { label: 'Finance', value: 'finance' },
  { label: 'Operations', value: 'operations' },
  { label: 'Customer Service', value: 'customer_service' },
];

const UserEditScreen: React.FC = () => {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<any>();
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'admin',
    phone: '',
    address: '',
    city: '',
    country: '',
  });

  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-user-edit', route.params.id],
    queryFn: () => usersApi.getUser(route.params.id),
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    setForm({
      name: user.name || '',
      email: user.email,
      role: user.role,
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      country: user.country || '',
    });
  }, [user]);

  const roleLabel = useMemo(
    () => roleOptions.find((option) => option.value === form.role)?.label || 'Admin',
    [form.role],
  );

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      Alert.alert('Missing fields', 'Name and email are required.');
      return;
    }

    try {
      setSaving(true);
      await usersApi.updateUser(route.params.id, {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        country: form.country.trim() || undefined,
      });

      navigation.replace('UserDetail', { id: route.params.id });
    } catch (updateError: any) {
      Alert.alert('Unable to update user', updateError?.message || 'The user could not be updated.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (error) return <ErrorState message={(error as any).message} onRetry={refetch} />;
  if (!user) return <ErrorState message="User not found" />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Edit User</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Update internal account details from mobile using the same admin user mutation route used on web.</Text>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Basic Info</Text>
          <Input label="Full Name" value={form.name} onChangeText={(value) => updateField('name', value)} placeholder="Jane Doe" />
          <Input label="Email" value={form.email} onChangeText={(value) => updateField('email', value)} placeholder="jane@jacxi.com" keyboardType="email-address" autoCapitalize="none" />
          <Input label="Phone" value={form.phone} onChangeText={(value) => updateField('phone', value)} placeholder="Optional phone number" keyboardType="phone-pad" />
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Role</Text>
          <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>Selected role: {roleLabel}</Text>
          <View style={styles.roleGrid}>
            {roleOptions.map((option) => {
              const selected = option.value === form.role;
              return (
                <TouchableOpacity
                  key={option.value}
                  activeOpacity={0.85}
                  style={StyleSheet.flatten([
                    styles.roleChip,
                    {
                      backgroundColor: selected ? `${colors.accent}18` : colors.background,
                      borderColor: selected ? `${colors.accent}35` : colors.border,
                    },
                  ])}
                  onPress={() => updateField('role', option.value)}
                >
                  <Text style={[styles.roleChipText, { color: selected ? colors.accent : colors.textPrimary }]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Contact Details</Text>
          <Input label="Address" value={form.address} onChangeText={(value) => updateField('address', value)} placeholder="Optional address" />
          <Input label="City" value={form.city} onChangeText={(value) => updateField('city', value)} placeholder="Optional city" />
          <Input label="Country" value={form.country} onChangeText={(value) => updateField('country', value)} placeholder="Optional country" />
        </Card>

        <Button title="Save Changes" onPress={handleSubmit} loading={saving} fullWidth />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  sectionCard: { marginBottom: Spacing.base },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.sm,
  },
  sectionCaption: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.sm,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  roleChip: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  roleChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default UserEditScreen;