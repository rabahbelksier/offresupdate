import React from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { AppColors, Spacing, BorderRadius, Shadows } from "@/constants/theme";
import type { ProductItem } from "@/lib/storage";

interface ProductCardProps {
  product: ProductItem;
  onPress: () => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const { theme, isDark } = useTheme();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.backgroundDefault,
          borderColor: theme.border,
        },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      testID={`product-card-${product.productId}`}
    >
      <View style={[styles.imageContainer, { backgroundColor: isDark ? theme.backgroundSecondary : "#F0F0F5" }]}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Feather name="image" size={22} color={theme.textSecondary} />
          </View>
        )}
        {product.discount && product.discount !== "0%" && (
          <View style={styles.discountBadge}>
            <ThemedText type="caption" style={styles.discountText}>
              {product.discount}
            </ThemedText>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <ThemedText type="small" numberOfLines={2} style={[styles.title, { color: theme.text }]}>
          {product.title}
        </ThemedText>
        <View style={styles.priceRow}>
          <ThemedText type="h4" style={styles.price}>
            {product.price}
          </ThemedText>
        </View>
        <ThemedText type="caption" style={{ color: theme.textSecondary }}>
          {formatDate(product.searchedAt)}
        </ThemedText>
      </View>

      <View style={[styles.arrow, { backgroundColor: isDark ? theme.backgroundSecondary : theme.backgroundSecondary }]}>
        <Feather name="chevron-right" size={16} color={AppColors.primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
    ...Platform.select({
      ios: Shadows.sm,
      android: { elevation: 3 },
    }),
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  imageContainer: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    gap: Spacing.xs,
  },
  title: {
    fontWeight: "500",
    lineHeight: 19,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  price: {
    color: AppColors.primary,
    fontWeight: "700",
  },
  discountBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: AppColors.secondary,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  discountText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 10,
  },
  arrow: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
});
