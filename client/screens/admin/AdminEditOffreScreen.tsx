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
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Toast } from "@/components/Toast";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

import { SHIPPING_COUNTRY_CODES_LOWER } from "@/constants/countries";
const COUNTRIES = SHIPPING_COUNTRY_CODES_LOWER;

type RouteParams = {
  AdminEditOffre: {
    id: number; title: string; price: string; sellerCoupon: string;
    productUrl: string; info: string; country: string; currentPrice?: string; imageUrl?: string;
  };
};

export default function AdminEditOffreScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, "AdminEditOffre">>();
  const params = route.params;
  const isRTL = language === "ar";

  const [title, setTitle] = useState(params.title || "");
  const [price, setPrice] = useState(params.price || "");
  const [currentPrice, setCurrentPrice] = useState(params.currentPrice || "");
  const [sellerCoupon, setSellerCoupon] = useState(params.sellerCoupon || "");
  const [productUrl, setProductUrl] = useState(params.productUrl || "");
  const [info, setInfo] = useState(params.info || "");
  const [imageUrl, setImageUrl] = useState(params.imageUrl || "");
  const [country, setCountry] = useState((params.country || "dz").toLowerCase());
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" as "success" | "error" });

  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ visible: true, message, type });

  const handleApply = async () => {
    setIsSubmitting(true);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(new URL(`/api/admin/offres/${params.id}`, apiUrl).href, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, price, sellerCoupon, productUrl, info, country, currentPrice, imageUrl }),
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
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: insets.bottom + (Platform.OS === "android" ? 340 : 100) }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.fieldContainer}>
          <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>{t("country_code")}</ThemedText>
          <Pressable style={[styles.countryBtn, { backgroundColor: AppColors.primary }]} onPress={() => setShowCountryPicker(true)}>
            <ThemedText type="body" style={{ color: "#fff", fontWeight: "700" }}>{country.toUpperCase()}</ThemedText>
            <Feather name="chevron-down" size={16} color="#fff" />
          </Pressable>
        </View>

        {[
          { label: "Title", value: title, onChange: setTitle, placeholder: "Product title..." },
          { label: "Price (final/trending)", value: price, onChange: setPrice, placeholder: "12.99$" },
          { label: "Current Price (for coupon matching)", value: currentPrice, onChange: setCurrentPrice, placeholder: "15.00$" },
          { label: "Seller Coupon", value: sellerCoupon, onChange: setSellerCoupon, placeholder: "2.00$" },
          { label: "Product URL", value: productUrl, onChange: setProductUrl, placeholder: "https://..." },
          { label: "Image URL (optional)", value: imageUrl, onChange: setImageUrl, placeholder: "https://..." },
          { label: "Info", value: info, onChange: setInfo, placeholder: "Additional info...", multiline: true },
        ].map(({ label, value, onChange, placeholder, multiline }) => (
          <View key={label} style={styles.fieldContainer}>
            <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>{label}</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
              value={value}
              onChangeText={onChange}
              placeholder={placeholder}
              placeholderTextColor={theme.textSecondary}
              multiline={multiline}
              numberOfLines={multiline ? 3 : 1}
              textAlign={isRTL ? "right" : "left"}
              textAlignVertical={multiline ? "top" : "center"}
            />
          </View>
        ))}
      </ScrollView>

      <View style={[styles.bottomBtns, { paddingBottom: insets.bottom + Spacing.md, backgroundColor: theme.backgroundRoot }]}>
        <Pressable style={[styles.btn, { backgroundColor: AppColors.primary, opacity: isSubmitting ? 0.7 : 1 }]} onPress={handleApply} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="check" size={18} color="#fff" />}
          <ThemedText type="body" style={{ color: "#fff", fontWeight: "700" }}>{t("apply_changes")}</ThemedText>
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
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, borderTopWidth: StyleSheet.hairlineWidth,
  },
  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md,
  },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: Spacing.xl },
  pickerCard: { width: "100%", borderRadius: BorderRadius.xl, borderWidth: 1, overflow: "hidden" },
  pickerItem: { padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, alignItems: "center" },
});
