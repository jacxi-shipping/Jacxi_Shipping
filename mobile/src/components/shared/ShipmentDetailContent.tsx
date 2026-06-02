import React, { useMemo, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { Shipment } from '../../types/shipment';
import { AppTopBar } from './AppTopBar';
import { AppIcon } from './AppIcon';
import { Card } from '../ui/Card';
import { StatusBadge } from './StatusBadge';
import { Divider } from '../ui/Divider';
import { TrackingTimeline } from '../customer/TrackingTimeline';
import { ShipmentDocumentsCard } from './ShipmentDocumentsCard';
import { EmptyState } from './EmptyState';
import { DetailTabs, DetailTabOption } from './DetailTabs';
import { useAppTheme } from '../../hooks/useAppTheme';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

interface ShipmentDetailContentProps {
  shipment: Shipment;
  showCustomer: boolean;
}

type ShipmentDetailTabKey = 'overview' | 'activity' | 'documents' | 'photos' | 'billing' | 'customer';

const formatValue = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') {
    return 'Not set';
  }

  return String(value);
};

const formatCurrency = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Not set';
  }

  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export const ShipmentDetailContent: React.FC<ShipmentDetailContentProps> = ({ shipment, showCustomer }) => {
  const { colors } = useAppTheme();

  const tabs = useMemo<DetailTabOption[]>(() => {
    const baseTabs: DetailTabOption[] = [
      { key: 'overview', label: 'Overview' },
      { key: 'activity', label: 'Activity' },
      { key: 'documents', label: 'Documents' },
      { key: 'photos', label: 'Photos' },
      { key: 'billing', label: 'Billing' },
    ];

    if (showCustomer) {
      baseTabs.splice(4, 0, { key: 'customer', label: 'Customer' });
    }

    return baseTabs;
  }, [showCustomer]);

  const [activeTab, setActiveTab] = useState<ShipmentDetailTabKey>('overview');
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const selectedPhoto = selectedPhotoIndex !== null ? shipment.photos[selectedPhotoIndex] : null;

  const overviewContent = (
    <Card>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Shipment Overview</Text>
      <View style={styles.info}>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Tracking #</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{formatValue(shipment.trackingNumber)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>From</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{formatValue([shipment.origin.city, shipment.origin.state].filter(Boolean).join(', '))}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>To</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{formatValue([shipment.destination.city, shipment.destination.country].filter(Boolean).join(', '))}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Estimated Delivery</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>
            {shipment.estimatedDelivery ? format(new Date(shipment.estimatedDelivery), 'MMM d, yyyy') : 'Not set'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Container</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{formatValue(shipment.containerNumber)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Last Updated</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{format(new Date(shipment.updatedAt), 'MMM d, yyyy')}</Text>
        </View>
      </View>
    </Card>
  );

  const activityContent = (
    <Card>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Activity & Tracking</Text>
      <Text style={[styles.sectionText, { color: colors.textSecondary }]}>Track progression, checkpoints, and the current shipment status.</Text>
      <TrackingTimeline tracking={shipment.tracking} currentStatus={shipment.status} />
    </Card>
  );

  const documentsContent = <ShipmentDocumentsCard shipmentId={shipment.id} />;

  const photosContent = (
    <Card>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Photos</Text>
      <Text style={[styles.sectionText, { color: colors.textSecondary }]}>Arrival, condition, and shipment-related image records.</Text>
      {shipment.photos.length === 0 ? (
        <EmptyState icon="documents" title="No Photos" description="No shipment photos are available yet." />
      ) : (
        <View style={styles.photoGrid}>
          {shipment.photos.map((photo, index) => (
            <TouchableOpacity key={photo.id} style={styles.photoCell} activeOpacity={0.88} onPress={() => setSelectedPhotoIndex(index)}>
              <Image source={{ uri: photo.url }} style={[styles.photo, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]} resizeMode="cover" />
              <Text style={[styles.photoCaption, { color: colors.textSecondary }]} numberOfLines={2}>
                {photo.caption || format(new Date(photo.uploadedAt), 'MMM d, yyyy')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </Card>
  );

  const billingContent = (
    <Card>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Billing & Financials</Text>
      <View style={styles.info}>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Total</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{formatCurrency(shipment.pricing?.total)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Shipping Cost</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{formatCurrency(shipment.pricing?.shippingCost)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Ocean Freight</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{formatCurrency(shipment.pricing?.oceanFreight)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Insurance</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{formatCurrency(shipment.pricing?.insurance)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Invoice ID</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{formatValue(shipment.invoiceId)}</Text>
        </View>
      </View>
      {shipment.notes ? <Text style={[styles.notes, { color: colors.textSecondary }]}>Notes: {shipment.notes}</Text> : null}
    </Card>
  );

  const customerContent = showCustomer ? (
    <Card>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Customer</Text>
      <View style={styles.info}>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{formatValue(shipment.customerName)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{formatValue(shipment.customerEmail)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Customer ID</Text>
          <Text style={[styles.value, { color: colors.textPrimary }]}>{formatValue(shipment.customerId)}</Text>
        </View>
      </View>
    </Card>
  ) : null;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'activity':
        return activityContent;
      case 'documents':
        return documentsContent;
      case 'photos':
        return photosContent;
      case 'billing':
        return billingContent;
      case 'customer':
        return customerContent;
      case 'overview':
      default:
        return overviewContent;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <>
        <ScrollView contentContainerStyle={styles.content}>
          <AppTopBar section="Shipment Details" detail={shipment.trackingNumber} showBack />

          <Card>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={[styles.vin, { color: colors.textPrimary }]}>{shipment.vehicle.vin}</Text>
                <Text style={[styles.vehicle, { color: colors.textSecondary }]}> 
                  {[shipment.vehicle.year, shipment.vehicle.make, shipment.vehicle.model].filter(Boolean).join(' ')}
                </Text>
                {showCustomer && shipment.customerName ? (
                  <Text style={[styles.customer, { color: colors.textSecondary }]}>Customer: {shipment.customerName}</Text>
                ) : null}
              </View>
              <StatusBadge status={shipment.status} type="shipment" />
            </View>

            <Divider />

            <View style={styles.summaryMetrics}>
              <View style={[styles.metricChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Tracking</Text>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{shipment.trackingNumber}</Text>
              </View>
              <View style={[styles.metricChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Documents</Text>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{shipment.documents.length}</Text>
              </View>
              <View style={[styles.metricChip, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Photos</Text>
                <Text style={[styles.metricValue, { color: colors.textPrimary }]}>{shipment.photos.length}</Text>
              </View>
            </View>
          </Card>

          <DetailTabs tabs={tabs} activeTab={activeTab} onChange={(key) => setActiveTab(key as ShipmentDetailTabKey)} />

          {renderTabContent()}
        </ScrollView>

        <Modal visible={selectedPhotoIndex !== null} transparent animationType="fade" onRequestClose={() => setSelectedPhotoIndex(null)}>
          <View style={[styles.viewerOverlay, { backgroundColor: 'rgba(10, 14, 20, 0.94)' }]}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setSelectedPhotoIndex(null)}
              style={[styles.viewerCloseButton, { backgroundColor: colors.panel, borderColor: colors.border }]}
            >
              <AppIcon name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>

            {selectedPhoto ? (
              <>
                <View style={styles.viewerHeader}>
                  <Text style={[styles.viewerCounter, { color: colors.accentContrast || colors.textPrimary }]}>
                    {selectedPhotoIndex! + 1} / {shipment.photos.length}
                  </Text>
                </View>
                <Image source={{ uri: selectedPhoto.url }} style={styles.viewerImage} resizeMode="contain" />
                <View style={styles.viewerFooter}>
                  <Text style={[styles.viewerCaption, { color: '#FFFFFF' }]}>
                    {selectedPhoto.caption || format(new Date(selectedPhoto.uploadedAt), 'MMM d, yyyy')}
                  </Text>
                  {shipment.photos.length > 1 ? (
                    <View style={styles.viewerActionRow}>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        disabled={selectedPhotoIndex === 0}
                        onPress={() => setSelectedPhotoIndex((current) => (current === null ? current : Math.max(current - 1, 0)))}
                        style={StyleSheet.flatten([
                          styles.viewerAction,
                          {
                            backgroundColor: selectedPhotoIndex === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.18)',
                            borderColor: 'rgba(255,255,255,0.18)',
                          },
                        ])}
                      >
                        <Text style={styles.viewerActionText}>Previous</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        disabled={selectedPhotoIndex === shipment.photos.length - 1}
                        onPress={() => setSelectedPhotoIndex((current) => (current === null ? current : Math.min(current + 1, shipment.photos.length - 1)))}
                        style={StyleSheet.flatten([
                          styles.viewerAction,
                          {
                            backgroundColor: selectedPhotoIndex === shipment.photos.length - 1 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.18)',
                            borderColor: 'rgba(255,255,255,0.18)',
                          },
                        ])}
                      >
                        <Text style={styles.viewerActionText}>Next</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              </>
            ) : null}
          </View>
        </Modal>
      </>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.base, paddingBottom: Spacing['4xl'] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1, marginRight: Spacing.sm },
  vin: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.xs },
  vehicle: { fontSize: Typography.fontSize.base, marginBottom: Spacing.xs },
  customer: { fontSize: Typography.fontSize.sm },
  summaryMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.base },
  metricChip: {
    minWidth: 92,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  metricLabel: {
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  metricValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, marginBottom: Spacing.sm },
  sectionText: { fontSize: Typography.fontSize.sm, lineHeight: 20, marginBottom: Spacing.base },
  info: { gap: Spacing.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.base },
  label: { fontSize: Typography.fontSize.sm, flex: 1 },
  value: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium, flex: 1, textAlign: 'right' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  photoCell: { width: '47%' },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  photoCaption: { fontSize: Typography.fontSize.xs, lineHeight: 18 },
  notes: { fontSize: Typography.fontSize.sm, lineHeight: 20, marginTop: Spacing.base },
  viewerOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.base,
  },
  viewerCloseButton: {
    position: 'absolute',
    top: Spacing['3xl'],
    right: Spacing.base,
    zIndex: 2,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    padding: Spacing.sm,
  },
  viewerHeader: {
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  viewerCounter: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.8,
  },
  viewerImage: {
    width: '100%',
    height: '62%',
  },
  viewerFooter: {
    marginTop: Spacing.base,
    gap: Spacing.base,
  },
  viewerCaption: {
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
    lineHeight: 22,
  },
  viewerActionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  viewerAction: {
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  viewerActionText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});