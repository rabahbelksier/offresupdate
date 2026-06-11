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

interface CalendrierEntry {
  title: string;
  linkImg: string;
  info: string;
  titleEn: string;
  titleFr: string;
  titlePt: string;
  infoEn: string;
  infoFr: string;
  infoPt: string;
}

function emptyEntry(): CalendrierEntry {
  return { title: "", linkImg: "", info: "", titleEn: "", titleFr: "", titlePt: "", infoEn: "", infoFr: "", infoPt: "" };
}

const REQUIRED_FIELDS = [
  { key: "titleEn", label: "Title (English) *", placeholder: "Event title in English...", multiline: false },
  { key: "linkImg", label: "Image URL *", placeholder: "https://...", multiline: false },
];

const OPTIONAL_FIELDS = [
  { key: "title", label: "Title (Arabic)", placeholder: "عنوان الحدث بالعربية...", multiline: false },
  { key: "titleFr", label: "Title (French)", placeholder: "Titre en français...", multiline: false },
  { key: "titlePt", label: "Title (Portuguese)", placeholder: "Título em português...", multiline: false },
  { key: "info", label: "Info (Arabic)", placeholder: "وصف الحدث بالعربية...", multiline: true },
  { key: "infoEn", label: "Info (English)", placeholder: "Description in English...", multiline: true },
  { key: "infoFr", label: "Info (French)", placeholder: "Description en français...", multiline: true },
  { key: "infoPt", label: "Info (Portuguese)", placeholder: "Descrição em português...", multiline: true },
];

export default function AdminAddCalendrierScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const navigation = useNavigation();
  const isRTL = language === "ar";

  const [current, setCurrent] = useState<CalendrierEntry>(emptyEntry());
  const [pending, setPending] = useState<CalendrierEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" as "success" | "error" });

  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ visible: true, message, type });

  const handleSave = () => {
    if (!current.titleEn.trim()) { showToast("English title is required", "error"); return; }
    if (!current.linkImg.trim()) { showToast("Image URL is required", "error"); return; }
    setPending(prev => [...prev, { ...current }]);
    setCurrent(emptyEntry());
    showToast(t("entry_added"));
  };

  const handleAdd = async () => {
    if (pending.length === 0) { showToast(t("no_pending"), "error"); return; }
    setIsSubmitting(true);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(new URL("/api/admin/calendrier/bulk", apiUrl).href, {
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

  const renderField = (key: string, label: string, placeholder: string, multiline: boolean) => (
    <View key={key} style={styles.fieldContainer}>
      <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
        {label}
      </ThemedText>
      <TextInput
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
          multiline && styles.multilineInput,
        ]}
        value={(current as any)[key]}
        onChangeText={(v) => setCurrent(prev => ({ ...prev, [key]: v }))}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        textAlign={isRTL && (key === "title" || key === "info") ? "right" : "left"}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );

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
        {REQUIRED_FIELDS.map(f => renderField(f.key, f.label, f.placeholder, f.multiline))}

        <View style={[styles.sectionHeader, { borderColor: theme.border, marginTop: Spacing.sm }]}>
          <ThemedText type="caption" style={{ color: theme.textSecondary, fontWeight: "700", fontSize: 11, letterSpacing: 0.5 }}>
            OPTIONAL
          </ThemedText>
        </View>
        {OPTIONAL_FIELDS.map(f => renderField(f.key, f.label, f.placeholder, f.multiline))}

        {pending.length > 0 && (
          <View style={[styles.pendingBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
            <ThemedText type="caption" style={{ color: AppColors.primary, fontWeight: "600" }}>
              {pending.length} {t("pending_entries")}
            </ThemedText>
            {pending.map((e, i) => (
              <ThemedText key={i} type="small" style={{ color: theme.textSecondary }}>{e.titleEn || e.title}</ThemedText>
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
  pendingBox: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.lg, gap: 4 },
  bottomBtns: {
    flexDirection: "row", gap: Spacing.md, padding: Spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  btn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md,
  },
});
