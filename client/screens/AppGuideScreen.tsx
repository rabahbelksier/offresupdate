import React from "react";
import { View, StyleSheet, ScrollView, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SocialLinks } from "@/components/SocialLinks";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";

interface GuideCardProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
}

function GuideCard({ icon, title, description }: GuideCardProps) {
  const { theme } = useTheme();
  const { language } = useLanguage();

  return (
    <View
      style={[
        styles.guideCard,
        { backgroundColor: theme.backgroundDefault, borderColor: theme.border, flexDirection: language === 'ar' ? 'row-reverse' : 'row' },
      ]}
    >
      <View style={[styles.guideIconContainer, { [language === 'ar' ? 'marginLeft' : 'marginRight']: Spacing.md }]}>
        <Feather name={icon} size={24} color={AppColors.primary} />
      </View>
      <View style={styles.guideContent}>
        <ThemedText type="h4" style={[styles.guideTitle, { textAlign: language === 'ar' ? 'right' : 'left' }]}>
          {title}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: language === 'ar' ? 'right' : 'left' }}>
          {description}
        </ThemedText>
      </View>
    </View>
  );
}

export default function AppGuideScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, language } = useLanguage();

  const guideItems: GuideCardProps[] = [
    {
      icon: "link",
      title: t("guide_link_title"),
      description: t("guide_link_desc"),
    },
    {
      icon: "search",
      title: t("guide_offers_title"),
      description: t("guide_offers_desc"),
    },
    {
      icon: "tag",
      title: t("guide_understanding_title"),
      description: t("guide_understanding_desc"),
    },
    {
      icon: "copy",
      title: t("guide_copy_title"),
      description: t("guide_copy_desc"),
    },
    {
      icon: "settings",
      title: t("guide_config_title"),
      description: t("guide_config_desc"),
    },
    {
      icon: "edit-3",
      title: t("guide_custom_title"),
      description: t("guide_custom_desc"),
    },
    {
      icon: "share-2",
      title: t("guide_share_title"),
      description: t("guide_share_desc"),
    },
    {
      icon: "clock",
      title: t("guide_history_title"),
      description: t("guide_history_desc"),
    },
    {
      icon: "trending-up",
      title: t("guide_trending_title"),
      description: t("guide_trending_desc"),
    },
    {
      icon: "gift",
      title: t("guide_coupons_title"),
      description: t("guide_coupons_desc"),
    },
    {
      icon: "download",
      title: t("guide_update_title"),
      description: t("guide_update_desc"),
    },
    {
      icon: "star",
      title: t("guide_promo_title"),
      description: t("guide_promo_desc"),
    },
    {
      icon: "bookmark",
      title: t("guide_saved_title"),
      description: t("guide_saved_desc"),
    },
    {
      icon: "user",
      title: t("guide_account_title"),
      description: t("guide_account_desc"),
    },
    {
      icon: "globe",
      title: t("guide_language_title"),
      description: t("guide_language_desc"),
    },
    {
      icon: "trash-2",
      title: t("guide_delete_title"),
      description: t("guide_delete_desc"),
    },
    {
      icon: "award",
      title: t("guide_best_sellers_title"),
      description: t("guide_best_sellers_desc"),
    },
    {
      icon: "search",
      title: t("guide_search_title"),
      description: t("guide_search_desc"),
    },
    {
      icon: "globe",
      title: t("guide_product_lang_title"),
      description: t("guide_product_lang_desc"),
    },
    {
      icon: "cpu",
      title: t("guide_ai_request_title"),
      description: t("guide_ai_request_desc"),
    },
    {
      icon: "bell",
      title: t("guide_notifications_title"),
      description: t("guide_notifications_desc"),
    },
    {
      icon: "message-circle",
      title: t("guide_support_title"),
      description: t("guide_support_desc"),
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
          <Image
            source={require("../../assets/images/guide-hero.png")}
            style={styles.heroImage}
            resizeMode="contain"
          />
          <ThemedText type="h2" style={styles.heroTitle}>
            {t("welcome_guide")}
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.heroSubtitle, { color: theme.textSecondary }]}
          >
            {t("guide_subtitle")}
          </ThemedText>
        </View>

        <View style={styles.section}>
          <View style={[styles.sectionHeader, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
            <Feather name="book-open" size={18} color={AppColors.primary} />
            <ThemedText type="h4" style={styles.sectionTitle}>
              {t("how_to_use")}
            </ThemedText>
          </View>

          {guideItems.map((item, index) => (
            <GuideCard
              key={index}
              icon={item.icon}
              title={item.title}
              description={item.description}
            />
          ))}
        </View>

        <View
          style={[
            styles.tipCard,
            { backgroundColor: `${AppColors.accent}20`, borderColor: AppColors.accent },
          ]}
        >
          <View style={[styles.tipHeader, { flexDirection: language === 'ar' ? 'row-reverse' : 'row' }]}>
            <Feather name="zap" size={20} color={AppColors.accent} />
            <ThemedText type="h4" style={[styles.tipTitle, { color: "#B8860B", marginHorizontal: Spacing.sm }]}>
              {t("pro_tips")}
            </ThemedText>
          </View>
          <ThemedText type="small" style={[styles.tipText, { textAlign: language === 'ar' ? 'right' : 'left' }]}>
            {"\u2022"} {t("tip_recent")}{"\n"}
            {"\u2022"} {t("tip_detect")}{"\n"}
            {"\u2022"} {t("tip_types")}{"\n"}
            {"\u2022"} {t("tip_template")}{"\n"}
            {"\u2022"} {t("tip_notifications")}{"\n"}
            {"\u2022"} {t("tip_saved")}
          </ThemedText>
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
    paddingTop: Spacing.lg,
  },
  heroContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  heroImage: {
    width: 200,
    height: 150,
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    textAlign: "center",
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginHorizontal: Spacing.sm,
  },
  guideCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  guideIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${AppColors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
  },
  guideContent: {
    flex: 1,
  },
  guideTitle: {
    marginBottom: Spacing.xs,
  },
  tipCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  tipHeader: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  tipTitle: {
    // marginHorizontal handled inline
  },
  tipText: {
    lineHeight: 22,
  },
});
