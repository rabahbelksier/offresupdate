import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { SocialLinks } from "@/components/SocialLinks";
import { Toast } from "@/components/Toast";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getSavedItems, removeSavedItem, clearSavedItems, SavedItem } from "@/lib/storage";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SavedItemsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const isRTL = language === "ar";

  const [items, setItems] = useState<SavedItem[]>([]);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" as "success" | "error" });
  const [confirmModal, setConfirmModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [])
  );

  const loadItems = async () => {
    const data = await getSavedItems();
    setItems(data);
  };

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ visible: true, message, type });
  };

  const handleRemove = async (savedId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await removeSavedItem(savedId);
    setItems((prev) => prev.filter((i) => i.savedId !== savedId));
    showToast(t("item_removed"));
  };

  const handleClearAll = async () => {
    setConfirmModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await clearSavedItems();
    setItems([]);
    showToast(t("item_removed"));
  };

  const handleItemPress = (item: SavedItem) => {
    if (item.type === "offer" && item.offerMeta) {
      navigation.navigate("OfferDetails", {
        offer: {
          id: item.offerMeta.id,
          title: item.productData.title,
          price: item.offerMeta.price,
          sellerCoupon: item.offerMeta.sellerCoupon,
          productUrl: item.offerMeta.productUrl,
          imageUrl: item.productData.imageUrl,
          cod_1: item.productData.cod_1,
          cod_2: item.productData.cod_2,
          cod_3: item.productData.cod_3,
        },
        country: item.offerMeta.country,
      });
    } else {
      navigation.navigate("ProductDetails", { product: item.productData });
    }
  };

  const renderItem = ({ item }: { item: SavedItem }) => (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
        pressed && { opacity: 0.8 },
      ]}
      onPress={() => handleItemPress(item)}
      testID={`card-saved-${item.savedId}`}
    >
      <View style={[styles.cardContent, isRTL && styles.cardContentRTL]}>
        <View style={styles.imageContainer}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.cardImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.cardImage, styles.placeholderImage, { backgroundColor: theme.border }]}>
              <Feather name="image" size={24} color={theme.textSecondary} />
            </View>
          )}
        </View>
        <View style={styles.cardTextContainer}>
          <ThemedText
            type="body"
            numberOfLines={2}
            style={[styles.cardTitle, isRTL && styles.textRTL]}
          >
            {item.title}
          </ThemedText>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && { opacity: 0.6, transform: [{ scale: 0.9 }] },
          ]}
          onPress={() => handleRemove(item.savedId)}
          hitSlop={10}
          testID={`button-delete-${item.savedId}`}
        >
          <Feather name="trash-2" size={20} color={AppColors.error} />
        </Pressable>
      </View>
    </Pressable>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Feather name="bookmark" size={64} color={theme.textSecondary} />
      <ThemedText type="h3" style={[styles.emptyTitle, { color: theme.textSecondary }]}>
        {t("no_saved_items")}
      </ThemedText>
      <ThemedText type="body" style={[styles.emptyDesc, { color: theme.textSecondary }]}>
        {t("no_saved_items_desc")}
      </ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.savedId}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 100 },
          items.length === 0 && styles.emptyList,
        ]}
        showsVerticalScrollIndicator={false}
      />

      {items.length > 0 ? (
        <View style={[styles.clearButtonContainer, { paddingBottom: insets.bottom + Spacing.md }]}>
          <Pressable
            style={({ pressed }) => [
              styles.clearButton,
              { backgroundColor: AppColors.error },
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => setConfirmModal(true)}
            testID="button-clear-all"
          >
            <Feather name="trash" size={18} color="#fff" />
            <ThemedText type="body" style={styles.clearButtonText}>
              {t("clear_all")}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      <Modal
        visible={confirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setConfirmModal(false)}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundSecondary }]}>
            <ThemedText type="h3" style={[styles.modalTitle, isRTL && styles.textRTL]}>
              {t("clear_saved_confirm")}
            </ThemedText>
            <View style={[styles.modalButtons, isRTL && styles.modalButtonsRTL]}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.border }]}
                onPress={() => setConfirmModal(false)}
              >
                <ThemedText type="body">{t("cancel")}</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: AppColors.error }]}
                onPress={handleClearAll}
              >
                <ThemedText type="body" style={{ color: "#fff" }}>
                  {t("confirm")}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      <View style={{ paddingBottom: insets.bottom }}>
        <SocialLinks />
      </View>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: Spacing.md },
  emptyList: { flex: 1, justifyContent: "center" },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  cardContentRTL: { flexDirection: "row-reverse" },
  imageContainer: { width: 70, height: 70, borderRadius: BorderRadius.md, overflow: "hidden" },
  cardImage: { width: 70, height: 70 },
  placeholderImage: { justifyContent: "center", alignItems: "center" },
  cardTextContainer: { flex: 1 },
  cardTitle: { fontWeight: "600" },
  textRTL: { textAlign: "right" },
  deleteButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  emptyContainer: { alignItems: "center", gap: Spacing.md, paddingHorizontal: Spacing.xl },
  emptyTitle: { marginTop: Spacing.md, textAlign: "center" },
  emptyDesc: { textAlign: "center", lineHeight: 22 },
  clearButtonContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  clearButtonText: { color: "#fff" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  modalTitle: { marginBottom: Spacing.lg, textAlign: "center" },
  modalButtons: { flexDirection: "row", gap: Spacing.md },
  modalButtonsRTL: { flexDirection: "row-reverse" },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
});
