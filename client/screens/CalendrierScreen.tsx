import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";

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
import { Feather } from "@expo/vector-icons";

const SCREEN_WIDTH = Dimensions.get("window").width;
const SCREEN_HEIGHT = Dimensions.get("window").height;

interface CalendrierRow {
  id: number;
  title: string | null;
  linkImg: string | null;
  info: string | null;
  titleEn?: string | null;
  titleFr?: string | null;
  titlePt?: string | null;
  infoEn?: string | null;
  infoFr?: string | null;
  infoPt?: string | null;
}

function getLocalizedTitle(row: CalendrierRow, lang: string): string | null {
  if (lang === "ar") return row.title || row.titleEn || null;
  if (lang === "fr") return row.titleFr || row.titleEn || row.title || null;
  if (lang === "pt") return row.titlePt || row.titleEn || row.title || null;
  return row.titleEn || row.title || null;
}

function getLocalizedInfo(row: CalendrierRow, lang: string): string | null {
  if (lang === "ar") return row.info || row.infoEn || null;
  if (lang === "fr") return row.infoFr || row.infoEn || row.info || null;
  if (lang === "pt") return row.infoPt || row.infoEn || row.info || null;
  return row.infoEn || row.info || null;
}

export default function CalendrierScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { isAdmin } = useAuth();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const [editMode, setEditMode] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" as "success" | "error" });
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: rows = [], isLoading } = useQuery<CalendrierRow[]>({
    queryKey: ["/api/calendrier"],
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const res = await fetch(new URL("/api/calendrier", apiUrl).href);
      if (!res.ok) throw new Error("Failed to fetch calendrier");
      return res.json();
    },
    staleTime: 0,
    refetchInterval: 30_000,
  });

  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ visible: true, message, type });

  const handleDeleteConfirm = async () => {
    if (deleteTargetId === null) return;
    setIsDeleting(true);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(new URL(`/api/admin/calendrier/${deleteTargetId}`, apiUrl).href, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast(t("entry_deleted"));
      queryClient.invalidateQueries({ queryKey: ["/api/calendrier"] });
    } catch {
      showToast(t("error"), "error");
    } finally {
      setIsDeleting(false);
      setDeleteTargetId(null);
    }
  };

  const handleClean = async () => {
    const apiUrl = getApiUrl();
    const res = await fetch(new URL("/api/admin/calendrier/all", apiUrl).href, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to clean");
    showToast(t("table_cleaned"));
    queryClient.invalidateQueries({ queryKey: ["/api/calendrier"] });
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={AppColors.primary} />
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

      {isAdmin && (
        <View style={{ marginTop: Spacing.md }}>
          <AdminToolbar
            editMode={editMode}
            onToggleEdit={() => setEditMode(p => !p)}
            onAdd={() => navigation.navigate("AdminAddCalendrier")}
            onClean={handleClean}
          />
        </View>
      )}

      {rows.length === 0 && (
        <View style={styles.centered}>
          <Feather name="calendar" size={48} color={theme.textSecondary} />
          <ThemedText type="body" style={[styles.emptyText, { color: theme.textSecondary }]}>
            {t("no_calendrier_data")}
          </ThemedText>
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {rows.map((row) => (
          <View key={row.id} style={[styles.card, { borderBottomColor: theme.borderLight }]}>
            {editMode && isAdmin && (
              <View style={styles.editRow}>
                <Pressable
                  style={[styles.editBtn, { backgroundColor: `${AppColors.primary}15` }]}
                  onPress={() => navigation.navigate("AdminEditCalendrier", {
                    id: row.id,
                    title: row.title || "",
                    linkImg: row.linkImg || "",
                    info: row.info || "",
                    titleEn: row.titleEn || "",
                    titleFr: row.titleFr || "",
                    titlePt: row.titlePt || "",
                    infoEn: row.infoEn || "",
                    infoFr: row.infoFr || "",
                    infoPt: row.infoPt || "",
                  })}
                  testID={`button-edit-calendrier-${row.id}`}
                >
                  <Feather name="edit-2" size={16} color={AppColors.primary} />
                  <ThemedText type="small" style={{ color: AppColors.primary, fontWeight: "600" }}>{t("edit")}</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.editBtn, { backgroundColor: `${AppColors.error}15` }]}
                  onPress={() => setDeleteTargetId(row.id)}
                  testID={`button-delete-calendrier-${row.id}`}
                >
                  <Feather name="trash-2" size={16} color={AppColors.error} />
                  <ThemedText type="small" style={{ color: AppColors.error, fontWeight: "600" }}>{t("delete")}</ThemedText>
                </Pressable>
              </View>
            )}

            {!!getLocalizedTitle(row, language) && (
              <ThemedText type="h3" style={styles.title}>
                {getLocalizedTitle(row, language)}
              </ThemedText>
            )}

            {!!row.linkImg && (
              <Image
                source={{ uri: row.linkImg }}
                style={styles.image}
                contentFit="contain"
                transition={300}
              />
            )}

            {!!getLocalizedInfo(row, language) && (
              <ThemedText type="body" style={[styles.info, { color: theme.textSecondary }]}>
                {getLocalizedInfo(row, language)}
              </ThemedText>
            )}
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: Spacing.md,
  },
  card: {
    paddingVertical: Spacing.xl,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: Spacing.lg,
    alignItems: "center",
  },
  editRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  editBtn: {
    flexDirection: "row", alignItems: "center", gap: Spacing.xs,
    padding: Spacing.sm, borderRadius: BorderRadius.sm,
  },
  title: {
    textAlign: "center", color: AppColors.primary, paddingHorizontal: Spacing.lg,
  },
  image: {
    width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.72,
  },
  info: {
    textAlign: "center", lineHeight: 24, paddingHorizontal: Spacing.lg,
  },
  emptyText: { textAlign: "center", marginTop: Spacing.sm },
});
