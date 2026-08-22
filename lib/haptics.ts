import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

function canHaptic() {
  return Platform.OS !== "web";
}

export const haptic = {
  light: () => canHaptic() && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => canHaptic() && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  success: () => canHaptic() && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => canHaptic() && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => canHaptic() && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};
