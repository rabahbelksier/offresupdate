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
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteParams = RouteProp<RootStackParamList, "AdminEditCoin">;

export default function AdminEditCoinScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const { id, title: initTitle, titleEn: initTitleEn, titleFr: initTitleFr, titlePt: initTitlePt,
          link: initLink, info: initInfo, infoEn: initInfoEn, infoFr: initInfoFr, infoPt: initInfoPt } = route.params;
  const isRTL = language === "ar";

  const [title,   setTitle]   = useState(initTitle   || "");
  const [titleEn, setTitleEn] = useState(initTitleEn || "");
  const [titleFr, setTitleFr] = useState(initTitleFr || "");
  const [titlePt, setTitlePt] = useState(initTitlePt || "");
  const [link,    setLink]    = useState(initLink     || "");
  const [info,    setInfo]    = useState(initInfo     || "");
  const [infoEn,  setInfoEn]  = useState(initInfoEn  || "");
  const [infoFr,  setInfoFr]  = useState(initInfoFr  || "");
  const [infoPt,  setInfoPt]  = useState(initInfoPt  || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" as "success" | "error" });

  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ visible: true, message, type });

  const handleApply = async () => {
    setIsSubmitting(true);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(new URL(`/api/admin/coin/${id}`, apiUrl).href, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, title_en: titleEn, title_fr: titleFr, title_pt: titlePt,
                               link, info, info_en: infoEn, info_fr: infoFr, info_pt: infoPt }),
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

  const fields: { label: string; value: string; onChange: (v: string) => void; placeholder: string; multiline?: boolean }[] = [
    { label: "Title (AR)",  value: title,   onChange: setTitle,   placeholder: "عنوان الزر..." },
    { label: "Title (EN)",  value: titleEn, onChange: setTitleEn, placeholder: "Button title..." },
    { label: "Title (FR)",  value: titleFr, onChange: setTitleFr, placeholder: "Titre du bouton..." },
    { label: "Title (PT)",  value: titlePt, onChange: setTitlePt, placeholder: "Título do botão..." },
    { label: "Link",        value: link,    onChange: setLink,    placeholder: "https://..." },
    { label: "Info (AR)",   value: info,    onChange: setInfo,    placeholder: "وصف...", multiline: true },
    { label: "Info (EN)",   value: infoEn,  onChange: setInfoEn,  placeholder: "Description...", multiline: true },
    { label: "Info (FR)",   value: infoFr,  onChange: setInfoFr,  placeholder: "Description...", multiline: true },
    { label: "Info (PT)",   value: infoPt,  onChange: setInfoPt,  placeholder: "Descrição...", multiline: true },
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
          {fields.map(({ label, value, onChange, placeholder, multiline }) => (
            <View key={label} style={styles.fieldContainer}>
              <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>{label}</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }, multiline && { minHeight: 80 }]}
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

        <View style={[styles.bottomBtns, { paddingBottom: insets.bottom + Spacing.md, backgroundColor: theme.backgroundRoot, borderTopColor: theme.border }]}>
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
  fieldContainer: { marginBottom: Spacing.md },
  label: { marginBottom: Spacing.xs, fontSize: 12 },
  input: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: 15 },
  bottomBtns: {
    padding: Spacing.lg, borderTopWidth: StyleSheet.hairlineWidth,
  },
  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md,
  },
});
