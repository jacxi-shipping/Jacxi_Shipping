import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabBar } from '../components/shared/TabBar';
import DashboardScreen from '../screens/customer/DashboardScreen';
import ShipmentsScreen from '../screens/customer/ShipmentsScreen';
import ShipmentDetailScreen from '../screens/customer/ShipmentDetailScreen';
import TrackingScreen from '../screens/customer/TrackingScreen';
import InvoicesScreen from '../screens/customer/InvoicesScreen';
import NotificationsScreen from '../screens/customer/NotificationsScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';

export type CustomerTabParamList = {
  Dashboard: undefined;
  Shipments: undefined;
  Tracking: undefined;
  Invoices: undefined;
  Profile: undefined;
};

export type CustomerStackParamList = {
  Home: undefined;
  ShipmentDetail: { id: string };
  Notifications: undefined;
};

const Tab = createBottomTabNavigator<CustomerTabParamList>();
const Stack = createNativeStackNavigator<CustomerStackParamList>();

const CustomerTabs = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Shipments" component={ShipmentsScreen} />
      <Tab.Screen name="Tracking" component={TrackingScreen} />
      <Tab.Screen name="Invoices" component={InvoicesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export const CustomerNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Home" component={CustomerTabs} />
      <Stack.Screen name="ShipmentDetail" component={ShipmentDetailScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
};
