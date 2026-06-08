import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Only trigger haptics on iOS
const isIOS = Platform.OS === 'ios';

export const haptics = {
  light: () => isIOS && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => isIOS && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => isIOS && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => isIOS && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  error: () => isIOS && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  selection: () => isIOS && Haptics.selectionAsync(),
};
