import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Toast } from "@/components/Toast";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/query-client";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";

import { SHIPPING_COUNTRIES } from "@/constants/countries";


export default function AccountInfoScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user, updateUser, logout } = useAuth();
  const { t, language } = useLanguage();

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [country, setCountry] = useState(user?.country || "DZ");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success" as "success" | "error",
  });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      showToast(t("invalid_email"), "error");
      return;
    }

    if (newPassword && newPassword.length < 8) {
      showToast(t("password_length"), "error");
      return;
    }

    setIsLoading(true);
    try {
      const body: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        birthDate: "2000-01-01",
        country,
      };
      if (newPassword && newPassword.length >= 8) {
        body.newPassword = newPassword;
      }

      const response = await apiRequest("PUT", `/api/auth/user/${user?.id}`, body);
      const data = await response.json();
      await updateUser(data.user);
      setNewPassword("");

      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      showToast(t("account_updated"), "success");
    } catch (err: any) {
      showToast(t("update_error"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiRequest("DELETE", `/api/auth/user/${user?.id}`);
      setShowDeleteModal(false);
      await logout();
    } catch (err: any) {
      showToast(t("delete_error"), "error");
      setIsDeleting(false);
    }
  };

  const isRtl = language === "ar";

  const getCountryLabel = (value: string) => {
    const c = SHIPPING_COUNTRIES.find((c) => c.value === value);
    if (!c) return value;
    return t(c.labelKey as any);
  };

  return (
    <ThemedView style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + Spacing["2xl"] },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.avatarSection, { marginBottom: Spacing.xl }]}>
            <View style={[styles.avatar, { backgroundColor: `${AppColors.primary}15` }]}>
              <ThemedText type="h1" style={{ color: AppColors.primary }}>
                {(user?.firstName?.[0] || "").toUpperCase()}
                {(user?.lastName?.[0] || "").toUpperCase()}
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              ID: {user?.id}
            </ThemedText>
          </View>

          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <ThemedText type="small" style={[styles.label, { textAlign: isRtl ? "right" : "left" }]}>
                {t("first_name")}
              </ThemedText>
              <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, flexDirection: isRtl ? "row-reverse" : "row" }]}>
                <Feather name="user" size={18} color={theme.textSecondary} style={{ marginRight: isRtl ? 0 : Spacing.sm, marginLeft: isRtl ? Spacing.sm : 0 }} />
                <TextInput
                  style={[styles.input, { color: theme.text, textAlign: isRtl ? "right" : "left" }]}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder={t("first_name")}
                  placeholderTextColor={theme.textSecondary}
                  testID="input-first-name"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={[styles.label, { textAlign: isRtl ? "right" : "left" }]}>
                {t("last_name")}
              </ThemedText>
              <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, flexDirection: isRtl ? "row-reverse" : "row" }]}>
                <Feather name="user" size={18} color={theme.textSecondary} style={{ marginRight: isRtl ? 0 : Spacing.sm, marginLeft: isRtl ? Spacing.sm : 0 }} />
                <TextInput
                  style={[styles.input, { color: theme.text, textAlign: isRtl ? "right" : "left" }]}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder={t("last_name")}
                  placeholderTextColor={theme.textSecondary}
                  testID="input-last-name"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={[styles.label, { textAlign: isRtl ? "right" : "left" }]}>
                {t("email")}
              </ThemedText>
              <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, flexDirection: isRtl ? "row-reverse" : "row" }]}>
                <Feather name="mail" size={18} color={theme.textSecondary} style={{ marginRight: isRtl ? 0 : Spacing.sm, marginLeft: isRtl ? Spacing.sm : 0 }} />
                <TextInput
                  style={[styles.input, { color: theme.text, textAlign: isRtl ? "right" : "left" }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="example@email.com"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  testID="input-email"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={[styles.label, { textAlign: isRtl ? "right" : "left" }]}>
                {t("country_label")}
              </ThemedText>
              <Pressable
                onPress={() => setShowCountryModal(true)}
                style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, flexDirection: isRtl ? "row-reverse" : "row" }]}
              >
                <Feather name="map-pin" size={18} color={theme.textSecondary} style={{ marginRight: isRtl ? 0 : Spacing.sm, marginLeft: isRtl ? Spacing.sm : 0 }} />
                <ThemedText style={[styles.input, { color: theme.text, lineHeight: 48, textAlign: isRtl ? "right" : "left" }]}>
                  {getCountryLabel(country)}
                </ThemedText>
                <Feather name="chevron-down" size={18} color={theme.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={[styles.label, { textAlign: isRtl ? "right" : "left" }]}>
                {t("new_password")}
              </ThemedText>
              <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, flexDirection: isRtl ? "row-reverse" : "row" }]}>
                <Feather name="lock" size={18} color={theme.textSecondary} style={{ marginRight: isRtl ? 0 : Spacing.sm, marginLeft: isRtl ? Spacing.sm : 0 }} />
                <TextInput
                  style={[styles.input, { color: theme.text, textAlign: isRtl ? "right" : "left" }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showPassword}
                  testID="input-new-password"
                />
                <Pressable style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={18}
                    color={theme.textSecondary}
                  />
                </Pressable>
              </View>
              <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: isRtl ? "right" : "left" }}>
                {t("password_length")}
              </ThemedText>
            </View>
          </View>

          <View style={[styles.actionRow, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
            <Pressable
              style={({ pressed }) => [
                styles.deleteButton,
                { borderColor: AppColors.error },
                pressed && styles.pressed,
              ]}
              onPress={() => setShowDeleteModal(true)}
              testID="button-delete-account"
            >
              <Feather name="trash-2" size={18} color={AppColors.error} />
              <ThemedText type="body" style={styles.deleteButtonText}>
                {t("delete_account")}
              </ThemedText>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.pressed,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleSave}
              disabled={isLoading}
              testID="button-save-profile"
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather name="check" size={18} color="#FFFFFF" />
                  <ThemedText type="body" style={styles.saveButtonText}>
                    {t("save_changes")}
                  </ThemedText>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showCountryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCountryModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCountryModal(false)}
        >
          <ThemedView style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <ThemedText type="h4" style={styles.modalTitle}>
              {t("country_label")}
            </ThemedText>
            <ScrollView>
              {SHIPPING_COUNTRIES.map((c) => (
                <Pressable
                  key={c.value}
                  style={({ pressed }) => [
                    styles.countryItem,
                    { borderBottomColor: theme.border, flexDirection: isRtl ? "row-reverse" : "row" },
                    pressed && { backgroundColor: theme.backgroundSecondary },
                  ]}
                  onPress={() => {
                    setCountry(c.value);
                    setShowCountryModal(false);
                  }}
                >
                  <ThemedText>{t(c.labelKey as any)}</ThemedText>
                  {country === c.value ? <Feather name="check" size={18} color={AppColors.primary} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </ThemedView>
        </Pressable>
      </Modal>

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDeleteModal(false)}
        >
          <ThemedView style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.deleteModalIcon}>
              <Feather name="alert-triangle" size={40} color={AppColors.error} />
            </View>
            <ThemedText type="h4" style={[styles.modalTitle, { color: AppColors.error }]}>
              {t("delete_account")}
            </ThemedText>
            <ThemedText type="body" style={[styles.deleteModalText, { color: theme.textSecondary, textAlign: isRtl ? "right" : "left" }]}>
              {t("delete_account_confirm")}
            </ThemedText>
            <View style={[styles.deleteModalActions, { flexDirection: isRtl ? "row-reverse" : "row" }]}>
              <Pressable
                style={({ pressed }) => [
                  styles.cancelModalButton,
                  { borderColor: theme.border },
                  pressed && styles.pressed,
                ]}
                onPress={() => setShowDeleteModal(false)}
              >
                <ThemedText type="body">{t("cancel")}</ThemedText>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.confirmDeleteButton,
                  pressed && styles.pressed,
                  isDeleting && styles.buttonDisabled,
                ]}
                onPress={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <ThemedText type="body" style={{ color: "#FFFFFF", fontWeight: "600" }}>
                    {t("delete_account")}
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </ThemedView>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  avatarSection: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  formSection: {
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontWeight: "500",
  },
  inputContainer: {
    alignItems: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
  },
  eyeButton: {
    padding: Spacing.sm,
  },
  actionRow: {
    gap: Spacing.md,
  },
  saveButton: {
    flex: 1,
    flexDirection: "row",
    height: 52,
    backgroundColor: AppColors.primary,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  deleteButton: {
    flex: 1,
    flexDirection: "row",
    height: 52,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
  },
  deleteButtonText: {
    color: AppColors.error,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    maxHeight: "60%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  countryItem: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  deleteModalIcon: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  deleteModalText: {
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  deleteModalActions: {
    gap: Spacing.md,
  },
  cancelModalButton: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmDeleteButton: {
    flex: 1,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.error,
    justifyContent: "center",
    alignItems: "center",
  },
});
