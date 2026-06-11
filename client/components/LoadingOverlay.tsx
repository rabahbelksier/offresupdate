import React from "react";
import { View, StyleSheet, ActivityIndicator, Modal, Platform } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { AppColors, Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  const { theme, isDark } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: isDark ? theme.border : "transparent",
            },
            Platform.OS === "ios" ? Shadows.lg : {},
          ]}
        >
          <View style={[styles.spinnerWrap, { backgroundColor: `${AppColors.primary}12` }]}>
            <ActivityIndicator size="large" color={AppColors.primary} />
          </View>
          {message ? (
            <ThemedText type="small" style={[styles.message, { color: theme.textSecondary }]}>
              {message}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    paddingVertical: Spacing["3xl"],
    paddingHorizontal: Spacing["4xl"],
    borderRadius: BorderRadius["2xl"],
    alignItems: "center",
    minWidth: 160,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      android: { elevation: 12 },
      web: { boxShadow: "0 8px 32px rgba(0,0,0,0.2)" },
    }),
  },
  spinnerWrap: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  message: {
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 20,
  },
});
