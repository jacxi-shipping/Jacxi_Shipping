import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Divider } from '../../components/ui/Divider';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';

const ProfileScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  if (!user) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Avatar name={user.name} size={80} />
          </View>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{user.name}</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>{user.email}</Text>
          {user.loginCode && (
            <View style={styles.loginCode}>
              <Text style={[styles.loginCodeLabel, { color: colors.textSecondary }]}>Login Code</Text>
              <Text style={[styles.loginCodeValue, { color: colors.accent }]}>{user.loginCode}</Text>
            </View>
          )}
        </Card>

        <Card>
          <TouchableOpacity style={styles.option}>
            <Text style={[styles.optionText, { color: colors.textPrimary }]}>📱 App Settings</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          <Divider spacing={0} />
          <TouchableOpacity style={styles.option}>
            <Text style={[styles.optionText, { color: colors.textPrimary }]}>🔔 Notifications</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
          <Divider spacing={0} />
          <TouchableOpacity style={styles.option}>
            <Text style={[styles.optionText, { color: colors.textPrimary }]}>📄 Terms & Privacy</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        </Card>

        <Button title="Logout" onPress={handleLogout} variant="danger" fullWidth style={styles.logoutButton} />
        
        <Text style={[styles.version, { color: colors.textTertiary }]}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base },
  profileCard: { alignItems: 'center', marginBottom: Spacing.base },
  avatarContainer: { marginBottom: Spacing.base },
  name: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
  email: { fontSize: Typography.fontSize.base, marginBottom: Spacing.base },
  loginCode: { alignItems: 'center' },
  loginCodeLabel: { fontSize: Typography.fontSize.xs, marginBottom: Spacing.xs },
  loginCodeValue: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.base },
  optionText: { fontSize: Typography.fontSize.base },
  arrow: { fontSize: 24, color: Colors.light.textTertiary },
  logoutButton: { marginTop: Spacing.base },
  version: { fontSize: Typography.fontSize.xs, textAlign: 'center', marginTop: Spacing.xl },
});

export default ProfileScreen;
