import React, { useState } from "react";
import { View, StyleSheet, Pressable, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Modal } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/query-client";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import type { Language } from "@/constants/translations";
import type { AuthStackParamList } from "@/navigation/AuthNavigator";
import { saveSettings, getSettings } from "@/lib/storage";

import { SHIPPING_COUNTRIES } from "@/constants/countries";

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "Register">;

export default function RegisterScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { login } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [country, setCountry] = useState("");
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const formatBirthDate = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    let formatted = "";
    
    if (cleaned.length > 0) {
      formatted = cleaned.substring(0, 4);
    }
    if (cleaned.length > 4) {
      formatted += "-" + cleaned.substring(4, 6);
    }
    if (cleaned.length > 6) {
      formatted += "-" + cleaned.substring(6, 8);
    }
    
    return formatted;
  };

  const handleRegister = async () => {
    setError("");

    if (!firstName.trim()) {
      setError(t("first_name_required"));
      return;
    }

    if (!lastName.trim()) {
      setError(t("last_name_required"));
      return;
    }

    if (!email.trim()) {
      setError(t("email_required"));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError(t("invalid_email"));
      return;
    }

    if (password.length < 8) {
      setError(t("password_length"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("passwords_dont_match"));
      return;
    }

    if (!acceptedTerms) {
      setError(t("must_accept_terms"));
      return;
    }

    setIsLoading(true);

    try {
      const selectedCountry = SHIPPING_COUNTRIES.find(c => c.value === country);
      const response = await apiRequest("POST", "/api/auth/register", {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        birthDate: birthDate.trim(),
        password: password,
        country: country || "DZ",
      });

      const data = await response.json();
      
      if (selectedCountry) {
        const settings = await getSettings();
        await saveSettings({
          ...settings,
          country: selectedCountry.value,
          currency: selectedCountry.currency
        });
      }

      await login(data.user);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.startsWith("409")) {
        setError(t("email_already_exists"));
      } else {
        setError(t("register_error"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + Spacing["2xl"], paddingBottom: insets.bottom + Spacing["2xl"] },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            style={[styles.backButton, { alignSelf: language === 'ar' ? 'flex-end' : 'flex-start' }]}
            onPress={() => navigation.goBack()}
            testID="button-back"
          >
            <Feather name={language === 'ar' ? "arrow-right" : "arrow-left"} size={24} color={theme.text} />
          </Pressable>

          <View style={[styles.headerSection, { alignItems: language === 'ar' ? 'flex-end' : 'flex-start' }]}>
            <ThemedText type="h1" style={styles.title}>
              {t("create_account")}
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              {t("register_subtitle")}
            </ThemedText>
          </View>

          <View style={styles.formSection}>
            {error ? (
              <View style={[styles.errorContainer, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
                <Feather name="alert-circle" size={18} color={AppColors.error} />
                <ThemedText type="small" style={[styles.errorText, { textAlign: language === 'ar' ? 'right' : 'left' }]}>
                  {error}
                </ThemedText>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={[styles.label, { textAlign: language === 'ar' ? 'right' : 'left' }]}>
                {t("first_name")}
              </ThemedText>
              <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
                <TextInput
                  style={[styles.input, { color: theme.text, textAlign: language === 'ar' ? 'right' : 'left' }]}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder={t("first_name")}
                  placeholderTextColor={theme.textSecondary}
                  testID="input-first-name"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={[styles.label, { textAlign: language === 'ar' ? 'right' : 'left' }]}>
                {t("last_name")}
              </ThemedText>
              <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
                <TextInput
                  style={[styles.input, { color: theme.text, textAlign: language === 'ar' ? 'right' : 'left' }]}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder={t("last_name")}
                  placeholderTextColor={theme.textSecondary}
                  testID="input-last-name"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={[styles.label, { textAlign: language === 'ar' ? 'right' : 'left' }]}>
                {t("email")}
              </ThemedText>
              <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
                <TextInput
                  style={[styles.input, { color: theme.text, textAlign: language === 'ar' ? 'right' : 'left' }]}
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
              <ThemedText type="small" style={[styles.label, { textAlign: language === 'ar' ? 'right' : 'left' }]}>
                {t("birth_date")}
              </ThemedText>
              <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
                <TextInput
                  style={[styles.input, { color: theme.text, textAlign: language === 'ar' ? 'right' : 'left' }]}
                  value={birthDate}
                  onChangeText={(text) => setBirthDate(formatBirthDate(text))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="number-pad"
                  maxLength={10}
                  testID="input-birth-date"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={[styles.label, { textAlign: language === 'ar' ? 'right' : 'left' }]}>
                {t("shipping_country")}
              </ThemedText>
              <Pressable 
                onPress={() => setShowCountryModal(true)}
                style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}
              >
                <ThemedText style={[styles.input, { color: country ? theme.text : theme.textSecondary, lineHeight: 48, textAlign: language === 'ar' ? 'right' : 'left' }]}>
                  {country ? t(SHIPPING_COUNTRIES.find(c => c.value === country)?.labelKey as any) : t("shipping_country_select")}
                </ThemedText>
                <Feather name="chevron-down" size={18} color={theme.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={[styles.label, { textAlign: language === 'ar' ? 'right' : 'left' }]}>
                {t("password")}
              </ThemedText>
              <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
                <TextInput
                  style={[styles.input, { color: theme.text, textAlign: language === 'ar' ? 'right' : 'left' }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showPassword}
                  testID="input-password"
                />
                <Pressable style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)}>
                  <Feather
                    name={showPassword ? "eye-off" : "eye"}
                    size={18}
                    color={theme.textSecondary}
                  />
                </Pressable>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={[styles.label, { textAlign: language === 'ar' ? 'right' : 'left' }]}>
                {t("confirm_password")}
              </ThemedText>
              <View style={[styles.inputContainer, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
                <TextInput
                  style={[styles.input, { color: theme.text, textAlign: language === 'ar' ? 'right' : 'left' }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showConfirmPassword}
                  testID="input-confirm-password"
                />
                <Pressable style={styles.eyeButton} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Feather
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={18}
                    color={theme.textSecondary}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={[styles.termsRow, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
              testID="button-accept-terms"
            >
              <View style={[styles.checkbox, { borderColor: acceptedTerms ? AppColors.primary : theme.border, backgroundColor: acceptedTerms ? AppColors.primary : 'transparent' }]}>
                {acceptedTerms ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
              </View>
              <View style={[styles.termsTextContainer, { flexDirection: language === 'ar' ? 'row-reverse' : 'row', flexWrap: 'wrap' }]}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {t("agree_to")}
                </ThemedText>
                <Pressable onPress={() => navigation.navigate("AuthAboutApp" as any)}>
                  <ThemedText type="small" style={styles.termsLink}>
                    {t("terms_and_privacy")}
                  </ThemedText>
                </Pressable>
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.registerButton,
                pressed && styles.buttonPressed,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleRegister}
              disabled={isLoading}
              testID="button-submit-register"
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ThemedText type="body" style={styles.registerButtonText}>
                  {t("create_account")}
                </ThemedText>
              )}
            </Pressable>

            <View style={[styles.loginSection, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {t("already_have_account")}{" "}
              </ThemedText>
              <Pressable onPress={() => navigation.navigate("Login")}>
                <ThemedText type="small" style={styles.loginLink}>
                  {t("login")}
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.langRow}>
              {(["ar", "en", "fr", "pt"] as Language[]).map((lang) => (
                <Pressable
                  key={lang}
                  style={[
                    styles.langBtn,
                    { borderColor: language === lang ? AppColors.primary : theme.border },
                    language === lang && { backgroundColor: AppColors.primary },
                  ]}
                  onPress={() => setLanguage(lang)}
                  testID={`button-lang-${lang}`}
                >
                  <ThemedText
                    type="small"
                    style={[styles.langBtnText, { color: language === lang ? "#fff" : theme.textSecondary }]}
                  >
                    {lang.toUpperCase()}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
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
            <ThemedText type="h4" style={styles.modalTitle}>{t("shipping_country_select")}</ThemedText>
            <ScrollView>
              {SHIPPING_COUNTRIES.map((c) => (
                <Pressable
                  key={c.value}
                  style={({ pressed }) => [
                    styles.countryItem,
                    { borderBottomColor: theme.border, flexDirection: language === 'ar' ? 'row-reverse' : 'row' },
                    pressed && { backgroundColor: theme.backgroundSecondary }
                  ]}
                  onPress={() => {
                    setCountry(c.value);
                    setShowCountryModal(false);
                  }}
                >
                  <ThemedText>{t(c.labelKey as any)}</ThemedText>
                  {country === c.value && <Feather name="check" size={18} color={AppColors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
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
    flexGrow: 1,
    paddingHorizontal: Spacing["2xl"],
  },
  backButton: {
    marginBottom: Spacing.xl,
    width: 44,
    height: 44,
    justifyContent: "center",
  },
  headerSection: {
    marginBottom: Spacing["2xl"],
  },
  title: {
    marginBottom: Spacing.sm,
  },
  formSection: {
    gap: Spacing.md,
  },
  errorContainer: {
    alignItems: "center",
    backgroundColor: `${AppColors.error}15`,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  errorText: {
    color: AppColors.error,
    flex: 1,
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
  registerButton: {
    height: 56,
    backgroundColor: AppColors.primary,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 18,
  },
  loginSection: {
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  loginLink: {
    color: AppColors.primary,
    fontWeight: "600",
  },
  langRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: Spacing.lg,
  },
  langBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  langBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    maxHeight: "60%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  termsRow: {
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  termsTextContainer: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  termsLink: {
    color: AppColors.primary,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  countryItem: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
});
