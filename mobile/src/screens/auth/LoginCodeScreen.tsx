import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Toast } from '../../components/ui/Toast';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';
import { Spacing } from '../../constants/spacing';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

const loginCodeSchema = z.object({
  loginCode: z.string().length(8, 'Login code must be 8 characters'),
});

type LoginCodeFormData = z.infer<typeof loginCodeSchema>;

type LoginCodeScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'LoginCode'>;
};

const LoginCodeScreen: React.FC<LoginCodeScreenProps> = ({ navigation }) => {
  const colorScheme = useColorScheme();
  const colors = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const { loginWithCode } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCodeFormData>({
    resolver: zodResolver(loginCodeSchema),
  });

  const onSubmit = async (data: LoginCodeFormData) => {
    try {
      setLoading(true);
      await loginWithCode(data.loginCode.toUpperCase());
    } catch (error: any) {
      setToastMessage(error.message || 'Invalid login code');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={[styles.backText, { color: colors.accent }]}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={[styles.icon, { color: colors.accent }]}>🔑</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Login Code</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Enter your 8-character login code to access your account
            </Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="loginCode"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Login Code"
                  placeholder="XXXXXXXX"
                  onChangeText={(text) => onChange(text.toUpperCase())}
                  onBlur={onBlur}
                  value={value}
                  error={errors.loginCode?.message}
                  autoCapitalize="characters"
                  autoComplete="off"
                  maxLength={8}
                  containerStyle={styles.input}
                />
              )}
            />

            <Button
              title="Sign In"
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              fullWidth
              style={styles.button}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Toast
        visible={showToast}
        message={toastMessage}
        type="error"
        onHide={() => setShowToast(false)}
      />
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
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.xl,
  },
  back: {
    marginBottom: Spacing.xl,
  },
  backText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  icon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: Typography.fontSize.base,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: Spacing.lg,
  },
  button: {
    marginTop: Spacing.lg,
  },
});

export default LoginCodeScreen;
