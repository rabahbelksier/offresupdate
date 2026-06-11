import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  Modal,
  Linking,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteProps = RouteProp<RootStackParamList, "AdminOfferRequestDetail">;

export default function AdminOfferRequestDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { t } = useLanguage();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const { request: initialRequest } = route.params;
  const apiUrl = getApiUrl();

  const [linkImg, setLinkImg] = useState(initialRequest.link_img || "");
  const [title, setTitle] = useState(initialRequest.title || "");
  const [price, setPrice] = useState(initialRequest.price || "");
  const [codeValue, setCodeValue] = useState(initialRequest.code_value || "");
  const [couponVondor, setCouponVondor] = useState(initialRequest.coupon_vondor || "");
  const [link, setLink] = useState(initialRequest.link || "");
  const [details, setDetails] = useState(initialRequest.details || "");

  const [showProcessConfirm, setShowProcessConfirm] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelNote, setCancelNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const isAlreadyDone = !!initialRequest.status;

  const handleCopyLink = async (url: string) => {
    await Clipboard.setStringAsync(url);
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch(
        new URL(`/api/admin/offre-users/${initialRequest.id}/process`, apiUrl).href,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            linkImg: linkImg.trim() || null,
            title: title.trim() || null,
            price: price.trim() || null,
            codeValue: codeValue.trim() || null,
            couponVondor: couponVondor.trim() || null,
            link: link.trim() || null,
            details: details.trim() || null,
            userId: initialRequest.user_id,
            country: initialRequest.country,
          }),
        }
      );
      if (res.ok) {
        setShowProcessConfirm(false);
        setIsDone(true);
        setTimeout(() => navigation.goBack(), 1500);
      } else {
        Alert.alert("", t("offer_request_error"));
      }
    } catch {
      Alert.alert("", t("offer_request_error"));
    }
    setIsProcessing(false);
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch(
        new URL(`/api/admin/offre-users/${initialRequest.id}/cancel`, apiUrl).href,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            details: cancelNote.trim() || null,
            userId: initialRequest.user_id,
            country: initialRequest.country,
          }),
        }
      );
      if (res.ok) {
        setShowCancelModal(false);
        setIsDone(true);
        setTimeout(() => navigation.goBack(), 1500);
      } else {
        Alert.alert("", t("offer_request_error"));
      }
    } catch {
      Alert.alert("", t("offer_request_error"));
    }
    setIsCancelling(false);
  };

  if (isDone) {
    return (
      <ThemedView style={styles.doneContainer}>
        <Feather name="check-circle" size={52} color="#22c55e" />
        <ThemedText type="h3" style={{ marginTop: Spacing.md, textAlign: "center" }}>
          {t("changes_saved")}
        </ThemedText>
      </ThemedView>
    );
  }

  const fieldStyle = [
    styles.input,
    {
      backgroundColor: theme.backgroundRoot,
      borderColor: theme.border,
      color: theme.text,
    },
  ];

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={headerHeight + insets.top}
      >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[styles.userSection, { backgroundColor: theme.backgroundDefault }]}
        >
          <ThemedText type="h4" style={styles.sectionTitle}>
            {t("offer_request_from")}:{" "}
            {[initialRequest.first_name, initialRequest.last_name]
              .filter(Boolean)
              .join(" ") || initialRequest.user_id}
          </ThemedText>
          <ThemedText type="caption" style={{ color: theme.textSecondary }}>
            {initialRequest.country || "—"}
          </ThemedText>
        </View>

        {initialRequest.user_link_img ? (
          <View
            style={[styles.section, { backgroundColor: theme.backgroundDefault }]}
          >
            <ThemedText type="body" style={styles.sectionLabel}>
              {t("offer_request_user_image")}
            </ThemedText>
            <Image
              source={{ uri: initialRequest.user_link_img }}
              style={styles.userImage}
              resizeMode="contain"
            />
          </View>
        ) : null}

        {initialRequest.user_details ? (
          <View
            style={[styles.section, { backgroundColor: theme.backgroundDefault }]}
          >
            <ThemedText type="body" style={styles.sectionLabel}>
              {t("offer_request_user_note")}
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.text, lineHeight: 22 }}>
              {initialRequest.user_details}
            </ThemedText>
          </View>
        ) : null}

        {initialRequest.user_link ? (
          <View
            style={[styles.section, { backgroundColor: theme.backgroundDefault }]}
          >
            <ThemedText type="body" style={styles.sectionLabel}>
              {t("offer_request_user_link")}
            </ThemedText>
            <View style={styles.linkRow}>
              <Pressable
                style={styles.linkPress}
                onPress={() =>
                  Linking.openURL(initialRequest.user_link!).catch(() => {})
                }
              >
                <ThemedText
                  type="caption"
                  style={{
                    color: AppColors.primary,
                    textDecorationLine: "underline",
                    flex: 1,
                  }}
                  numberOfLines={2}
                >
                  {initialRequest.user_link}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => handleCopyLink(initialRequest.user_link!)}
                hitSlop={8}
              >
                <Feather name="copy" size={18} color={AppColors.primary} />
              </Pressable>
            </View>
          </View>
        ) : null}

        <View
          style={[styles.adminSection, { backgroundColor: theme.backgroundDefault }]}
        >
          <ThemedText type="h4" style={styles.sectionTitle}>
            {t("offer_request_admin_title")}
          </ThemedText>

          <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            {t("offer_request_admin_title_field")}
          </ThemedText>
          <TextInput
            style={fieldStyle}
            value={title}
            onChangeText={setTitle}
            placeholder={t("offer_request_admin_title_field")}
            placeholderTextColor={theme.textSecondary}
            editable={!isAlreadyDone}
          />

          <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            {t("offer_request_admin_image")}
          </ThemedText>
          <TextInput
            style={fieldStyle}
            value={linkImg}
            onChangeText={setLinkImg}
            placeholder={t("offer_request_admin_image")}
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            keyboardType="url"
            editable={!isAlreadyDone}
          />

          <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            {t("offer_request_admin_price")}
          </ThemedText>
          <TextInput
            style={fieldStyle}
            value={price}
            onChangeText={setPrice}
            placeholder={t("offer_request_admin_price")}
            placeholderTextColor={theme.textSecondary}
            keyboardType="default"
            editable={!isAlreadyDone}
          />

          <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            {t("offer_request_admin_code_value")}
          </ThemedText>
          <TextInput
            style={fieldStyle}
            value={codeValue}
            onChangeText={setCodeValue}
            placeholder={t("offer_request_admin_code_value")}
            placeholderTextColor={theme.textSecondary}
            editable={!isAlreadyDone}
          />

          <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            {t("offer_request_admin_coupon_vondor")}
          </ThemedText>
          <TextInput
            style={fieldStyle}
            value={couponVondor}
            onChangeText={setCouponVondor}
            placeholder={t("offer_request_admin_coupon_vondor")}
            placeholderTextColor={theme.textSecondary}
            editable={!isAlreadyDone}
          />

          <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            {t("offer_request_admin_link")}
          </ThemedText>
          <TextInput
            style={fieldStyle}
            value={link}
            onChangeText={setLink}
            placeholder={t("offer_request_admin_link")}
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            keyboardType="url"
            editable={!isAlreadyDone}
          />

          <ThemedText style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            {t("offer_request_ai_note_field")}
          </ThemedText>
          <TextInput
            style={[fieldStyle, styles.textArea]}
            value={details}
            onChangeText={setDetails}
            placeholder={t("offer_request_ai_note_field")}
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={3}
            editable={!isAlreadyDone}
          />
        </View>

        {!isAlreadyDone && (
          <View style={styles.actionRow}>
            <Pressable
              style={[styles.processBtn, { backgroundColor: "#22c55e" }]}
              onPress={() => setShowProcessConfirm(true)}
            >
              <Feather name="check-circle" size={18} color="#fff" />
              <ThemedText
                type="body"
                style={{ color: "#fff", fontWeight: "700", marginLeft: Spacing.xs }}
              >
                {t("offer_request_process_btn")}
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.cancelBtn, { backgroundColor: AppColors.error }]}
              onPress={() => setShowCancelModal(true)}
            >
              <Feather name="x-circle" size={18} color="#fff" />
              <ThemedText
                type="body"
                style={{ color: "#fff", fontWeight: "700", marginLeft: Spacing.xs }}
              >
                {t("offer_request_cancel_btn")}
              </ThemedText>
            </Pressable>
          </View>
        )}

        {isAlreadyDone && (
          <View
            style={[
              styles.doneBanner,
              {
                backgroundColor:
                  initialRequest.status === "yes"
                    ? "#22c55e20"
                    : `${AppColors.error}20`,
                borderColor:
                  initialRequest.status === "yes" ? "#22c55e" : AppColors.error,
              },
            ]}
          >
            <Feather
              name={initialRequest.status === "yes" ? "check-circle" : "x-circle"}
              size={18}
              color={initialRequest.status === "yes" ? "#22c55e" : AppColors.error}
            />
            <ThemedText
              type="body"
              style={{
                color:
                  initialRequest.status === "yes" ? "#22c55e" : AppColors.error,
                fontWeight: "700",
                marginLeft: Spacing.sm,
              }}
            >
              {initialRequest.status === "yes"
                ? t("offer_request_processed")
                : t("offer_request_cancelled")}
            </ThemedText>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showProcessConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProcessConfirm(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !isProcessing && setShowProcessConfirm(false)}
        >
          <View
            style={[
              styles.confirmModal,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <Feather name="check-circle" size={32} color="#22c55e" />
            <ThemedText
              type="h4"
              style={{ marginTop: Spacing.md, textAlign: "center" }}
            >
              {t("offer_request_process_btn")}
            </ThemedText>
            <ThemedText
              type="body"
              style={{
                color: theme.textSecondary,
                textAlign: "center",
                marginTop: Spacing.sm,
              }}
            >
              {t("offer_request_process_confirm")}
            </ThemedText>
            <View style={styles.confirmActions}>
              <Pressable
                style={[
                  styles.confirmBtn,
                  { borderColor: theme.border },
                ]}
                onPress={() => setShowProcessConfirm(false)}
                disabled={isProcessing}
              >
                <ThemedText type="body">{t("cancel")}</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, { backgroundColor: "#22c55e", borderColor: "#22c55e" }]}
                onPress={handleProcess}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText type="body" style={{ color: "#fff", fontWeight: "700" }}>
                    {t("yes")}
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => !isCancelling && setShowCancelModal(false)}
        >
          <View
            style={[
              styles.confirmModal,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <Feather name="x-circle" size={32} color={AppColors.error} />
            <ThemedText
              type="h4"
              style={{ marginTop: Spacing.md, textAlign: "center" }}
            >
              {t("offer_request_cancel_btn")}
            </ThemedText>
            <ThemedText
              type="body"
              style={{
                color: theme.textSecondary,
                textAlign: "center",
                marginTop: Spacing.sm,
              }}
            >
              {t("offer_request_cancel_note_modal_desc")}
            </ThemedText>
            <TextInput
              style={[
                styles.cancelNoteInput,
                {
                  backgroundColor: theme.backgroundRoot,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              value={cancelNote}
              onChangeText={setCancelNote}
              placeholder={t("offer_request_cancel_note_placeholder")}
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={3}
            />
            <View style={styles.confirmActions}>
              <Pressable
                style={[styles.confirmBtn, { borderColor: theme.border }]}
                onPress={() => setShowCancelModal(false)}
                disabled={isCancelling}
              >
                <ThemedText type="body">{t("cancel")}</ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.confirmBtn,
                  { backgroundColor: AppColors.error, borderColor: AppColors.error },
                ]}
                onPress={handleCancel}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText type="body" style={{ color: "#fff", fontWeight: "700" }}>
                    {t("yes")}
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Platform.OS === "android" ? 340 : Spacing.xl },
  section: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  adminSection: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  userSection: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  userImage: {
    width: "100%",
    height: 200,
    borderRadius: BorderRadius.md,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  linkPress: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 14,
    marginBottom: Spacing.xs,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  processBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  doneBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    justifyContent: "center",
  },
  doneContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  confirmModal: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
  },
  confirmActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
    width: "100%",
  },
  confirmBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minHeight: 44,
  },
  cancelNoteInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 14,
    width: "100%",
    minHeight: 80,
    textAlignVertical: "top",
    marginTop: Spacing.md,
  },
});
