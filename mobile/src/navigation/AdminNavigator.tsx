import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabBar } from '../components/shared/TabBar';
import DashboardScreen from '../screens/admin/DashboardScreen';
import ShipmentsScreen from '../screens/admin/ShipmentsScreen';
import ShipmentDetailScreen from '../screens/admin/ShipmentDetailScreen';
import ShipmentCreateScreen from '../screens/admin/ShipmentCreateScreen';
import CustomersScreen from '../screens/admin/CustomersScreen';
import CustomerDetailScreen from '../screens/admin/CustomerDetailScreen';
import ContainersScreen from '../screens/admin/ContainersScreen';
import ContainerDetailScreen from '../screens/admin/ContainerDetailScreen';
import DispatchesScreen from '../screens/admin/DispatchesScreen';
import InvoicesScreen from '../screens/admin/InvoicesScreen';
import FinanceScreen from '../screens/admin/FinanceScreen';
import DocumentsScreen from '../screens/admin/DocumentsScreen';
import AnalyticsScreen from '../screens/admin/AnalyticsScreen';
import NotificationsScreen from '../screens/admin/NotificationsScreen';
import SettingsScreen from '../screens/admin/SettingsScreen';

export type AdminTabParamList = {
  Dashboard: undefined;
  Shipments: undefined;
  Customers: undefined;
  More: undefined;
};

export type AdminStackParamList = {
  Home: undefined;
  ShipmentDetail: { id: string };
  ShipmentCreate: undefined;
  CustomerDetail: { id: string };
  ContainerDetail: { id: string };
  Containers: undefined;
  Dispatches: undefined;
  Invoices: undefined;
  Finance: undefined;
  Documents: undefined;
  Analytics: undefined;
  Notifications: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();
const Stack = createNativeStackNavigator<AdminStackParamList>();

const MoreScreen = () => {
  return <SettingsScreen />;
};

const AdminTabs = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Shipments" component={ShipmentsScreen} />
      <Tab.Screen name="Customers" component={CustomersScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
};

export const AdminNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Home" component={AdminTabs} />
      <Stack.Screen name="ShipmentDetail" component={ShipmentDetailScreen} />
      <Stack.Screen name="ShipmentCreate" component={ShipmentCreateScreen} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
      <Stack.Screen name="Containers" component={ContainersScreen} />
      <Stack.Screen name="ContainerDetail" component={ContainerDetailScreen} />
      <Stack.Screen name="Dispatches" component={DispatchesScreen} />
      <Stack.Screen name="Invoices" component={InvoicesScreen} />
      <Stack.Screen name="Finance" component={FinanceScreen} />
      <Stack.Screen name="Documents" component={DocumentsScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
};
