import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Linking,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface UpdateData {
  message: string;
  messageEn?: string;
  messageFr?: string;
  messagePt?: string;
  link: string;
  version: string;
}

interface UpdatePopupProps {
  navigationKey?: string;
}

export function UpdatePopup({ navigationKey }: UpdatePopupProps) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [updateData, setUpdateData] = useState<UpdateData | null>(null);
  const dismissedOnKey = useRef<string>("");

  const checkForUpdate = useCallback(async () => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(new URL("/api/update", apiUrl).href);
      if (!response.ok) return;
      const data = await response.json();
      if (!data || !data.version) {
        setVisible(false);
        setUpdateData(null);
        return;
      }

      const currentVersion = Constants.expoConfig?.version || "1.0.0";
      if (data.version !== currentVersion) {
        setUpdateData(data);
        setVisible(true);
      } else {
        setVisible(false);
        setUpdateData(null);
      }
    } catch (e) {
    }
  }, []);

  useEffect(() => {
    checkForUpdate();
  }, [checkForUpdate]);

  useEffect(() => {
    if (!navigationKey) return;
    if (navigationKey !== dismissedOnKey.current) {
      dismissedOnKey.current = "";
      checkForUpdate();
    }
  }, [navigationKey, checkForUpdate]);

  const handleDismiss = () => {
    dismissedOnKey.current = navigationKey || "";
    setVisible(false);
  };

  if (!visible || !updateData) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.popup, { backgroundColor: theme.backgroundDefault }]}>
          <Pressable style={styles.closeButton} onPress={handleDismiss}>
            <Feather name="x" size={22} color={theme.textSecondary} />
          </Pressable>

          <Feather name="download" size={40} color={AppColors.primary} style={styles.icon} />
          
          <ThemedText type="h3" style={[styles.title, { textAlign: language === 'ar' ? 'right' : 'left' }]}>
            {t("update_available")}
          </ThemedText>

          <ThemedText type="body" style={[styles.message, { textAlign: language === 'ar' ? 'right' : 'left', color: theme.textSecondary }]}>
            {(language === 'en' && updateData.messageEn) ? updateData.messageEn
              : (language === 'fr' && updateData.messageFr) ? updateData.messageFr
              : (language === 'pt' && updateData.messagePt) ? updateData.messagePt
              : updateData.message}
          </ThemedText>

          <Pressable
            style={({ pressed }) => [styles.updateButton, pressed && { opacity: 0.8 }]}
            onPress={() => {
              Linking.openURL(updateData.link);
              setVisible(false);
            }}
          >
            <Feather name="download" size={18} color="#FFFFFF" />
            <ThemedText type="body" style={styles.updateButtonText}>
              {t("update_button")}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  popup: {
    width: "100%",
    maxWidth: 320,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  closeButton: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 10,
    padding: Spacing.xs,
  },
  icon: {
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  title: {
    marginBottom: Spacing.sm,
    width: "100%",
  },
  message: {
    marginBottom: Spacing.xl,
    width: "100%",
    lineHeight: 22,
  },
  updateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppColors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
    width: "100%",
  },
  updateButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
