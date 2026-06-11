import React from "react";
import { View, StyleSheet, Modal, Pressable, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";

interface Props {
  visible: boolean;
  message: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteModal({ visible, message, isLoading = false, onConfirm, onCancel }: Props) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => !isLoading && onCancel()}>
      <Pressable style={styles.overlay} onPress={() => !isLoading && onCancel()}>
        <Pressable
          style={[styles.card, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
          onPress={() => {}}
        >
          <Feather name="alert-triangle" size={32} color={AppColors.error} />
          <ThemedText type="h4" style={{ textAlign: "center", color: AppColors.error }}>
            {t("delete_confirm_title")}
          </ThemedText>
          <ThemedText type="body" style={{ textAlign: "center", color: theme.textSecondary }}>
            {message}
          </ThemedText>
          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, borderWidth: 1 }]}
              onPress={onCancel}
              disabled={isLoading}
            >
              <ThemedText type="body" style={{ fontWeight: "600" }}>{t("no")}</ThemedText>
            </Pressable>
            <Pressable
              style={[styles.btn, { backgroundColor: AppColors.error, opacity: isLoading ? 0.7 : 1 }]}
              onPress={onConfirm}
              disabled={isLoading}
            >
              {isLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <ThemedText type="body" style={{ color: "#fff", fontWeight: "700" }}>{t("yes")}</ThemedText>
              }
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  card: {
    width: "100%",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    gap: Spacing.md,
    alignItems: "center",
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.md,
    width: "100%",
  },
  btn: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
