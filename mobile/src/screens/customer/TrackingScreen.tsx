import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { TrackingTimeline } from '../../components/customer/TrackingTimeline';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { trackingApi } from '../../api/tracking';
import { Shipment } from '../../types/shipment';

const TrackingScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const [loading, setLoading] = useState(false);
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [error, setError] = useState('');
  
  const { control, handleSubmit } = useForm();

  const onSubmit = async (data: any) => {
    try {
      setLoading(true);
      setError('');
      const result = await trackingApi.trackByNumber(data.trackingNumber);
      setShipment(result);
    } catch (err: any) {
      setError(err.message || 'Failed to track shipment');
      setShipment(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Track Your Shipment</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Enter your tracking number or VIN to see real-time updates
        </Text>

        <Card>
          <Controller
            control={control}
            name="trackingNumber"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Tracking Number / VIN"
                placeholder="Enter tracking number or VIN"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
          <Button title="Track" onPress={handleSubmit(onSubmit)} loading={loading} fullWidth />
        </Card>

        {error && (
          <Card style={styles.error}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </Card>
        )}

        {loading && <LoadingSpinner />}

        {shipment && (
          <Card style={styles.result}>
            <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>
              {shipment.vehicle.vin}
            </Text>
            <Text style={[styles.resultSubtitle, { color: colors.textSecondary }]}>
              {shipment.vehicle.year} {shipment.vehicle.make} {shipment.vehicle.model}
            </Text>
            <TrackingTimeline tracking={shipment.tracking} currentStatus={shipment.status} />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base },
  title: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.sm },
  description: { fontSize: Typography.fontSize.base, marginBottom: Spacing.xl },
  error: { marginTop: Spacing.base },
  errorText: { fontSize: Typography.fontSize.base, textAlign: 'center' },
  result: { marginTop: Spacing.base },
  resultTitle: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
  resultSubtitle: { fontSize: Typography.fontSize.base, marginBottom: Spacing.base },
});

export default TrackingScreen;
