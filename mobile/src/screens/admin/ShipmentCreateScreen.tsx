import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { useCreateShipment } from '../../hooks/useShipments';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { AppTopBar } from '../../components/shared/AppTopBar';
import { Toast } from '../../components/ui/Toast';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';

const ShipmentCreateScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const createShipment = useCreateShipment();
  const { control, handleSubmit } = useForm();
  const [showToast, setShowToast] = useState(false);

  const onSubmit = async (data: any) => {
    try {
      await createShipment.mutateAsync({
        vehicle: { vin: data.vin, year: parseInt(data.year), make: data.make, model: data.model },
        customerId: data.customerId,
        origin: { city: data.originCity, state: data.originState, country: 'USA' },
        destination: { city: data.destCity, country: data.destCountry },
      });
      setShowToast(true);
      setTimeout(() => navigation.goBack(), 2000);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppTopBar section="Create Shipment" detail="Vehicle, route, and customer setup" showBack />

        <Text style={[styles.title, { color: colors.textPrimary }]}>Create New Shipment</Text>

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Vehicle Information</Text>
          <Controller control={control} name="vin" render={({ field }) => (
            <Input label="VIN" placeholder="17-character VIN" {...field} />
          )} />
          <Controller control={control} name="year" render={({ field }) => (
            <Input label="Year" placeholder="2020" keyboardType="numeric" {...field} />
          )} />
          <Controller control={control} name="make" render={({ field }) => (
            <Input label="Make" placeholder="Toyota" {...field} />
          )} />
          <Controller control={control} name="model" render={({ field }) => (
            <Input label="Model" placeholder="Camry" {...field} />
          )} />
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Customer</Text>
          <Controller control={control} name="customerId" render={({ field }) => (
            <Input label="Customer ID" placeholder="Enter customer ID" {...field} />
          )} />
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Origin</Text>
          <Controller control={control} name="originCity" render={({ field }) => (
            <Input label="City" {...field} />
          )} />
          <Controller control={control} name="originState" render={({ field }) => (
            <Input label="State" {...field} />
          )} />
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Destination</Text>
          <Controller control={control} name="destCity" render={({ field }) => (
            <Input label="City" {...field} />
          )} />
          <Controller control={control} name="destCountry" render={({ field }) => (
            <Input label="Country" {...field} />
          )} />
        </Card>

        <Button title="Create Shipment" onPress={handleSubmit(onSubmit)} loading={createShipment.isPending} fullWidth />
      </ScrollView>

      <Toast visible={showToast} message="Shipment created successfully!" type="success" onHide={() => setShowToast(false)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base },
  title: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xl },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.md },
});

export default ShipmentCreateScreen;
