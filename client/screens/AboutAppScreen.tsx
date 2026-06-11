import React from "react";
import { View, StyleSheet, ScrollView, Pressable, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SocialLinks } from "@/components/SocialLinks";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";

interface AboutOptionProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
  isRTL: boolean;
}

function AboutOption({ icon, title, description, onPress, isRTL }: AboutOptionProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.optionCard,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
        pressed && { opacity: 0.7 },
      ]}
      onPress={onPress}
    >
      <View style={[styles.optionRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={styles.optionIconContainer}>
          <Feather name={icon} size={24} color={AppColors.primary} />
        </View>
        <View style={styles.optionContent}>
          <ThemedText type="h4" style={{ textAlign: isRTL ? "right" : "left", marginBottom: 4 }}>
            {title}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }}>
            {description}
          </ThemedText>
        </View>
        <Feather
          name={isRTL ? "chevron-left" : "chevron-right"}
          size={20}
          color={theme.textSecondary}
        />
      </View>
    </Pressable>
  );
}

export default function AboutAppScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { isAdmin } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute();
  const isRTL = language === "ar";
  const isAuthContext = route.name === "AuthAboutApp";

  const options = [
    {
      icon: "book-open" as keyof typeof Feather.glyphMap,
      title: t("app_guide"),
      description: isRTL
        ? "تعرف على كيفية استخدام التطبيق وجميع ميزاته"
        : "Learn how to use the app and all its features",
      screen: isAuthContext ? "AuthAppGuide" : "AppGuide",
    },
    {
      icon: "shield" as keyof typeof Feather.glyphMap,
      title: t("privacy_policy"),
      description: isRTL
        ? "اطلع على سياسة الخصوصية وحماية البيانات"
        : "Read our privacy policy and data protection practices",
      screen: isAuthContext ? "AuthPrivacyPolicy" : "PrivacyPolicy",
    },
    {
      icon: "alert-circle" as keyof typeof Feather.glyphMap,
      title: t("disclaimer"),
      description: isRTL
        ? "إخلاء المسؤولية والشروط القانونية"
        : "Legal disclaimer and terms",
      screen: isAuthContext ? "AuthDisclaimer" : "Disclaimer",
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroContainer}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/images/splash-icon.png")}
              style={styles.heroLogo}
              resizeMode="contain"
            />
          </View>
          <ThemedText type="h2" style={styles.appName}>
            Offers 365
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: "center" }}>
            {t("version")} 1.1.0
          </ThemedText>
        </View>

        <View style={styles.optionsContainer}>
          {options.map((option) => (
            <AboutOption
              key={option.screen}
              icon={option.icon}
              title={option.title}
              description={option.description}
              isRTL={isRTL}
              onPress={() => navigation.navigate(option.screen)}
            />
          ))}

          {!isAuthContext && (
            <AboutOption
              icon={isAdmin ? "users" : "message-circle"}
              title={isAdmin ? t("user_chats") : t("support_chat")}
              description={isAdmin ? t("user_chats_desc") : t("support_chat_desc")}
              isRTL={isRTL}
              onPress={() => navigation.navigate(isAdmin ? "AdminChatsList" : "SupportChat")}
            />
          )}
        </View>

        <SocialLinks />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  heroContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl + Spacing.md,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${AppColors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  heroLogo: {
    width: 80,
    height: 80,
  },
  appName: {
    color: AppColors.primary,
    marginBottom: Spacing.xs,
  },
  optionsContainer: {
    marginBottom: Spacing.xl,
  },
  optionCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  optionRow: {
    alignItems: "center",
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${AppColors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: Spacing.md,
  },
  optionContent: {
    flex: 1,
  },
});
