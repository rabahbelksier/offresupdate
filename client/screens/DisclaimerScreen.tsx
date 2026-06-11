import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SocialLinks } from "@/components/SocialLinks";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";

export default function DisclaimerScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const isRTL = language === "ar";

  const disclaimerText = t("disclaimer_text");
  const lines = disclaimerText.split("\n").filter((line: string) => line.trim());

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
            <Feather name="alert-circle" size={32} color={AppColors.accent} />
          </View>
          <ThemedText type="h2" style={styles.heroTitle}>
            {t("disclaimer")}
          </ThemedText>
        </View>

        <View style={[styles.disclaimerCard, { backgroundColor: `${AppColors.accent}15`, borderColor: AppColors.accent }]}>
          {lines.map((line: string, index: number) => (
            <View
              key={index}
              style={[
                styles.disclaimerItem,
                { flexDirection: isRTL ? "row-reverse" : "row" },
                index < lines.length - 1 ? styles.disclaimerItemBorder : null,
              ]}
            >
              <Feather
                name="check-circle"
                size={18}
                color={AppColors.accent}
                style={{ [isRTL ? "marginLeft" : "marginRight"]: Spacing.md, marginTop: 2 }}
              />
              <ThemedText
                type="body"
                style={[styles.disclaimerText, { textAlign: isRTL ? "right" : "left" }]}
              >
                {line.trim()}
              </ThemedText>
            </View>
          ))}
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
  heroIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${AppColors.accent}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  heroTitle: {
    textAlign: "center",
  },
  disclaimerCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  disclaimerItem: {
    alignItems: "flex-start",
    paddingVertical: Spacing.md,
  },
  disclaimerItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  disclaimerText: {
    flex: 1,
    lineHeight: 22,
  },
});
