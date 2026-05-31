import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { WorkspaceHub } from '../../components/shared/WorkspaceHub';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';

const SettingsScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();

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

  const openTab = (screen: 'Dashboard' | 'Shipments' | 'Customers' | 'Workspace') => {
    navigation.navigate('Home', { screen });
  };

  const openStack = (
    screen:
      | 'Containers'
      | 'Dispatches'
      | 'Invoices'
      | 'Finance'
      | 'FinanceReports'
      | 'Banking'
      | 'CompanyLedgers'
      | 'Documents'
      | 'Analytics'
      | 'Users'
      | 'PartnerPortals'
      | 'Transits'
      | 'Notifications'
      | 'Settings'
  ) => {
    navigation.navigate(screen);
  };

  return (
    <WorkspaceHub
      title="Admin Workspace"
      subtitle="A mobile shell organized like the web dashboard, with operations, finance, and admin tools grouped in one place."
      roleLabel={user.role}
      name={user.name}
      email={user.email}
      sections={[
        {
          title: 'Main',
          caption: 'Core dashboard surfaces used every day.',
          items: [
            { title: 'Dashboard', description: 'Overview, KPIs, and recent activity.', icon: '[]', onPress: () => openTab('Dashboard') },
            { title: 'Shipments', description: 'Review and manage shipment records.', icon: '<>', onPress: () => openTab('Shipments') },
            { title: 'Customers', description: 'Access customer accounts and details.', icon: 'OO', onPress: () => openTab('Customers') },
          ],
        },
        {
          title: 'Operations',
          caption: 'Workflow and logistics tools grouped together.',
          items: [
            { title: 'Containers', description: 'Container assignments and detail views.', icon: 'BX', onPress: () => openStack('Containers') },
            { title: 'Dispatches', description: 'Dispatch workflow and routing status.', icon: 'DP', onPress: () => openStack('Dispatches') },
            { title: 'Transits', description: 'Route legs, movement progress, and transit coordination.', icon: 'TR', onPress: () => openStack('Transits') },
            { title: 'Documents', description: 'Shipment and compliance documents.', icon: 'DO', onPress: () => openStack('Documents') },
          ],
        },
        {
          title: 'Finance',
          caption: 'Revenue, banking, and ledger tools in one cluster.',
          items: [
            { title: 'Finance', description: 'Financial overview and reporting entry point.', icon: '$$', onPress: () => openStack('Finance') },
            { title: 'Reports', description: 'Summary, user-wise, and shipment-wise financial reporting.', icon: 'RP', onPress: () => openStack('FinanceReports') },
            { title: 'Banking', description: 'Connected bank workflows and reconciliation entry point.', icon: 'BK', onPress: () => openStack('Banking') },
            { title: 'Company Ledgers', description: 'Company-level balances and ledger workflows.', icon: 'CL', onPress: () => openStack('CompanyLedgers') },
            { title: 'Invoices', description: 'Invoice management and payment status.', icon: 'IV', onPress: () => openStack('Invoices') },
          ],
        },
        {
          title: 'Admin & Growth',
          caption: 'Internal operations, partner coordination, and oversight.',
          items: [
            { title: 'Users', description: 'Internal account administration and staff oversight.', icon: 'US', onPress: () => openStack('Users') },
            { title: 'Partner Portals', description: 'Partner workspace coordination and handoff management.', icon: 'PP', onPress: () => openStack('PartnerPortals') },
            { title: 'Analytics', description: 'Operational performance and trends.', icon: 'AN', onPress: () => openStack('Analytics') },
            { title: 'Notifications', description: 'Messages and workflow alerts.', icon: 'NT', onPress: () => openStack('Notifications') },
          ],
        },
      ]}
      footer={
        <View style={styles.footer}>
          <Button title="Logout" onPress={handleLogout} variant="danger" fullWidth style={styles.logoutButton} />
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  footer: {
    paddingTop: Spacing.sm,
  },
  logoutButton: {
    marginTop: Spacing.sm,
  },
  version: {
    fontSize: Typography.fontSize.xs,
    textAlign: 'center',
    marginTop: Spacing.xl,
    color: Colors.light.textTertiary,
  },
});

export default SettingsScreen;
