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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
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

interface OffreEntry {
  title: string; price: string; sellerCoupon: string;
  productUrl: string; info: string; country: string; currentPrice: string; imageUrl: string;
}
function emptyEntry(): OffreEntry {
  return { title: "", price: "", sellerCoupon: "", productUrl: "", info: "", country: "dz", currentPrice: "", imageUrl: "" };
}

export default function AdminAddOffreScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const navigation = useNavigation();
  const isRTL = language === "ar";

  const [current, setCurrent] = useState<OffreEntry>(emptyEntry());
  const [pending, setPending] = useState<OffreEntry[]>([]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" as "success" | "error" });

  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ visible: true, message, type });

  const handleSave = () => {
    setPending(prev => [...prev, { ...current }]);
    setCurrent(emptyEntry());
    showToast(t("entry_added"));
  };

  const handleAdd = async () => {
    if (pending.length === 0) { showToast(t("no_pending"), "error"); return; }
    setIsSubmitting(true);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(new URL("/api/admin/offres/bulk", apiUrl).href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: pending }),
      });
      if (!res.ok) throw new Error();
      showToast(t("changes_saved"));
      setPending([]);
      setTimeout(() => navigation.goBack(), 1200);
    } catch {
      showToast(t("error"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fields: { field: keyof OffreEntry; label: string; placeholder: string; multiline?: boolean }[] = [
    { field: "title", label: "Title", placeholder: "Product title..." },
    { field: "price", label: "Price (final/trending)", placeholder: "e.g. 12.99$" },
    { field: "currentPrice", label: "Current Price (for coupon matching)", placeholder: "e.g. 15.00$" },
    { field: "sellerCoupon", label: "Seller Coupon", placeholder: "e.g. 2.00$" },
    { field: "productUrl", label: "Product URL", placeholder: "https://..." },
    { field: "imageUrl", label: "Image URL (optional)", placeholder: "https://..." },
    { field: "info", label: "Info", placeholder: "Additional info...", multiline: true },
  ];

  return (
    <ThemedView style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast(p => ({ ...p, visible: false }))} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={headerHeight}
      >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: insets.bottom + (Platform.OS === "android" ? 340 : 100) }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Country selector */}
        <View style={styles.fieldContainer}>
          <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>{t("country_code")}</ThemedText>
          <Pressable
            style={[styles.countryBtn, { backgroundColor: AppColors.primary }]}
            onPress={() => setShowCountryPicker(true)}
          >
            <ThemedText type="body" style={{ color: "#fff", fontWeight: "700" }}>{current.country.toUpperCase()}</ThemedText>
            <Feather name="chevron-down" size={16} color="#fff" />
          </Pressable>
        </View>

        {fields.map(({ field, label, placeholder, multiline }) => (
          <View key={field} style={styles.fieldContainer}>
            <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>{label}</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
              value={current[field]}
              onChangeText={(v) => setCurrent(prev => ({ ...prev, [field]: v }))}
              placeholder={placeholder}
              placeholderTextColor={theme.textSecondary}
              multiline={multiline}
              numberOfLines={multiline ? 3 : 1}
              textAlign={isRTL ? "right" : "left"}
              textAlignVertical={multiline ? "top" : "center"}
            />
          </View>
        ))}

        {pending.length > 0 && (
          <View style={[styles.pendingBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
            <ThemedText type="caption" style={{ color: AppColors.primary, fontWeight: "600" }}>
              {pending.length} {t("pending_entries")}
            </ThemedText>
            {pending.map((e, i) => (
              <ThemedText key={i} type="small" style={{ color: theme.textSecondary }}>{e.country.toUpperCase()} — {e.title}</ThemedText>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBtns, { paddingBottom: insets.bottom + Spacing.md, backgroundColor: theme.backgroundRoot }]}>
        <Pressable style={[styles.btn, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, borderWidth: 1 }]} onPress={handleSave}>
          <Feather name="save" size={18} color={AppColors.primary} />
          <ThemedText type="body" style={{ color: AppColors.primary, fontWeight: "600" }}>{t("save_entry")}</ThemedText>
        </Pressable>
        <Pressable style={[styles.btn, { backgroundColor: AppColors.primary, opacity: isSubmitting ? 0.7 : 1 }]} onPress={handleAdd} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="plus-circle" size={18} color="#fff" />}
          <ThemedText type="body" style={{ color: "#fff", fontWeight: "700" }}>{t("add_entry")}</ThemedText>
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
                style={[styles.pickerItem, { borderColor: theme.border }, current.country === cc && { backgroundColor: `${AppColors.primary}15` }]}
                onPress={() => { setCurrent(prev => ({ ...prev, country: cc })); setShowCountryPicker(false); }}
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
  fieldContainer: { marginBottom: Spacing.md },
  label: { marginBottom: Spacing.xs, fontSize: 12 },
  input: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: 15 },
  countryBtn: {
    borderRadius: BorderRadius.md, padding: Spacing.md,
    flexDirection: "row", alignItems: "center", gap: Spacing.xs, justifyContent: "center",
  },
  pendingBox: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg },
  bottomBtns: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", gap: Spacing.md, padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  btn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md,
  },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: Spacing.xl },
  pickerCard: { width: "100%", borderRadius: BorderRadius.xl, borderWidth: 1, overflow: "hidden" },
  pickerItem: { padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, alignItems: "center" },
});
