import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Toast } from "@/components/Toast";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { AdminToolbar } from "@/components/AdminToolbar";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getSettings } from "@/lib/storage";
import { getApiUrl } from "@/lib/query-client";

const COD_KEYS = ['cod1','cod2','cod3','cod4','cod5','cod6','cod7','cod8','cod9','cod10','cod11','cod12','cod13','cod14','cod15','cod16','cod17','cod18','cod19','cod20'];


export default function CouponCodesScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const navigation = useNavigation<any>();

  const [selectedCoupon, setSelectedCoupon] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" as "success" | "error" | "info" });
  const [country, setCountry] = useState<string | null>(null);
  const previousCountryRef = useRef<string | null>(null);
  const [deleteRowTarget, setDeleteRowTarget] = useState<number | null>(null);
  const [deleteCodeTarget, setDeleteCodeTarget] = useState<{ rowId: number; codKey: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadInitialCountry = async () => {
      const s = await getSettings();
      const cc = s.country || "DZ";
      previousCountryRef.current = cc;
      setCountry(cc);
    };
    loadInitialCountry();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const checkAndUpdate = async () => {
        const s = await getSettings();
        const cc = s.country || "DZ";
        if (cc !== previousCountryRef.current) {
          previousCountryRef.current = cc;
          setSelectedCoupon(null);
          setCountry(cc);
          queryClient.invalidateQueries({ queryKey: ["/api/coupon-codes"] });
        } else {
          queryClient.invalidateQueries({ queryKey: ["/api/coupon-codes", cc] });
        }
      };
      checkAndUpdate();
    }, [queryClient])
  );

  const { data: coupons = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/coupon-codes", country],
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const res = await fetch(new URL(`/api/coupon-codes?country=${country}`, apiUrl).href);
      if (!res.ok) throw new Error("Failed to fetch coupon codes");
      return res.json();
    },
    enabled: country !== null,
    staleTime: 0,
    refetchInterval: 30_000,
  });

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ visible: true, message, type });
  };

  const handleCopy = async (code: string) => {
    await Clipboard.setStringAsync(code);
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    showToast(t("copied_to_clipboard"), "success");
  };

  const handleDeleteRowConfirm = async () => {
    if (deleteRowTarget === null) return;
    setIsDeleting(true);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(new URL(`/api/admin/coupon-codes/${deleteRowTarget}`, apiUrl).href, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast(t("entry_deleted"));
      queryClient.invalidateQueries({ queryKey: ["/api/coupon-codes"] });
    } catch {
      showToast(t("error"), "error");
    } finally {
      setIsDeleting(false);
      setDeleteRowTarget(null);
    }
  };

  const handleDeleteCodeConfirm = async () => {
    if (deleteCodeTarget === null) return;
    setIsDeleting(true);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(new URL(`/api/admin/coupon-codes/${deleteCodeTarget.rowId}/cod/${deleteCodeTarget.codKey}`, apiUrl).href, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast(t("entry_deleted"));
      queryClient.invalidateQueries({ queryKey: ["/api/coupon-codes"] });
    } catch {
      showToast(t("error"), "error");
    } finally {
      setIsDeleting(false);
      setDeleteCodeTarget(null);
    }
  };

  const handleClean = async () => {
    const apiUrl = getApiUrl();
    const res = await fetch(new URL("/api/admin/coupon-codes/all", apiUrl).href, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to clean");
    showToast(t("table_cleaned"));
    queryClient.invalidateQueries({ queryKey: ["/api/coupon-codes"] });
  };

  const parseCouponAmount = (value: string): number => {
    const match = value.match(/\/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const couponValues = coupons
    .filter(row => !!row.value)
    .map(row => ({ value: row.value as string, row }))
    .sort((a, b) => parseCouponAmount(a.value) - parseCouponAmount(b.value));

  const getPromoCodes = (row: any): { key: string; code: string }[] =>
    COD_KEYS.map(k => ({ key: k, code: row[k] })).filter(item => !!item.code);

  return (
    <ThemedView style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />
      <LoadingOverlay visible={isLoading || country === null} />

      <ConfirmDeleteModal
        visible={deleteRowTarget !== null}
        message={t("delete_confirm_msg")}
        isLoading={isDeleting}
        onConfirm={handleDeleteRowConfirm}
        onCancel={() => setDeleteRowTarget(null)}
      />

      <ConfirmDeleteModal
        visible={deleteCodeTarget !== null}
        message={t("delete_confirm_code_msg")}
        isLoading={isDeleting}
        onConfirm={handleDeleteCodeConfirm}
        onCancel={() => setDeleteCodeTarget(null)}
      />

      {isAdmin && (
        <View style={{ marginTop: Spacing.md }}>
          <AdminToolbar
            editMode={editMode}
            onToggleEdit={() => setEditMode(p => !p)}
            onAdd={() => navigation.navigate("AdminAddCoupon")}
            onClean={handleClean}
          />
        </View>
      )}

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.xl }]}>
        <View style={styles.section}>
          <View style={[styles.sectionHeader, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
            <Feather name="tag" size={18} color={AppColors.primary} />
            <ThemedText type="h4" style={styles.sectionTitle}>{t("select_coupon_value")}</ThemedText>
          </View>

          <View style={styles.optionsContainer}>
            {couponValues.map((item, idx) => {
              const isSelected = selectedCoupon === item.value;
              const promoCodes = getPromoCodes(item.row);

              return (
                <View key={idx} style={styles.couponGroup}>
                  <View style={[styles.optionRow, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.option,
                        {
                          flex: 1,
                          backgroundColor: isSelected ? `${AppColors.primary}15` : theme.backgroundDefault,
                          borderColor: isSelected ? AppColors.primary : theme.border,
                          flexDirection: language === 'ar' ? 'row-reverse' : 'row',
                        },
                        pressed && styles.pressed,
                      ]}
                      onPress={() => setSelectedCoupon(isSelected ? null : item.value)}
                    >
                      <ThemedText style={isSelected ? { color: AppColors.primary, fontWeight: '700' } : undefined}>
                        {item.value}
                      </ThemedText>
                      <Feather
                        name={isSelected ? "chevron-up" : "chevron-down"}
                        size={18}
                        color={isSelected ? AppColors.primary : theme.textSecondary}
                      />
                    </Pressable>

                    {editMode && isAdmin && (
                      <View style={{ flexDirection: "row", gap: Spacing.xs }}>
                        <Pressable
                          style={[styles.actionBtn, { backgroundColor: `${AppColors.primary}15` }]}
                          onPress={() => navigation.navigate("AdminEditCoupon", { row: item.row })}
                          testID={`button-edit-coupon-${item.row.id}`}
                        >
                          <Feather name="edit-2" size={16} color={AppColors.primary} />
                        </Pressable>
                        <Pressable
                          style={[styles.actionBtn, { backgroundColor: `${AppColors.error}15` }]}
                          onPress={() => setDeleteRowTarget(item.row.id)}
                          testID={`button-delete-coupon-${item.row.id}`}
                        >
                          <Feather name="trash-2" size={16} color={AppColors.error} />
                        </Pressable>
                      </View>
                    )}
                  </View>

                  {isSelected ? (
                    <View style={[
                      styles.codesList,
                      {
                        [language === 'ar' ? 'borderRightColor' : 'borderLeftColor']: AppColors.primary,
                        [language === 'ar' ? 'borderRightWidth' : 'borderLeftWidth']: 2,
                        [language === 'ar' ? 'marginRight' : 'marginLeft']: Spacing.lg,
                        [language === 'ar' ? 'paddingRight' : 'paddingLeft']: Spacing.md,
                      },
                    ]}>
                      {item.row.couponTitle ? (
                        <ThemedText
                          type="caption"
                          style={[styles.couponTitleText, { color: theme.textSecondary, textAlign: language === 'ar' ? 'right' : 'left' }]}
                        >
                          {item.row.couponTitle}
                        </ThemedText>
                      ) : null}
                      {promoCodes.length > 0 ? promoCodes.map((item2, pIdx) => (
                        <View
                          key={pIdx}
                          style={[
                            styles.codeCard,
                            {
                              backgroundColor: theme.backgroundDefault,
                              borderColor: theme.border,
                              flexDirection: language === 'ar' ? 'row-reverse' : 'row',
                            },
                          ]}
                        >
                          <Pressable
                            style={{ flex: 1, flexDirection: language === 'ar' ? 'row-reverse' : 'row', alignItems: 'center', gap: Spacing.sm }}
                            onPress={() => handleCopy(item2.code)}
                          >
                            <ThemedText type="body" style={styles.codeText}>{item2.code}</ThemedText>
                            <Feather name="copy" size={16} color={theme.textSecondary} />
                          </Pressable>
                          {editMode && isAdmin ? (
                            <Pressable
                              style={styles.codeDeleteBtn}
                              onPress={() => setDeleteCodeTarget({ rowId: item.row.id, codKey: item2.key })}
                              testID={`button-delete-code-${item.row.id}-${item2.key}`}
                            >
                              <Feather name="x" size={14} color={AppColors.error} />
                            </Pressable>
                          ) : null}
                        </View>
                      )) : (
                        <ThemedText type="small" style={styles.emptyText}>
                          {t("no_promo_codes")}
                        </ThemedText>
                      )}
                    </View>
                  ) : null}
                </View>
              );
            })}

            {couponValues.length === 0 && !isLoading && country !== null ? (
              <ThemedText type="body" style={styles.emptyText}>
                {t("no_promo_codes")}
              </ThemedText>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg },
  section: { marginBottom: Spacing.xl },
  sectionHeader: { alignItems: "center", marginBottom: Spacing.md },
  sectionTitle: { marginHorizontal: Spacing.sm },
  optionsContainer: { gap: Spacing.md },
  couponGroup: { gap: Spacing.sm },
  optionRow: { gap: Spacing.sm, alignItems: "center" },
  option: {
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  actionBtn: {
    padding: Spacing.sm, borderRadius: BorderRadius.md, justifyContent: "center", alignItems: "center",
  },
  codesList: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  codeCard: {
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  codeText: { fontWeight: "600", fontSize: 15 },
  codeDeleteBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: `${AppColors.error}15`,
  },
  emptyText: { color: "#999", textAlign: "center", padding: Spacing.md },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  couponTitleText: { fontSize: 12, fontStyle: "italic", marginBottom: Spacing.xs },
});
