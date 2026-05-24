import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../../components/shared/EmptyState';
import { Colors } from '../../constants/colors';

const FinanceScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <EmptyState icon="💰" title="Finance" description="Financial reports coming soon" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({ container: { flex: 1 } });
export default FinanceScreen;
