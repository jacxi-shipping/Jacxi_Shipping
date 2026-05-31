import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export async function triggerImpact(style: Haptics.ImpactFeedbackStyle) {
  if (Platform.OS === 'web') {
    return;
  }

  try {
    await Haptics.impactAsync(style);
  } catch {
    // Ignore unsupported haptic environments.
  }
}