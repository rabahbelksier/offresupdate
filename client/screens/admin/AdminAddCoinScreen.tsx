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
import { useNavigation } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Toast } from "@/components/Toast";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface CoinEntry {
  title: string; title_en: string; title_fr: string; title_pt: string;
  link: string;
  info: string; info_en: string; info_fr: string; info_pt: string;
}
function emptyEntry(): CoinEntry {
  return { title: "", title_en: "", title_fr: "", title_pt: "", link: "", info: "", info_en: "", info_fr: "", info_pt: "" };
}

export default function AdminAddCoinScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const navigation = useNavigation();
  const isRTL = language === "ar";

  const [current, setCurrent] = useState<CoinEntry>(emptyEntry());
  const [pending, setPending] = useState<CoinEntry[]>([]);
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
    const currentHasData = current.title.trim() || current.link.trim();
    const rowsToSend = currentHasData ? [...pending, { ...current }] : [...pending];
    if (rowsToSend.length === 0) { showToast(t("no_pending"), "error"); return; }
    setIsSubmitting(true);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(new URL("/api/admin/coin/bulk", apiUrl).href, {
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

  const fields: { field: keyof CoinEntry; label: string; placeholder: string; multiline?: boolean }[] = [
    { field: "title",    label: "Title (AR)",   placeholder: "عنوان الزر..." },
    { field: "title_en", label: "Title (EN)",   placeholder: "Button title..." },
    { field: "title_fr", label: "Title (FR)",   placeholder: "Titre du bouton..." },
    { field: "title_pt", label: "Title (PT)",   placeholder: "Título do botão..." },
    { field: "link",     label: "Link",         placeholder: "https://..." },
    { field: "info",     label: "Info (AR)",    placeholder: "وصف...", multiline: true },
    { field: "info_en",  label: "Info (EN)",    placeholder: "Description...", multiline: true },
    { field: "info_fr",  label: "Info (FR)",    placeholder: "Description...", multiline: true },
    { field: "info_pt",  label: "Info (PT)",    placeholder: "Descrição...", multiline: true },
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
          {fields.map(({ field, label, placeholder, multiline }) => (
            <View key={field} style={styles.fieldContainer}>
              <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>{label}</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }, multiline && { minHeight: 80 }]}
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
                <ThemedText key={i} type="small" style={{ color: theme.textSecondary }}>{e.title}</ThemedText>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={[styles.bottomBtns, { paddingBottom: insets.bottom + Spacing.md, backgroundColor: theme.backgroundRoot, borderTopColor: theme.border }]}>
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fieldContainer: { marginBottom: Spacing.md },
  label: { marginBottom: Spacing.xs, fontSize: 12 },
  input: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: 15 },
  pendingBox: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg },
  bottomBtns: {
    flexDirection: "row", gap: Spacing.md, padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  btn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md,
  },
});
