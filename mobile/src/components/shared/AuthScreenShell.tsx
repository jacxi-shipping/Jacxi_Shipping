import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppTopBar } from './AppTopBar';
import { Card } from '../ui/Card';
import { Colors } from '../../constants/colors';
import { BorderRadius, Spacing } from '../../constants/spacing';
import { Typography } from '../../constants/typography';

interface AuthScreenShellProps {
  section: string;
  detail: string;
  title: string;
  description: string;
  icon: string;
  showBack?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export const AuthScreenShell: React.FC<AuthScreenShellProps> = ({
  section,
  detail,
  title,
  description,
  icon,
  showBack = false,
  children,
  footer,
}) => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppTopBar
            section={section}
            detail={detail}
            showBack={showBack}
            hideNotifications
            hideWorkspace
          />

          <Card style={[styles.heroCard, { borderColor: `${colors.accent}35` }]}> 
            <View style={[styles.heroBadge, { backgroundColor: colors.accentSoft, borderColor: `${colors.accent}35` }]}> 
              <Text style={[styles.heroBadgeText, { color: colors.accent }]}>{icon}</Text>
            </View>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>JACXI ACCESS</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
          </Card>

          <Card style={styles.formCard}>{children}</Card>

          {footer}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: Spacing.base,
    paddingBottom: Spacing['4xl'],
    justifyContent: 'center',
  },
  heroCard: {
    marginBottom: Spacing.base,
    alignItems: 'center',
  },
  heroBadge: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  heroBadgeText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.8,
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
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: Typography.fontSize.base,
    lineHeight: 22,
    textAlign: 'center',
  },
  formCard: {
    marginBottom: Spacing.base,
  },
});