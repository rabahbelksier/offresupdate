import React from "react";
import { View, StyleSheet, Image, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import type { Language } from "@/constants/translations";
import type { AuthStackParamList } from "@/navigation/AuthNavigator";

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, "Welcome">;

export default function WelcomeScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { t, language, setLanguage } = useLanguage();

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing["3xl"] }]}>
      <View style={styles.content}>
        <View style={styles.logoSection}>
          <Image
            source={require("../../../assets/images/splash-icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <ThemedText type="h1" style={styles.appName}>
            Offers 365
          </ThemedText>
          <ThemedText type="body" style={[styles.tagline, { color: theme.textSecondary }]}>
            {t("welcome_tagline")}
          </ThemedText>
        </View>

        <View style={[styles.buttonSection, { paddingBottom: insets.bottom + Spacing["2xl"] }]}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => navigation.navigate("Login")}
            testID="button-login"
          >
            <ThemedText type="body" style={styles.primaryButtonText}>
              {t("login")}
            </ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.secondaryButton,
              { borderColor: AppColors.primary },
              pressed && styles.buttonPressed,
            ]}
            onPress={() => navigation.navigate("Register")}
            testID="button-register"
          >
            <ThemedText type="body" style={[styles.secondaryButtonText, { color: AppColors.primary }]}>
              {t("create_account")}
            </ThemedText>
          </Pressable>

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
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: Spacing["2xl"],
  },
  logoSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 150,
    height: 150,
    borderRadius: BorderRadius["2xl"],
    marginBottom: Spacing["2xl"],
  },
  appName: {
    color: AppColors.primary,
    marginBottom: Spacing.sm,
  },
  tagline: {
    textAlign: "center",
  },
  buttonSection: {
    gap: Spacing.md,
  },
  button: {
    height: 56,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: AppColors.primary,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 18,
  },
  secondaryButtonText: {
    fontWeight: "600",
    fontSize: 18,
  },
  langRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: Spacing.md,
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
