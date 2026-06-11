import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Linking,
  Share,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { ProductItem, getShareTemplate, formatProductMessage } from "@/lib/storage";

interface OfferButtonProps {
  name: string;
  link: string;
  success: boolean;
  offerKey?: string;
  product?: ProductItem;
  onCopied?: () => void;
}

export function OfferButton({
  name,
  link,
  success,
  offerKey,
  product,
  onCopied,
}: OfferButtonProps) {
  const { theme, isDark } = useTheme();
  const { t, language } = useLanguage();

  const openOffer = async () => {
    if (!success) return;
    try {
      await Linking.openURL(link);
    } catch (error) {
      console.error("Failed to open link:", error);
    }
  };

  const copyLink = async () => {
    if (!success) return;
    try {
      await Clipboard.setStringAsync(link);
      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onCopied?.();
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const shareOffer = async () => {
    if (!success) return;
    try {
      let message = `${name}\n${link}`;
      if (offerKey && product) {
        const template = await getShareTemplate(offerKey, language);
        message = formatProductMessage(product, template);
      }
      await Share.share({ message });
    } catch (error) {
      console.error("Failed to share:", error);
    }
  };

  const accentColor = success ? AppColors.primary : theme.textTertiary ?? theme.border;
  const cardBg = theme.backgroundDefault;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: cardBg,
          borderColor: success
            ? isDark ? "rgba(255,106,0,0.2)" : "rgba(255,106,0,0.15)"
            : theme.border,
        },
        Platform.OS === "ios" ? (success ? Shadows.sm : {}) : {},
      ]}
    >
      <Pressable
        style={({ pressed }) => [
          styles.mainButton,
          {
            backgroundColor: success
              ? isDark ? "rgba(255,106,0,0.08)" : "rgba(255,106,0,0.05)"
              : "transparent",
          },
          pressed && styles.pressed,
          !success && styles.disabled,
        ]}
        onPress={openOffer}
        disabled={!success}
        testID={`offer-button-${name}`}
      >
        <View
          style={[
            styles.iconBadge,
            {
              backgroundColor: success
                ? isDark ? "rgba(255,106,0,0.18)" : "rgba(255,106,0,0.12)"
                : isDark ? theme.backgroundSecondary : theme.backgroundTertiary,
            },
          ]}
        >
          <Feather
            name={success ? "tag" : "x-circle"}
            size={15}
            color={accentColor}
          />
        </View>

        <View style={styles.offerTextContainer}>
          <ThemedText
            type="body"
            style={[
              styles.offerName,
              { color: success ? theme.text : theme.textSecondary },
              !success && styles.disabledText,
            ]}
            numberOfLines={1}
          >
            {name}
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: success ? AppColors.primary : theme.textSecondary }}
            numberOfLines={1}
          >
            {success ? t("click_to_view") : t("offer_unavailable")}
          </ThemedText>
        </View>

        <View style={[styles.chevronWrap, { backgroundColor: success ? `${AppColors.primary}12` : "transparent" }]}>
          <Feather
            name="chevron-right"
            size={16}
            color={success ? AppColors.primary : theme.textSecondary}
          />
        </View>
      </Pressable>

      <View style={[styles.actions, { borderTopColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }]}>
        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.pressed,
            !success && styles.disabled,
          ]}
          onPress={copyLink}
          disabled={!success}
          testID={`copy-offer-${name}`}
        >
          <Feather name="copy" size={15} color={success ? AppColors.primary : theme.border} />
          <ThemedText
            type="caption"
            style={[styles.actionText, { color: success ? AppColors.primary : theme.border }]}
          >
            {t("copy_all").split(" ")[0]}
          </ThemedText>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" }]} />

        <Pressable
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.pressed,
            !success && styles.disabled,
          ]}
          onPress={shareOffer}
          disabled={!success}
          testID={`share-offer-${name}`}
        >
          <Feather name="share-2" size={15} color={success ? AppColors.primary : theme.border} />
          <ThemedText
            type="caption"
            style={[styles.actionText, { color: success ? AppColors.primary : theme.border }]}
          >
            {t("share")}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "column",
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    overflow: "hidden",
    ...Platform.select({
      android: { elevation: 3 },
      web: { boxShadow: "0 2px 8px rgba(0,0,0,0.08)" },
    }),
  },
  mainButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  offerTextContainer: {
    flex: 1,
    gap: 3,
  },
  offerName: {
    fontWeight: "600",
    fontSize: 15,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    height: 44,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    gap: Spacing.xs,
  },
  actionText: {
    fontWeight: "600",
    fontSize: 13,
  },
  divider: {
    width: 1,
    height: "50%",
  },
  pressed: {
    opacity: 0.65,
  },
  disabled: {
    opacity: 0.45,
  },
  disabledText: {
    textDecorationLine: "line-through",
  },
});
