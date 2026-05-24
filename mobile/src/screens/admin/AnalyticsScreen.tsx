import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../../components/shared/EmptyState';
import { Colors } from '../../constants/colors';

const AnalyticsScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <EmptyState icon="📊" title="Analytics" description="Analytics and reports coming soon" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({ container: { flex: 1 } });
export default AnalyticsScreen;
