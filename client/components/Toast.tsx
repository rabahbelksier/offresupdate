import React, { useEffect } from "react";
import { StyleSheet, Platform, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";

interface ToastProps {
  visible: boolean;
  message: string;
  type?: "success" | "error" | "info";
  onHide: () => void;
  duration?: number;
}

export function Toast({
  visible,
  message,
  type = "success",
  onHide,
  duration = 2000,
}: ToastProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-100);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
      const timeout = setTimeout(() => {
        translateY.value = withDelay(
          0,
          withSpring(-100, { damping: 18 }, () => {
            runOnJS(onHide)();
          })
        );
      }, duration);
      return () => clearTimeout(timeout);
    }
  }, [visible, duration, onHide, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const getConfig = () => {
    switch (type) {
      case "success":
        return { icon: "check-circle" as const, color: AppColors.success, bg: isDark ? "rgba(52,199,89,0.12)" : "rgba(52,199,89,0.08)" };
      case "error":
        return { icon: "x-circle" as const, color: AppColors.error, bg: isDark ? "rgba(255,59,48,0.12)" : "rgba(255,59,48,0.08)" };
      case "info":
        return { icon: "info" as const, color: AppColors.primary, bg: isDark ? "rgba(255,106,0,0.12)" : "rgba(255,106,0,0.08)" };
      default:
        return { icon: "check-circle" as const, color: AppColors.success, bg: "transparent" };
    }
  };

  const config = getConfig();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + Spacing.md,
          backgroundColor: theme.backgroundDefault,
        },
        animatedStyle,
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: config.bg }]}>
        <Feather name={config.icon} size={18} color={config.color} />
      </View>
      <ThemedText type="small" style={[styles.message, { color: theme.text }]}>
        {message}
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xl,
    gap: Spacing.sm,
    zIndex: 1000,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
      },
    }),
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  message: {
    flex: 1,
    fontWeight: "500",
  },
});
