import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  ActivityIndicator,
  Image,
  RefreshControl,
  Dimensions,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { SHIPPING_COUNTRIES } from "@/constants/countries";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

const SCREEN_WIDTH = Dimensions.get("window").width;

function AutoHeightImage({ uri }: { uri: string }) {
  const [height, setHeight] = useState(200);
  return (
    <Image
      source={{ uri }}
      style={{
        width: "100%",
        height,
        borderRadius: 10,
        marginBottom: 8,
      }}
      resizeMode="contain"
      onLoad={(e) => {
        const { width: w, height: h } = e.nativeEvent.source;
        if (w > 0) {
          const cardWidth = SCREEN_WIDTH - 64;
          setHeight(Math.round((h / w) * cardWidth));
        }
      }}
    />
  );
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const MAX_REQUESTS = 5;

interface OfferRequest {
  id: number;
  user_id: string;
  user_link: string | null;
  user_link_img: string | null;
  user_details: string | null;
  country: string | null;
  created_user_at: string;
  link: string | null;
  link_img: string | null;
  details: string | null;
  title: string | null;
  price: string | null;
  code_value: string | null;
  coupon_vondor: string | null;
  status: string | null;
  created_admin_at: string | null;
}

function formatDateTime(dateStr: string | null | undefined, _language: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  // Use UTC directly — displayed as GMT — reliable on all platforms
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const y = date.getUTCFullYear();
  const h = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  return `${d}/${m}/${y} ${h}:${min}`;
}

function CountryPickerModal({
  value,
  onChange,
  theme,
  t,
  language,
}: {
  value: string;
  onChange: (val: string) => void;
  theme: any;
  t: (key: any) => string;
  language: string;
}) {
  const [open, setOpen] = useState(false);
  const found = SHIPPING_COUNTRIES.find(
    (c) => c.value.toLowerCase() === value.toLowerCase()
  );
  const label = found
    ? `${found.value} — ${t(found.labelKey as any)}`
    : t("offer_request_shipping_country");

  return (
    <>
      <ThemedText
        type="caption"
        style={[styles.fieldLabel, { color: theme.textSecondary }]}
      >
        {t("offer_request_shipping_country")}
      </ThemedText>
      <Pressable
        style={[styles.countryBtn, { backgroundColor: AppColors.primary }]}
        onPress={() => setOpen(true)}
      >
        <ThemedText
          type="body"
          style={{ color: "#fff", fontWeight: "700", flex: 1, textAlign: "center" }}
        >
          {label}
        </ThemedText>
        <Feather name="chevron-down" size={16} color="#fff" />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setOpen(false)}
        >
          <View
            style={[
              styles.countryModal,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <ThemedText
              type="h4"
              style={{ marginBottom: Spacing.md, textAlign: "center" }}
            >
              {t("offer_request_shipping_country")}
            </ThemedText>
            <ScrollView showsVerticalScrollIndicator={false}>
              {SHIPPING_COUNTRIES.map((c) => {
                const isSelected =
                  value.toLowerCase() === c.value.toLowerCase();
                return (
                  <Pressable
                    key={c.value}
                    style={[
                      styles.countryOption,
                      { borderColor: theme.border },
                      isSelected && {
                        backgroundColor: `${AppColors.primary}20`,
                        borderColor: AppColors.primary,
                      },
                    ]}
                    onPress={() => {
                      onChange(c.value);
                      setOpen(false);
                    }}
                  >
                    <ThemedText
                      type="body"
                      style={[
                        isSelected && {
                          color: AppColors.primary,
                          fontWeight: "700",
                        },
                      ]}
                    >
                      {c.value} — {t(c.labelKey as any)}
                    </ThemedText>
                    {isSelected && (
                      <Feather
                        name="check"
                        size={16}
                        color={AppColors.primary}
                      />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function AddRequestModal({
  visible,
  onClose,
  onSubmit,
  isLoading,
  theme,
  t,
  language,
  initialData,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    link: string;
    linkImg: string;
    details: string;
    country: string;
  }) => void;
  isLoading: boolean;
  theme: any;
  t: (key: any) => string;
  language: string;
  initialData?: {
    link: string;
    linkImg: string;
    details: string;
    country: string;
  };
}) {
  const defaultCountry =
    SHIPPING_COUNTRIES[0]?.value || "DZ";
  const [link, setLink] = useState(initialData?.link || "");
  const [linkImg, setLinkImg] = useState(initialData?.linkImg || "");
  const [details, setDetails] = useState(initialData?.details || "");
  const [country, setCountry] = useState(
    initialData?.country || defaultCountry
  );

  React.useEffect(() => {
    if (visible) {
      setLink(initialData?.link || "");
      setLinkImg(initialData?.linkImg || "");
      setDetails(initialData?.details || "");
      setCountry(initialData?.country || defaultCountry);
    }
  }, [visible, initialData]);

  const handleSubmit = () => {
    const hasLink = link.trim().length > 0;
    const hasImg = linkImg.trim().length > 0;
    const hasNote = details.trim().length > 0;
    if (!hasLink && !hasImg && !hasNote) {
      Alert.alert("", t("offer_request_at_least_one"));
      return;
    }
    onSubmit({ link: link.trim(), linkImg: linkImg.trim(), details: details.trim(), country });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ width: "100%" }}
        >
        <Pressable
          style={[
            styles.addModal,
            { backgroundColor: theme.backgroundDefault },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.addModalHeader}>
            <ThemedText type="h4">{t("offer_request_add")}</ThemedText>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: Platform.OS === "android" ? 340 : 16 }}
          >
            <ThemedText
              type="caption"
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              {t("offer_request_product_link")}
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundRoot,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              value={link}
              onChangeText={setLink}
              placeholder={t("offer_request_product_link_placeholder")}
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              keyboardType="url"
              multiline
            />

            <ThemedText
              type="caption"
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              {t("offer_request_image_link")}
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundRoot,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              value={linkImg}
              onChangeText={setLinkImg}
              placeholder={t("offer_request_image_link_placeholder")}
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              keyboardType="url"
            />

            <ThemedText
              type="caption"
              style={[styles.fieldLabel, { color: theme.textSecondary }]}
            >
              {t("offer_request_note")}
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: theme.backgroundRoot,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              value={details}
              onChangeText={setDetails}
              placeholder={t("offer_request_note_placeholder")}
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={3}
            />

            <CountryPickerModal
              value={country}
              onChange={setCountry}
              theme={theme}
              t={t}
              language={language}
            />

            <Pressable
              style={[
                styles.submitBtn,
                { backgroundColor: AppColors.primary },
                isLoading && { opacity: 0.6 },
              ]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <ThemedText
                  type="body"
                  style={{ color: "#fff", fontWeight: "700" }}
                >
                  {t("offer_request_submit")}
                </ThemedText>
              )}
            </Pressable>
          </ScrollView>
        </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

export default function UserOfferRequestScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const apiUrl = getApiUrl();

  const [requests, setRequests] = useState<OfferRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<OfferRequest | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isDeletingOne, setIsDeletingOne] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [cancelledNoteModal, setCancelledNoteModal] = useState<OfferRequest | null>(null);

  const fetchRequests = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        new URL(`/api/offre-users/${user.id}`, apiUrl).href
      );
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch {}
    setIsLoading(false);
  };

  const fetchSilently = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(
        new URL(`/api/offre-users/${user.id}`, apiUrl).href
      );
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch {}
  };

  const handleRefresh = async () => {
    if (!user?.id) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(
        new URL(`/api/offre-users/${user.id}`, apiUrl).href
      );
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch {}
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [user?.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchSilently();
    }, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const handleSubmit = async (data: {
    link: string;
    linkImg: string;
    details: string;
    country: string;
  }) => {
    if (!user?.id) return;
    setIsSubmitting(true);
    try {
      if (editingRequest) {
        const res = await fetch(
          new URL(`/api/offre-users/${editingRequest.id}`, apiUrl).href,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userLink: data.link,
              userLinkImg: data.linkImg,
              userDetails: data.details,
              country: data.country,
            }),
          }
        );
        if (res.ok) {
          setShowAddModal(false);
          setEditingRequest(null);
          await fetchRequests();
        }
      } else {
        const res = await fetch(new URL("/api/offre-users", apiUrl).href, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            userLink: data.link,
            userLinkImg: data.linkImg,
            userDetails: data.details,
            country: data.country,
          }),
        });
        if (res.ok) {
          setShowAddModal(false);
          await fetchRequests();
        }
      }
    } catch {}
    setIsSubmitting(false);
  };

  const handleDeleteOne = async () => {
    if (deleteId === null) return;
    setIsDeletingOne(true);
    try {
      const res = await fetch(
        new URL(`/api/offre-users/${deleteId}`, apiUrl).href,
        { method: "DELETE" }
      );
      if (res.ok) {
        setDeleteId(null);
        await fetchRequests();
      }
    } catch {}
    setIsDeletingOne(false);
  };

  const handleClearAll = async () => {
    if (!user?.id) return;
    setIsDeletingAll(true);
    try {
      const res = await fetch(
        new URL(`/api/offre-users/all/${user.id}`, apiUrl).href,
        { method: "DELETE" }
      );
      if (res.ok) {
        setShowClearConfirm(false);
        setRequests([]);
      }
    } catch {}
    setIsDeletingAll(false);
  };

  const handleCardPress = (req: OfferRequest) => {
    if (req.status === "yes") {
      navigation.navigate("UserOfferResult", { request: req });
    } else if (req.status === "no") {
      setCancelledNoteModal(req);
    }
  };

  const reachedMax = requests.length >= MAX_REQUESTS;

  const getStatusColor = (status: string | null) => {
    if (status === "yes") return "#22c55e";
    if (status === "no") return AppColors.error;
    return AppColors.primary;
  };

  const getStatusLabel = (status: string | null) => {
    if (status === "yes") return t("offer_request_processed");
    if (status === "no") return t("offer_request_cancelled");
    return t("offer_request_pending");
  };

  const pendingCount = requests.filter((r) => !r.status || r.status === "").length;

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={AppColors.primary}
          />
        }
      >
        {reachedMax ? (
          <View
            style={[
              styles.maxReachedBanner,
              { backgroundColor: `${AppColors.primary}15`, borderColor: AppColors.primary },
            ]}
          >
            <Feather name="info" size={18} color={AppColors.primary} />
            <ThemedText
              type="body"
              style={{ color: AppColors.primary, flex: 1, marginLeft: Spacing.sm, textAlign: "center" }}
            >
              {t("offer_request_max_reached")}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.topActions}>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: AppColors.primary }]}
              onPress={() => {
                setEditingRequest(null);
                setShowAddModal(true);
              }}
            >
              <Feather name="plus" size={18} color="#fff" />
              <ThemedText type="body" style={{ color: "#fff", fontWeight: "700" }}>
                {t("offer_request_add")}
              </ThemedText>
            </Pressable>
            {requests.length > 0 && (
              <Pressable
                style={[styles.actionBtn, { backgroundColor: AppColors.error }]}
                onPress={() => setShowClearConfirm(true)}
              >
                <Feather name="trash-2" size={18} color="#fff" />
                <ThemedText type="body" style={{ color: "#fff", fontWeight: "700" }}>
                  {t("offer_request_clear_all")}
                </ThemedText>
              </Pressable>
            )}
          </View>
        )}

        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={AppColors.primary} />
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, marginTop: Spacing.sm }}
            >
              {t("offer_request_loading")}
            </ThemedText>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="inbox" size={52} color={theme.textSecondary} />
            <ThemedText
              type="h4"
              style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}
            >
              {t("offer_request_empty")}
            </ThemedText>
            <ThemedText
              type="caption"
              style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}
            >
              {t("offer_request_empty_desc")}
            </ThemedText>
          </View>
        ) : (
          requests.map((req) => {
            const statusColor = getStatusColor(req.status);
            const isProcessed = req.status === "yes";
            const isCancelled = req.status === "no";
            const isPending = !req.status;

            return (
              <Pressable
                key={req.id}
                onPress={() => handleCardPress(req)}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: statusColor,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${statusColor}20`, borderColor: statusColor },
                    ]}
                  >
                    <Feather
                      name={isProcessed ? "check-circle" : isCancelled ? "x-circle" : "clock"}
                      size={13}
                      color={statusColor}
                    />
                    <ThemedText
                      type="caption"
                      style={{ color: statusColor, fontWeight: "700", marginLeft: 4 }}
                    >
                      {getStatusLabel(req.status)}
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary }}
                  >
                    {formatDateTime(req.created_user_at, language)}
                  </ThemedText>
                </View>

                {req.user_link_img ? (
                  <AutoHeightImage uri={req.user_link_img} />
                ) : null}

                {req.user_link ? (
                  <View style={styles.cardRow}>
                    <Feather name="link" size={14} color={theme.textSecondary} />
                    <ThemedText
                      type="caption"
                      style={[styles.cardLink, { color: AppColors.primary }]}
                      numberOfLines={1}
                    >
                      {req.user_link}
                    </ThemedText>
                  </View>
                ) : null}

                {req.user_details ? (
                  <ThemedText
                    type="caption"
                    style={[styles.cardNote, { color: theme.textSecondary }]}
                    numberOfLines={2}
                  >
                    {req.user_details}
                  </ThemedText>
                ) : null}

                {(isProcessed || isCancelled) && !!req.created_admin_at && (
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary, marginTop: 2 }}
                  >
                    {formatDateTime(req.created_admin_at, language)} {"(GMT)"}
                  </ThemedText>
                )}

                {isCancelled && (
                  <View style={[styles.cancelledHint, { borderColor: AppColors.error }]}>
                    <Feather name="alert-circle" size={13} color={AppColors.error} />
                    <ThemedText
                      type="caption"
                      style={{ color: AppColors.error, marginLeft: 4 }}
                    >
                      {t("offer_request_tap_cancelled")}
                    </ThemedText>
                  </View>
                )}

                {isProcessed && (
                  <View style={[styles.processedHint, { borderColor: "#22c55e" }]}>
                    <Feather name="gift" size={13} color="#22c55e" />
                    <ThemedText
                      type="caption"
                      style={{ color: "#22c55e", marginLeft: 4 }}
                    >
                      {t("offer_request_view_offer")}
                    </ThemedText>
                  </View>
                )}

                <View style={styles.cardActions}>
                  {isPending && (
                    <Pressable
                      style={[styles.cardActionBtn, { borderColor: AppColors.primary }]}
                      onPress={() => {
                        setEditingRequest(req);
                        setShowAddModal(true);
                      }}
                    >
                      <Feather name="edit-2" size={14} color={AppColors.primary} />
                      <ThemedText
                        type="caption"
                        style={{ color: AppColors.primary, marginLeft: 4 }}
                      >
                        {t("offer_request_edit")}
                      </ThemedText>
                    </Pressable>
                  )}
                  <Pressable
                    style={[styles.cardActionBtn, { borderColor: AppColors.error }]}
                    onPress={() => setDeleteId(req.id)}
                  >
                    <Feather name="trash-2" size={14} color={AppColors.error} />
                    <ThemedText
                      type="caption"
                      style={{ color: AppColors.error, marginLeft: 4 }}
                    >
                      {t("delete")}
                    </ThemedText>
                  </Pressable>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <AddRequestModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingRequest(null);
        }}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
        theme={theme}
        t={t}
        language={language}
        initialData={
          editingRequest
            ? {
                link: editingRequest.user_link || "",
                linkImg: editingRequest.user_link_img || "",
                details: editingRequest.user_details || "",
                country: editingRequest.country || SHIPPING_COUNTRIES[0]?.value || "DZ",
              }
            : undefined
        }
      />

      <ConfirmDeleteModal
        visible={deleteId !== null}
        message={t("offer_request_delete_confirm")}
        isLoading={isDeletingOne}
        onConfirm={handleDeleteOne}
        onCancel={() => setDeleteId(null)}
      />

      <ConfirmDeleteModal
        visible={showClearConfirm}
        message={t("offer_request_clear_confirm")}
        isLoading={isDeletingAll}
        onConfirm={handleClearAll}
        onCancel={() => setShowClearConfirm(false)}
      />

      <Modal
        visible={cancelledNoteModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelledNoteModal(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setCancelledNoteModal(null)}
        >
          <View
            style={[
              styles.noteModal,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <View style={styles.noteModalHeader}>
              <Feather name="x-circle" size={26} color={AppColors.error} />
              <ThemedText type="h4" style={{ marginLeft: Spacing.sm }}>
                {t("offer_request_cancelled")}
              </ThemedText>
              <Pressable
                onPress={() => setCancelledNoteModal(null)}
                style={{ marginLeft: "auto" }}
                hitSlop={8}
              >
                <Feather name="x" size={20} color={theme.textSecondary} />
              </Pressable>
            </View>
            {cancelledNoteModal?.details ? (
              <ThemedText
                type="body"
                style={{ color: theme.text, marginTop: Spacing.md, lineHeight: 22 }}
              >
                {cancelledNoteModal.details}
              </ThemedText>
            ) : (
              <ThemedText
                type="body"
                style={{ color: theme.textSecondary, marginTop: Spacing.md, fontStyle: "italic" }}
              >
                —
              </ThemedText>
            )}
          </View>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing["2xl"] },
  topActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  maxReachedBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  centered: {
    alignItems: "center",
    marginTop: Spacing["2xl"],
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: Spacing["2xl"],
    paddingHorizontal: Spacing.xl,
  },
  card: {
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  cardImage: {
    width: "100%",
    height: 160,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: Spacing.xs,
  },
  cardLink: {
    flex: 1,
    textDecorationLine: "underline",
  },
  cardNote: {
    marginBottom: Spacing.sm,
    fontStyle: "italic",
  },
  cancelledHint: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  processedHint: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  cardActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  cardActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  addModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.lg,
    maxHeight: "90%",
  },
  addModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
    fontWeight: "600",
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
  countryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  countryModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.lg,
    maxHeight: "70%",
  },
  countryOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  submitBtn: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  noteModal: {
    margin: Spacing.xl,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  noteModalHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
});
