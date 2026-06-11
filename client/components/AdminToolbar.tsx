import React, { useState } from "react";
import { View, StyleSheet, Pressable, Modal, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";

interface Props {
  editMode: boolean;
  onToggleEdit: () => void;
  onAdd: () => void;
  onClean: () => Promise<void>;
}

export function AdminToolbar({ editMode, onToggleEdit, onAdd, onClean }: Props) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const handleClean = async () => {
    setIsCleaning(true);
    try {
      await onClean();
    } finally {
      setIsCleaning(false);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <View style={[styles.toolbar, { backgroundColor: `${AppColors.primary}10`, borderColor: `${AppColors.primary}30` }]}>
        <Pressable
          style={[styles.btn, editMode && { backgroundColor: AppColors.primary }]}
          onPress={onToggleEdit}
        >
          <Feather name="edit-2" size={16} color={editMode ? "#fff" : AppColors.primary} />
          <ThemedText type="small" style={{ color: editMode ? "#fff" : AppColors.primary, fontWeight: "700" }}>
            {t("edit")}
          </ThemedText>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: `${AppColors.primary}30` }]} />

        <Pressable style={styles.btn} onPress={onAdd}>
          <Feather name="plus" size={16} color={AppColors.primary} />
          <ThemedText type="small" style={{ color: AppColors.primary, fontWeight: "700" }}>
            {t("add")}
          </ThemedText>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: `${AppColors.primary}30` }]} />

        <Pressable style={styles.btn} onPress={() => setShowConfirm(true)}>
          <Feather name="trash-2" size={16} color={AppColors.error} />
          <ThemedText type="small" style={{ color: AppColors.error, fontWeight: "700" }}>
            {t("clean")}
          </ThemedText>
        </Pressable>
      </View>

      <Modal visible={showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(false)}>
        <Pressable style={styles.overlay} onPress={() => !isCleaning && setShowConfirm(false)}>
          <Pressable style={[styles.confirmCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]} onPress={() => {}}>
            <Feather name="alert-triangle" size={32} color={AppColors.error} />
            <ThemedText type="h4" style={{ textAlign: "center", color: AppColors.error }}>{t("clean_confirm_title")}</ThemedText>
            <ThemedText type="body" style={{ textAlign: "center", color: theme.textSecondary }}>{t("clean_confirm_msg")}</ThemedText>
            <View style={styles.confirmBtns}>
              <Pressable
                style={[styles.confirmBtn, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, borderWidth: 1 }]}
                onPress={() => setShowConfirm(false)}
                disabled={isCleaning}
              >
                <ThemedText type="body" style={{ fontWeight: "600" }}>{t("no")}</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, { backgroundColor: AppColors.error, opacity: isCleaning ? 0.7 : 1 }]}
                onPress={handleClean}
                disabled={isCleaning}
              >
                {isCleaning ? <ActivityIndicator size="small" color="#fff" /> : <ThemedText type="body" style={{ color: "#fff", fontWeight: "700" }}>{t("yes")}</ThemedText>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  btn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: Spacing.xs, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs,
  },
  divider: { width: 1 },
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: Spacing.xl,
  },
  confirmCard: {
    width: "100%", borderRadius: BorderRadius.xl, borderWidth: 1,
    padding: Spacing.xl, gap: Spacing.md, alignItems: "center",
  },
  confirmBtns: { flexDirection: "row", gap: Spacing.md, width: "100%" },
  confirmBtn: { flex: 1, padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: "center", justifyContent: "center" },
});
