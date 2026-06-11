import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Toast } from "@/components/Toast";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

import { SHIPPING_COUNTRY_CODES_LOWER } from "@/constants/countries";
const COUNTRIES = SHIPPING_COUNTRY_CODES_LOWER;
const COD_KEYS = ['cod1','cod2','cod3','cod4','cod5','cod6','cod7','cod8','cod9','cod10','cod11','cod12','cod13','cod14','cod15','cod16','cod17','cod18','cod19','cod20'];

export default function AdminEditCouponScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { row } = route.params;
  const isRTL = language === "ar";

  const [country, setCountry] = useState<string>((row.country || "dz").toLowerCase());
  const [value, setValue] = useState<string>(row.value || "");
  const [couponTitle, setCouponTitle] = useState<string>(row.couponTitle || "");
  const [codes, setCodes] = useState<string[]>(
    COD_KEYS.map(k => row[k] || "")
  );
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" as "success" | "error" });

  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ visible: true, message, type });

  const handleSave = async () => {
    if (!value.trim()) { showToast(t("coupon_value_label"), "error"); return; }
    setIsSubmitting(true);
    try {
      const apiUrl = getApiUrl();
      const body: Record<string, string | null> = {
        country, value,
        couponTitle: couponTitle.trim() || null,
      };
      COD_KEYS.forEach((k, i) => { body[k] = codes[i].trim() || null; });
      const res = await fetch(new URL(`/api/admin/coupon-codes/${row.id}`, apiUrl).href, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      showToast(t("changes_saved"));
      setTimeout(() => navigation.goBack(), 1200);
    } catch {
      showToast(t("error"), "error");
    } finally {
      setIsSubmitting(false);
    }
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
            value={couponTitle}
            onChangeText={setCouponTitle}
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        {/* Country */}
        <View style={styles.fieldContainer}>
          <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>{t("country_code")}</ThemedText>
          <Pressable
            style={[styles.countryBtn, { backgroundColor: AppColors.primary }]}
            onPress={() => setShowCountryPicker(true)}
          >
            <ThemedText type="body" style={{ color: "#fff", fontWeight: "700" }}>{country.toUpperCase()}</ThemedText>
            <Feather name="chevron-down" size={16} color="#fff" />
          </Pressable>
        </View>

        {/* Value */}
        <View style={styles.fieldContainer}>
          <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>{t("coupon_value_label")}</ThemedText>
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
            value={value}
            onChangeText={setValue}
            placeholder="e.g. 4/30$"
            placeholderTextColor={theme.textSecondary}
            textAlign={isRTL ? "right" : "left"}
          />
        </View>

        {/* Codes */}
        {COD_KEYS.map((key, i) => (
          <View key={key} style={styles.fieldContainer}>
            <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>Code {i + 1}</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
              value={codes[i]}
              onChangeText={(v) => setCodes(prev => { const next = [...prev]; next[i] = v; return next; })}
              placeholder={`Code ${i + 1}...`}
              placeholderTextColor={theme.textSecondary}
              textAlign={isRTL ? "right" : "left"}
            />
          </View>
        ))}
      </ScrollView>

      <View style={[styles.bottomBtns, { paddingBottom: insets.bottom + Spacing.md, backgroundColor: theme.backgroundRoot, borderTopColor: theme.border }]}>
        <Pressable style={[styles.btn, { backgroundColor: AppColors.primary, opacity: isSubmitting ? 0.7 : 1 }]} onPress={handleSave} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="save" size={18} color="#fff" />}
          <ThemedText type="body" style={{ color: "#fff", fontWeight: "700" }}>{t("changes_saved")}</ThemedText>
        </Pressable>
      </View>

      </KeyboardAvoidingView>

      <Modal visible={showCountryPicker} transparent animationType="fade" onRequestClose={() => setShowCountryPicker(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowCountryPicker(false)}>
          <View style={[styles.pickerCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            <ThemedText type="h4" style={{ padding: Spacing.md, textAlign: "center" }}>{t("select_country")}</ThemedText>
            {COUNTRIES.map((cc) => (
              <Pressable
                key={cc}
                style={[styles.pickerItem, { borderColor: theme.border }, country === cc && { backgroundColor: `${AppColors.primary}15` }]}
                onPress={() => { setCountry(cc); setShowCountryPicker(false); }}
              >
                <ThemedText type="body" style={{ color: country === cc ? AppColors.primary : theme.text, fontWeight: country === cc ? "700" : "400" }}>
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
  fieldContainer: { marginBottom: Spacing.md },
  label: { marginBottom: Spacing.xs, fontSize: 12 },
  input: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: 15 },
  countryBtn: {
    borderRadius: BorderRadius.md, padding: Spacing.md,
    flexDirection: "row", alignItems: "center", gap: Spacing.xs, justifyContent: "center",
  },
  bottomBtns: {
    padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md,
  },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: Spacing.xl },
  pickerCard: { width: "100%", borderRadius: BorderRadius.xl, borderWidth: 1, overflow: "hidden" },
  pickerItem: { padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, alignItems: "center" },
});
