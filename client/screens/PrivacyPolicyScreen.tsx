import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";

interface SectionProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  content: string;
  isRTL: boolean;
}

function PolicySection({ icon, title, content, isRTL }: SectionProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.sectionCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
      <View style={[styles.sectionHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
        <View style={styles.sectionIconContainer}>
          <Feather name={icon} size={18} color={AppColors.primary} />
        </View>
        <ThemedText type="h4" style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left" }]}>
          {title}
        </ThemedText>
      </View>
      <ThemedText type="body" style={[styles.sectionContent, { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
        {content}
      </ThemedText>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const isRTL = language === "ar";

  const sections: { icon: keyof typeof Feather.glyphMap; titleKey: string; contentKey: string }[] = [
    { icon: "info", titleKey: "pp_intro_title", contentKey: "pp_intro" },
    { icon: "database", titleKey: "pp_info_title", contentKey: "pp_info_direct_title" },
    { icon: "cpu", titleKey: "pp_info_auto_title", contentKey: "pp_info_auto" },
    { icon: "target", titleKey: "pp_use_title", contentKey: "pp_use" },
    { icon: "lock", titleKey: "pp_protection_title", contentKey: "pp_protection" },
    { icon: "users", titleKey: "pp_sharing_title", contentKey: "pp_sharing" },
    { icon: "external-link", titleKey: "pp_links_title", contentKey: "pp_links" },
    { icon: "user-check", titleKey: "pp_rights_title", contentKey: "pp_rights" },
    { icon: "hard-drive", titleKey: "pp_storage_title", contentKey: "pp_storage" },
    { icon: "smartphone", titleKey: "pp_advertising_id_title", contentKey: "pp_advertising_id" },
    { icon: "bell", titleKey: "pp_notifications_title", contentKey: "pp_notifications" },
    { icon: "user-x", titleKey: "pp_children_title", contentKey: "pp_children" },
    { icon: "refresh-cw", titleKey: "pp_updates_title", contentKey: "pp_updates" },
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
          <View style={styles.heroIconContainer}>
            <Feather name="shield" size={32} color={AppColors.primary} />
          </View>
          <ThemedText type="h2" style={styles.heroTitle}>
            {t("privacy_policy")}
          </ThemedText>
        </View>

        {sections.map((section, index) => {
          let content = t(section.contentKey as any);
          if (section.titleKey === "pp_info_title") {
            content = t("pp_info_direct" as any);
          }
          return (
            <PolicySection
              key={index}
              icon={section.icon}
              title={t(section.titleKey as any)}
              content={content}
              isRTL={isRTL}
            />
          );
        })}

        <View style={[styles.contactCard, { backgroundColor: `${AppColors.primary}10`, borderColor: AppColors.primary }]}>
          <View style={[styles.sectionHeader, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View style={styles.sectionIconContainer}>
              <Feather name="mail" size={18} color={AppColors.primary} />
            </View>
            <ThemedText type="h4" style={[styles.sectionTitle, { textAlign: isRTL ? "right" : "left" }]}>
              {t("pp_contact_title")}
            </ThemedText>
          </View>
          <ThemedText type="body" style={[styles.sectionContent, { color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }]}>
            {t("pp_contact_email")}{"\n"}{t("pp_contact_website")}
          </ThemedText>
        </View>
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
    paddingTop: Spacing.lg,
  },
  heroContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  heroIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${AppColors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  heroTitle: {
    textAlign: "center",
  },
  sectionCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  sectionHeader: {
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${AppColors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: Spacing.sm,
  },
  sectionTitle: {
    flex: 1,
  },
  sectionContent: {
    lineHeight: 22,
  },
  contactCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
});
