import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Toast } from "@/components/Toast";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

import { SHIPPING_COUNTRY_CODES_LOWER } from "@/constants/countries";
const COUNTRIES = SHIPPING_COUNTRY_CODES_LOWER;
const CODE_FIELDS = ["cod1","cod2","cod3","cod4","cod5","cod6","cod7","cod8","cod9","cod10","cod11","cod12","cod13","cod14","cod15","cod16","cod17","cod18","cod19","cod20"] as const;

interface CouponEntry {
  country: string;
  value: string;
  couponTitle: string;
  cod1: string; cod2: string; cod3: string; cod4: string;
  cod5: string; cod6: string; cod7: string; cod8: string;
  cod9: string; cod10: string; cod11: string; cod12: string;
  cod13: string; cod14: string; cod15: string; cod16: string;
  cod17: string; cod18: string; cod19: string; cod20: string;
}

function emptyEntry(): CouponEntry {
  return {
    country: "dz", value: "", couponTitle: "",
    cod1:"", cod2:"", cod3:"", cod4:"", cod5:"", cod6:"",
    cod7:"", cod8:"", cod9:"", cod10:"", cod11:"", cod12:"",
    cod13:"", cod14:"", cod15:"", cod16:"", cod17:"", cod18:"", cod19:"", cod20:"",
  };
}

export default function AdminAddCouponScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const navigation = useNavigation();
  const isRTL = language === "ar";

  const [current, setCurrent] = useState<CouponEntry>(emptyEntry());
  const [pending, setPending] = useState<CouponEntry[]>([]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" as "success" | "error" });

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ visible: true, message, type });
  };

  const handleSave = () => {
    if (!current.value.trim()) {
      showToast(t("coupon_value_label"), "error");
      return;
    }
    setPending(prev => [...prev, { ...current }]);
    setCurrent(emptyEntry());
    showToast(t("entry_added"));
  };

  const handleAdd = async () => {
    const currentHasData = current.value.trim() || current.cod1.trim();
    const rowsToSend = currentHasData ? [...pending, { ...current }] : [...pending];
    if (rowsToSend.length === 0) { showToast(t("no_pending"), "error"); return; }
    setIsSubmitting(true);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(new URL("/api/admin/coupon-codes/bulk", apiUrl).href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: rowsToSend }),
      });
      if (!res.ok) throw new Error();
      showToast(t("changes_saved"));
      setPending([]);
      setCurrent(emptyEntry());
      setTimeout(() => navigation.goBack(), 1200);
    } catch {
      showToast(t("error"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof CouponEntry, value: string) => {
    setCurrent(prev => ({ ...prev, [field]: value }));
  };

  return (
    <ThemedView style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast(p => ({ ...p, visible: false }))} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={headerHeight}
      >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Platform.OS === "android" ? 340 : Spacing.xl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Coupon Title */}
        <View style={styles.fieldContainer}>
          <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>{t("coupon_title_label")}</ThemedText>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
            value={current.couponTitle}
            onChangeText={(v) => updateField("couponTitle", v)}
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        {/* Country + Value Row */}
        <View style={styles.topRow}>
          <View style={styles.valueContainer}>
            <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>{t("coupon_value_label")}</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
              value={current.value}
              onChangeText={(v) => updateField("value", v)}
              placeholder="4/30$"
              placeholderTextColor={theme.textSecondary}
              textAlign={isRTL ? "right" : "left"}
            />
          </View>
          <View style={styles.countryContainer}>
            <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>{t("country_code")}</ThemedText>
            <Pressable
              style={[styles.countryBtn, { backgroundColor: AppColors.primary }]}
              onPress={() => setShowCountryPicker(true)}
            >
              <ThemedText type="body" style={{ color: "#fff", fontWeight: "700" }}>{current.country.toUpperCase()}</ThemedText>
              <Feather name="chevron-down" size={16} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* 20 Code Fields in 3-column grid */}
        <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary, marginTop: Spacing.md }]}>
          {t("promo_code_n")}s (cod_1 - cod_20)
        </ThemedText>
        <View style={styles.codesGrid}>
          {CODE_FIELDS.map((field, idx) => (
            <TextInput
              key={field}
              style={[styles.codeInput, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
              value={current[field]}
              onChangeText={(v) => updateField(field, v)}
              placeholder={`${idx + 1}`}
              placeholderTextColor={theme.textSecondary}
              textAlign="center"
            />
          ))}
        </View>

        {/* Pending list */}
        {pending.length > 0 && (
          <View style={[styles.pendingBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
            <ThemedText type="caption" style={{ color: AppColors.primary, fontWeight: "600" }}>
              {pending.length} {t("pending_entries")}
            </ThemedText>
            {pending.map((entry, i) => (
              <View key={i} style={styles.pendingRow}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {entry.country.toUpperCase()} — {entry.value}
                </ThemedText>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBtns, { paddingBottom: insets.bottom + Spacing.md, backgroundColor: theme.backgroundRoot, borderTopColor: theme.border }]}>
        <Pressable
          style={[styles.btn, styles.saveBtn, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
          onPress={handleSave}
        >
          <Feather name="save" size={18} color={AppColors.primary} />
          <ThemedText type="body" style={{ color: AppColors.primary, fontWeight: "600" }}>{t("save_entry")}</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.addBtn, { opacity: isSubmitting ? 0.7 : 1 }]}
          onPress={handleAdd}
          disabled={isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="plus-circle" size={18} color="#fff" />}
          <ThemedText type="body" style={{ color: "#fff", fontWeight: "700" }}>{t("add_entry")}</ThemedText>
        </Pressable>
      </View>

      </KeyboardAvoidingView>

      {/* Country Picker Modal */}
      <Modal visible={showCountryPicker} transparent animationType="fade" onRequestClose={() => setShowCountryPicker(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowCountryPicker(false)}>
          <View style={[styles.pickerCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            <ThemedText type="h4" style={{ padding: Spacing.md, textAlign: "center" }}>{t("select_country")}</ThemedText>
            {COUNTRIES.map((cc) => (
              <Pressable
                key={cc}
                style={[styles.pickerItem, { borderColor: theme.border }, current.country === cc && { backgroundColor: `${AppColors.primary}15` }]}
                onPress={() => { updateField("country", cc); setShowCountryPicker(false); }}
              >
                <ThemedText type="body" style={{ color: current.country === cc ? AppColors.primary : theme.text, fontWeight: current.country === cc ? "700" : "400" }}>
                  {cc.toUpperCase()}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topRow: { flexDirection: "row", gap: Spacing.md, marginBottom: Spacing.xs },
  valueContainer: { flex: 1 },
  countryContainer: { width: 90, alignItems: "center" },
  label: { marginBottom: Spacing.xs, fontSize: 12 },
  fieldContainer: { marginBottom: Spacing.md },
  input: {
    borderWidth: 1, borderRadius: BorderRadius.md,
    padding: Spacing.md, fontSize: 15,
  },
  countryBtn: {
    borderRadius: BorderRadius.md, padding: Spacing.md,
    flexDirection: "row", alignItems: "center", gap: Spacing.xs,
    justifyContent: "center", width: "100%",
  },
  codesGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  codeInput: {
    width: "30%", borderWidth: 1, borderRadius: BorderRadius.md,
    padding: Spacing.sm, fontSize: 13, minHeight: 44,
  },
  pendingBox: {
    borderWidth: 1, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: Spacing.lg,
  },
  pendingRow: { paddingVertical: 2 },
  bottomBtns: {
    flexDirection: "row", gap: Spacing.md, padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  btn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md,
  },
  saveBtn: { borderWidth: 1 },
  addBtn: { backgroundColor: AppColors.primary },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: Spacing.xl },
  pickerCard: {
    width: "100%", borderRadius: BorderRadius.xl, borderWidth: 1, overflow: "hidden",
  },
  pickerItem: {
    padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
  },
});
