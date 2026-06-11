import React, { useState } from "react";
import { View, StyleSheet, Pressable, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
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

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "Login">;

export default function LoginScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { login } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");

    if (!email.trim()) {
      setError(t("email_required"));
      return;
    }

    if (!password.trim()) {
      setError(t("password_required"));
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/auth/login", {
        emailOrUsername: email.trim(),
        password: password,
      });

      const data = await response.json();
      await login(data.user);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.startsWith("404")) {
        setError(t("user_not_found"));
      } else if (msg.startsWith("401")) {
        setError(t("invalid_password"));
      } else {
        setError(t("login_error"));
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
            { paddingTop: insets.top + Spacing["3xl"], paddingBottom: insets.bottom + Spacing["2xl"] },
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
            <ThemedText type="h1" style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
              {t("welcome_back")}
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              {t("login_to_continue")}
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

            <Pressable
              style={({ pressed }) => [
                styles.loginButton,
                pressed && styles.buttonPressed,
                isLoading && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
              testID="button-submit-login"
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ThemedText type="body" style={styles.loginButtonText}>
                  {t("login")}
                </ThemedText>
              )}
            </Pressable>

            <ThemedText
              type="small"
              style={[styles.registerSection, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {language === 'ar'
                ? <>
                    <ThemedText type="small" style={styles.registerLink} onPress={() => navigation.navigate("Register")}>
                      {t("create_account")}
                    </ThemedText>
                    {" "}{t("no_account")}
                  </>
                : <>
                    {t("no_account")}{" "}
                    <ThemedText type="small" style={styles.registerLink} onPress={() => navigation.navigate("Register")}>
                      {t("create_account")}
                    </ThemedText>
                  </>
              }
            </ThemedText>

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
    marginBottom: Spacing["2xl"],
    width: 44,
    height: 44,
    justifyContent: "center",
  },
  headerSection: {
    marginBottom: Spacing["3xl"],
  },
  title: {
    marginBottom: Spacing.sm,
  },
  formSection: {
    gap: Spacing.lg,
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
    gap: Spacing.sm,
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
  loginButton: {
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
  loginButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 18,
  },
  registerSection: {
    textAlign: "center",
    marginTop: Spacing.lg,
  },
  registerLink: {
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
});
