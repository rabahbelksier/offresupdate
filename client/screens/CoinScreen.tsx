import React, { useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as Linking from "expo-linking";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Toast } from "@/components/Toast";
import { AdminToolbar } from "@/components/AdminToolbar";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface CoinRow {
  id: number;
  title: string | null;
  title_en: string | null;
  title_fr: string | null;
  title_pt: string | null;
  link: string | null;
  info: string | null;
  info_en: string | null;
  info_fr: string | null;
  info_pt: string | null;
}

export default function CoinScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { t, language } = useLanguage();
  const { isAdmin } = useAuth();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const isRTL = language === "ar";

  const [modalInfo, setModalInfo] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" as "success" | "error" });
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: rows = [], isLoading } = useQuery<CoinRow[]>({
    queryKey: ["/api/coin"],
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const res = await fetch(new URL("/api/coin", apiUrl).href);
      if (!res.ok) throw new Error("Failed to fetch coin");
      return res.json();
    },
    staleTime: 0,
    refetchInterval: 30_000,
  });

  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ visible: true, message, type });

  const handlePress = async (link: string | null) => {
    if (!link) return;
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await Linking.openURL(link);
  };

  const handleInfo = async (info: string | null) => {
    if (!info) return;
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setModalInfo(info);
  };

  const handleDeleteConfirm = async () => {
    if (deleteTargetId === null) return;
    setIsDeleting(true);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(new URL(`/api/admin/coin/${deleteTargetId}`, apiUrl).href, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast(t("entry_deleted"));
      queryClient.invalidateQueries({ queryKey: ["/api/coin"] });
    } catch {
      showToast(t("error"), "error");
    } finally {
      setIsDeleting(false);
      setDeleteTargetId(null);
    }
  };

  const handleClean = async () => {
    const apiUrl = getApiUrl();
    const res = await fetch(new URL("/api/admin/coin/all", apiUrl).href, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to clean");
    showToast(t("table_cleaned"));
    queryClient.invalidateQueries({ queryKey: ["/api/coin"] });
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={AppColors.primary} />
      </ThemedView>
    );
  }

  if (rows.length === 0 && !isAdmin) {
    return (
      <ThemedView style={styles.centered}>
        <Feather name="circle" size={48} color={theme.textSecondary} />
        <ThemedText type="body" style={[styles.emptyText, { color: theme.textSecondary }]}>
          {t("no_coin_data")}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast(p => ({ ...p, visible: false }))} />

      <ConfirmDeleteModal
        visible={deleteTargetId !== null}
        message={t("delete_confirm_msg")}
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTargetId(null)}
      />

      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={isAdmin ? (
          <AdminToolbar
            editMode={editMode}
            onToggleEdit={() => setEditMode(p => !p)}
            onAdd={() => navigation.navigate("AdminAddCoin")}
            onClean={handleClean}
          />
        ) : null}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="circle" size={48} color={theme.textSecondary} />
            <ThemedText type="body" style={[styles.emptyText, { color: theme.textSecondary }]}>
              {t("no_coin_data")}
            </ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            {editMode && isAdmin && (
              <View style={[styles.editRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
                <Pressable
                  style={[styles.editBtn, { backgroundColor: `${AppColors.primary}15` }]}
                  onPress={() => navigation.navigate("AdminEditCoin", {
                    id: item.id,
                    title: item.title || "", titleEn: item.title_en || "", titleFr: item.title_fr || "", titlePt: item.title_pt || "",
                    link: item.link || "",
                    info: item.info || "", infoEn: item.info_en || "", infoFr: item.info_fr || "", infoPt: item.info_pt || "",
                  })}
                  testID={`button-edit-coin-${item.id}`}
                >
                  <Feather name="edit-2" size={14} color={AppColors.primary} />
                  <ThemedText type="small" style={{ color: AppColors.primary, fontWeight: "600" }}>{t("edit")}</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.editBtn, { backgroundColor: `${AppColors.error}15` }]}
                  onPress={() => setDeleteTargetId(item.id)}
                  testID={`button-delete-coin-${item.id}`}
                >
                  <Feather name="trash-2" size={14} color={AppColors.error} />
                  <ThemedText type="small" style={{ color: AppColors.error, fontWeight: "600" }}>{t("delete")}</ThemedText>
                </Pressable>
              </View>
            )}
            <View style={[styles.buttonRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Pressable
                style={({ pressed }) => [styles.mainButton, pressed && styles.pressed]}
                onPress={() => handlePress(item.link)}
                testID={`button-coin-${item.id}`}
              >
                <LinearGradient
                  colors={[AppColors.primary, "#E85D00"]}
                  style={styles.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Feather name="coins" size={18} color="#FFFFFF" />
                  <ThemedText type="body" style={styles.buttonText}>
                    {((language === "en" && item.title_en) ? item.title_en
                      : (language === "fr" && item.title_fr) ? item.title_fr
                      : (language === "pt" && item.title_pt) ? item.title_pt
                      : item.title)?.replace(/[\s?؟]+$/, "").trim() ?? t("open_link")}
                  </ThemedText>
                </LinearGradient>
              </Pressable>

              {!!(language === "en" ? item.info_en || item.info : language === "fr" ? item.info_fr || item.info : language === "pt" ? item.info_pt || item.info : item.info) && (
                <Pressable
                  style={({ pressed }) => [
                    styles.infoButton,
                    {
                      backgroundColor: isDark ? "rgba(255,106,0,0.12)" : "rgba(255,106,0,0.08)",
                      borderColor: isDark ? "rgba(255,106,0,0.3)" : AppColors.primary + "40",
                    },
                    pressed && styles.pressed,
                  ]}
                  onPress={() => handleInfo(language === "en" ? item.info_en || item.info : language === "fr" ? item.info_fr || item.info : language === "pt" ? item.info_pt || item.info : item.info)}
                  testID={`button-coin-info-${item.id}`}
                >
                  <Feather name="info" size={20} color={AppColors.primary} />
                </Pressable>
              )}
            </View>
          </View>
        )}
      />

      <Modal
        visible={modalInfo !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setModalInfo(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalInfo(null)}>
          <Pressable
            style={[styles.modalBox, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
            onPress={() => {}}
          >
            <View style={[styles.modalHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
              <Feather name="info" size={20} color={AppColors.primary} />
              <ThemedText type="h4" style={styles.modalTitle}>
                {t("details")}
              </ThemedText>
            </View>
            <ThemedText
              type="body"
              style={[styles.modalText, { textAlign: isRTL ? "right" : "left", color: theme.textSecondary }]}
            >
              {modalInfo}
            </ThemedText>
            <Pressable
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              onPress={() => setModalInfo(null)}
            >
              <ThemedText type="body" style={{ color: AppColors.primary, fontWeight: "600" }}>
                {t("confirm")}
              </ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.md },
  content: { padding: Spacing.lg, gap: Spacing.md },
  itemContainer: { gap: Spacing.sm, marginBottom: Spacing.md },
  editRow: { gap: Spacing.sm },
  editBtn: {
    flexDirection: "row", alignItems: "center", gap: Spacing.xs,
    padding: Spacing.sm, borderRadius: BorderRadius.sm, alignSelf: "flex-start",
  },
  buttonRow: { gap: Spacing.sm, alignItems: "stretch" },
  mainButton: { flex: 1, borderRadius: BorderRadius.lg, overflow: "hidden" },
  gradient: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: Spacing.sm, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  infoButton: {
    width: 52, borderRadius: BorderRadius.lg, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: Spacing.md },
  emptyText: { textAlign: "center", marginTop: Spacing.sm },
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center", justifyContent: "center", padding: Spacing.xl,
  },
  modalBox: {
    width: "100%", borderRadius: BorderRadius.xl, borderWidth: 1,
    padding: Spacing.xl, gap: Spacing.lg,
  },
  modalHeader: { alignItems: "center", gap: Spacing.sm },
  modalTitle: { color: AppColors.primary },
  modalText: { lineHeight: 26 },
  closeButton: { alignSelf: "center", paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xl },
});
