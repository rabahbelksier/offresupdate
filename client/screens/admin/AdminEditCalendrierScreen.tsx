import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Toast } from "@/components/Toast";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

type RouteParams = {
  AdminEditCalendrier: {
    id: number;
    title: string;
    linkImg: string;
    info: string;
    titleEn?: string;
    titleFr?: string;
    titlePt?: string;
    infoEn?: string;
    infoFr?: string;
    infoPt?: string;
  };
};

export default function AdminEditCalendrierScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, "AdminEditCalendrier">>();
  const {
    id,
    title: initTitle,
    linkImg: initLinkImg,
    info: initInfo,
    titleEn: initTitleEn,
    titleFr: initTitleFr,
    titlePt: initTitlePt,
    infoEn: initInfoEn,
    infoFr: initInfoFr,
    infoPt: initInfoPt,
  } = route.params;
  const isRTL = language === "ar";

  const [title, setTitle] = useState(initTitle || "");
  const [linkImg, setLinkImg] = useState(initLinkImg || "");
  const [info, setInfo] = useState(initInfo || "");
  const [titleEn, setTitleEn] = useState(initTitleEn || "");
  const [titleFr, setTitleFr] = useState(initTitleFr || "");
  const [titlePt, setTitlePt] = useState(initTitlePt || "");
  const [infoEn, setInfoEn] = useState(initInfoEn || "");
  const [infoFr, setInfoFr] = useState(initInfoFr || "");
  const [infoPt, setInfoPt] = useState(initInfoPt || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" as "success" | "error" });

  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ visible: true, message, type });

  const handleApply = async () => {
    if (!titleEn.trim()) { showToast("English title is required", "error"); return; }
    if (!linkImg.trim()) { showToast("Image URL is required", "error"); return; }
    setIsSubmitting(true);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(new URL(`/api/admin/calendrier/${id}`, apiUrl).href, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, linkImg, info, titleEn, titleFr, titlePt, infoEn, infoFr, infoPt }),
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

  const REQUIRED_FIELDS = [
    { label: "Title (English) *", value: titleEn, onChange: setTitleEn, placeholder: "Event title in English...", multiline: false, rtl: false },
    { label: "Image URL *", value: linkImg, onChange: setLinkImg, placeholder: "https://...", multiline: false, rtl: false },
  ];

  const OPTIONAL_FIELDS = [
    { label: "Title (Arabic)", value: title, onChange: setTitle, placeholder: "عنوان الحدث بالعربية...", multiline: false, rtl: true },
    { label: "Title (French)", value: titleFr, onChange: setTitleFr, placeholder: "Titre en français...", multiline: false, rtl: false },
    { label: "Title (Portuguese)", value: titlePt, onChange: setTitlePt, placeholder: "Título em português...", multiline: false, rtl: false },
    { label: "Info (Arabic)", value: info, onChange: setInfo, placeholder: "وصف الحدث بالعربية...", multiline: true, rtl: true },
    { label: "Info (English)", value: infoEn, onChange: setInfoEn, placeholder: "Description in English...", multiline: true, rtl: false },
    { label: "Info (French)", value: infoFr, onChange: setInfoFr, placeholder: "Description en français...", multiline: true, rtl: false },
    { label: "Info (Portuguese)", value: infoPt, onChange: setInfoPt, placeholder: "Descrição em português...", multiline: true, rtl: false },
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
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Platform.OS === "android" ? 340 : Spacing.xl }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.sectionHeader, { borderColor: AppColors.primary + "40" }]}>
          <ThemedText type="caption" style={{ color: AppColors.primary, fontWeight: "700", fontSize: 11, letterSpacing: 0.5 }}>
            REQUIRED
          </ThemedText>
        </View>
        {REQUIRED_FIELDS.map(({ label, value, onChange, placeholder, multiline, rtl }) => (
          <View key={label} style={styles.fieldContainer}>
            <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>{label}</ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                multiline && styles.multilineInput,
              ]}
              value={value}
              onChangeText={onChange}
              placeholder={placeholder}
              placeholderTextColor={theme.textSecondary}
              multiline={multiline}
              numberOfLines={multiline ? 3 : 1}
              textAlign={isRTL && rtl ? "right" : "left"}
              textAlignVertical={multiline ? "top" : "center"}
            />
          </View>
        ))}

        <View style={[styles.sectionHeader, { borderColor: theme.border, marginTop: Spacing.sm }]}>
          <ThemedText type="caption" style={{ color: theme.textSecondary, fontWeight: "700", fontSize: 11, letterSpacing: 0.5 }}>
            OPTIONAL
          </ThemedText>
        </View>
        {OPTIONAL_FIELDS.map(({ label, value, onChange, placeholder, multiline, rtl }) => (
          <View key={label} style={styles.fieldContainer}>
            <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>{label}</ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                multiline && styles.multilineInput,
              ]}
              value={value}
              onChangeText={onChange}
              placeholder={placeholder}
              placeholderTextColor={theme.textSecondary}
              multiline={multiline}
              numberOfLines={multiline ? 3 : 1}
              textAlign={isRTL && rtl ? "right" : "left"}
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionHeader: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  fieldContainer: { marginBottom: Spacing.md },
  label: { marginBottom: Spacing.xs, fontSize: 12 },
  input: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: 15 },
  multilineInput: { minHeight: 80, textAlignVertical: "top" },
  bottomBtns: {
    padding: Spacing.lg, borderTopWidth: StyleSheet.hairlineWidth,
  },
  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md,
  },
});
