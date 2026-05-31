import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { AppTopBar } from './AppTopBar';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Spacing, BorderRadius } from '../../constants/spacing';

type WorkspaceHubItem = {
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
};

type WorkspaceHubSection = {
  title: string;
  caption: string;
  items: WorkspaceHubItem[];
};

interface WorkspaceHubProps {
  title: string;
  subtitle: string;
  roleLabel: string;
  name: string;
  email: string;
  loginCode?: string;
  sections: WorkspaceHubSection[];
  footer?: React.ReactNode;
}

export const WorkspaceHub: React.FC<WorkspaceHubProps> = ({
  title,
  subtitle,
  roleLabel,
  name,
  email,
  loginCode,
  sections,
  footer,
}) => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppTopBar section={title} detail={roleLabel} hideWorkspace />

        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>JACXI WORKSPACE</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        </View>

        <Card style={[styles.heroCard, { borderColor: `${colors.accent}35` }]}> 
          <View style={[styles.heroGlow, { backgroundColor: `${colors.accent}16` }]} />
          <View style={styles.heroContent}>
            <View style={styles.identityRow}>
              <Avatar name={name} size={68} />
              <View style={styles.identityText}>
                <Text style={[styles.name, { color: colors.textPrimary }]}>{name}</Text>
                <Text style={[styles.email, { color: colors.textSecondary }]}>{email}</Text>
                <View style={[styles.roleBadge, { backgroundColor: `${colors.accent}18`, borderColor: `${colors.accent}40` }]}>
                  <Text style={[styles.roleBadgeText, { color: colors.accent }]}>{roleLabel}</Text>
                </View>
              </View>
            </View>

            {loginCode ? (
              <View style={[styles.loginCodeCard, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}> 
                <Text style={[styles.loginCodeLabel, { color: colors.textSecondary }]}>Portal access code</Text>
                <Text style={[styles.loginCodeValue, { color: colors.textPrimary }]}>{loginCode}</Text>
              </View>
            ) : null}
          </View>
        </Card>

        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{section.title}</Text>
              <Text style={[styles.sectionCaption, { color: colors.textSecondary }]}>{section.caption}</Text>
            </View>

            <View style={styles.grid}>
              {section.items.map((item) => (
                <TouchableOpacity
                  key={item.title}
                  style={styles.gridItem}
                  activeOpacity={0.9}
                  onPress={item.onPress}
                >
                  <Card style={[styles.actionCard, { backgroundColor: colors.panel }]}> 
                    <View style={[styles.iconBadge, { backgroundColor: colors.accentSoft, borderColor: `${colors.accent}30` }]}> 
                      <Text style={styles.iconText}>{item.icon}</Text>
                    </View>
                    <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                    <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>{item.description}</Text>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {footer}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.base,
    paddingBottom: Spacing['4xl'],
  },
  header: {
    marginBottom: Spacing.lg,
  },
  eyebrow: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 1.2,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    lineHeight: 22,
  },
  heroCard: {
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    padding: 0,
  },
  heroGlow: {
    height: 6,
    width: '100%',
  },
  heroContent: {
    padding: Spacing.lg,
    gap: Spacing.base,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  identityText: {
    flex: 1,
  },
  name: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  email: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.sm,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  roleBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  loginCodeCard: {
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
  },
  loginCodeLabel: {
    fontSize: Typography.fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
  },
  loginCodeValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 1.4,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  sectionCaption: {
    fontSize: Typography.fontSize.sm,
  },
  grid: {
    gap: Spacing.sm,
  },
  gridItem: {
    width: '100%',
  },
  actionCard: {
    minHeight: 118,
    justifyContent: 'space-between',
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  iconText: {
    fontSize: 13,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.6,
  },
  actionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  actionDescription: {
    fontSize: Typography.fontSize.sm,
    lineHeight: 20,
  },
});