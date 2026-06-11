import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Toast } from "@/components/Toast";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { SHIPPING_COUNTRIES } from "@/constants/countries";

export default function AdminNotifyScreen() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const isRTL = language === "ar";

  const [message, setMessage] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string>("all");
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success" as "success" | "error",
  });

  const showToast = (msg: string, type: "success" | "error" = "success") =>
    setToast({ visible: true, message: msg, type });

  const handleSend = async () => {
    if (!message.trim()) {
      showToast(t("notification_empty"), "error");
      return;
    }
    setIsSending(true);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(new URL("/api/admin/notify-subscribers", apiUrl).href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          country: selectedCountry === "all" ? undefined : selectedCountry,
        }),
      });
      if (!res.ok) throw new Error();
      showToast(t("notification_sent"), "success");
      setMessage("");
    } catch {
      showToast(t("error"), "error");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((p) => ({ ...p, visible: false }))}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingBottom: insets.bottom + Spacing["2xl"] },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <Feather name="bell" size={20} color={AppColors.primary} />
              <ThemedText type="body" style={{ color: AppColors.primary, fontWeight: "700" }}>
                {t("notify_subscribers")}
              </ThemedText>
            </View>

            {/* Country selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
            >
              {[{ value: "all", labelKey: "filter_all" as const, emoji: " 🌍" }, ...SHIPPING_COUNTRIES.map(c => ({ ...c, emoji: "" }))].map((c) => {
                const isSelected = selectedCountry === c.value;
                const label = c.value === "all"
                  ? `${t("filter_all")} 🌍`
                  : t((c as typeof SHIPPING_COUNTRIES[0]).labelKey as any);
                return (
                  <Pressable
                    key={c.value}
                    onPress={() => setSelectedCountry(c.value)}
                    style={[
                      styles.countryChip,
                      {
                        borderColor: isSelected ? AppColors.primary : theme.border,
                        backgroundColor: isSelected ? AppColors.primary : theme.backgroundDefault,
                      },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={{ color: isSelected ? "#fff" : theme.text, fontWeight: isSelected ? "700" : "400" }}
                    >
                      {label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>

            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundDefault,
                  borderColor: theme.border,
                  textAlign: isRTL ? "right" : "left",
                },
              ]}
              value={message}
              onChangeText={setMessage}
              placeholder={t("notify_message_placeholder")}
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                { backgroundColor: AppColors.primary, opacity: (isSending || pressed) ? 0.7 : 1 },
              ]}
              onPress={handleSend}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="send" size={18} color="#fff" />
              )}
              <ThemedText type="body" style={styles.sendBtnText}>
                {t("send_notification")}
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 15,
    minHeight: 130,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  sendBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
  countryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
});
