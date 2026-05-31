import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { WorkspaceHub } from '../../components/shared/WorkspaceHub';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { Colors } from '../../constants/colors';

const ProfileScreen: React.FC = () => {
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

  const openTab = (screen: 'Dashboard' | 'Shipments' | 'Tracking' | 'Invoices' | 'Workspace') => {
    navigation.navigate('Home', { screen });
  };

  const openNotifications = () => {
    navigation.navigate('Notifications');
  };

  return (
    <WorkspaceHub
      title="Customer Workspace"
      subtitle="A mobile shell organized like the customer portal, with shipment, finance, and account tools grouped together."
      roleLabel={user.role}
      name={user.name}
      email={user.email}
      loginCode={user.loginCode}
      sections={[
        {
          title: 'Main',
          caption: 'Your primary customer views.',
          items: [
            { title: 'Dashboard', description: 'Current shipments, alerts, and next steps.', icon: '[]', onPress: () => openTab('Dashboard') },
            { title: 'Shipments', description: 'Browse your active and completed shipments.', icon: '<>', onPress: () => openTab('Shipments') },
            { title: 'Tracking', description: 'Track containers and shipment progress.', icon: '>>', onPress: () => openTab('Tracking') },
            { title: 'Invoices', description: 'Review balances and payment status.', icon: '$$', onPress: () => openTab('Invoices') },
          ],
        },
        {
          title: 'Account',
          caption: 'Alerts and account access tools.',
          items: [
            { title: 'Notifications', description: 'Stay on top of shipment and billing updates.', icon: 'NT', onPress: openNotifications },
            { title: 'Workspace Home', description: 'Return to this account overview at any time.', icon: '::', onPress: () => openTab('Workspace') },
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

export default ProfileScreen;
