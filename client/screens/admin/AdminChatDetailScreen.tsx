import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, RouteProp, useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Linking from "expo-linking";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { Toast } from "@/components/Toast";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type RouteProps = RouteProp<RootStackParamList, "AdminChatDetail">;

interface ChatMessage {
  id: number;
  user_id: string;
  message: string | null;
  message_admin: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  created_at: string;
  is_read_by_admin: string;
  pending?: boolean;
}

// Normalize a PostgreSQL / ISO timestamp to a format all JS engines (including
// Hermes on Android) can parse. Postgres sends "2026-05-14 09:31:10.552+00"
// with a space instead of "T" — Hermes returns NaN for that format.
function parseDate(dateStr: string): Date {
  if (!dateStr || dateStr === "pending") return new Date(NaN);
  const normalized = dateStr
    .replace(" ", "T")
    .replace("+00:00", "Z")
    .replace(/\+00$/, "Z");
  return new Date(normalized);
}

function formatTime(dateStr: string, sendingLabel: string): string {
  if (!dateStr || dateStr === "pending") return sendingLabel;
  const date = parseDate(dateStr);
  if (isNaN(date.getTime())) return sendingLabel;
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function formatDateSeparator(dateStr: string, todayLabel: string, yesterdayLabel: string): string {
  const date = parseDate(dateStr);
  if (isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return todayLabel;
  if (date.toDateString() === yesterday.toDateString()) return yesterdayLabel;
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function MessageBubble({
  msg,
  isAdmin,
  theme,
  sendingLabel,
}: {
  msg: ChatMessage;
  isAdmin: boolean;
  theme: any;
  sendingLabel: string;
}) {
  const text = isAdmin ? msg.message_admin : msg.message;
  if (!text) return null;

  const parts = text.split(URL_REGEX);

  return (
    <View
      style={[
        bubbleStyles.bubble,
        isAdmin
          ? { alignSelf: "flex-end", backgroundColor: AppColors.primary }
          : { alignSelf: "flex-start", backgroundColor: theme.backgroundSecondary, borderColor: theme.border, borderWidth: 1 },
      ]}
    >
      {parts.map((part, i) =>
        URL_REGEX.test(part) ? (
          <Pressable key={i} onPress={() => { try { Linking.openURL(part); } catch {} }}>
            <ThemedText type="small" style={{ color: isAdmin ? "#ffe0b2" : AppColors.primary, textDecorationLine: "underline" }}>
              {part}
            </ThemedText>
          </Pressable>
        ) : (
          <ThemedText key={i} type="small" style={{ color: isAdmin ? "#fff" : theme.text, flexShrink: 1 }}>
            {part}
          </ThemedText>
        )
      )}
      <ThemedText
        type="caption"
        style={{ color: isAdmin ? "rgba(255,255,255,0.65)" : theme.textSecondary, fontSize: 10, marginTop: 4, alignSelf: "flex-end" }}
      >
        {msg.pending ? sendingLabel : formatTime(msg.created_at, sendingLabel)}
      </ThemedText>
    </View>
  );
}

const bubbleStyles = StyleSheet.create({
  bubble: {
    maxWidth: "80%",
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
});

export default function AdminChatDetailScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const isRTL = language === "ar";
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const { userId, userName } = route.params;
  const apiUrl = getApiUrl();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" as "success" | "error" });
  const scrollRef = useRef<ScrollView>(null);
  const pendingIdRef = useRef(0);

  const userInfo = messages.find((m) => m.first_name || m.email);

  const fetchMessages = async (silent = false) => {
    try {
      const res = await fetch(new URL(`/api/admin/chat/messages/${userId}`, apiUrl).href);
      if (res.ok) {
        const data: ChatMessage[] = await res.json();
        setMessages((prev) => {
          const hasPending = prev.some((m) => m.pending);
          if (hasPending) {
            const confirmedIds = new Set(data.map((m) => m.id));
            const stillPending = prev.filter((m) => m.pending && !confirmedIds.has(m.id));
            return [...data, ...stillPending];
          }
          return data;
        });
        if (!silent) {
          await fetch(new URL(`/api/admin/chat/read/${userId}`, apiUrl).href, { method: "PUT" });
        }
      }
    } catch {}
    finally {
      if (!silent) setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMessages();
      const interval = setInterval(() => fetchMessages(true), 10000);
      return () => clearInterval(interval);
    }, [])
  );

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    }
  }, [messages]);

  const sendReply = async () => {
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText("");
    setIsSending(true);

    const tempId = --pendingIdRef.current;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      user_id: userId,
      message: null,
      message_admin: text,
      first_name: null,
      last_name: null,
      email: null,
      created_at: "pending",
      is_read_by_admin: "true",
      pending: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const res = await fetch(new URL("/api/admin/chat/reply", apiUrl).href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message: text }),
      });
      if (res.ok) {
        const newMsg: ChatMessage = await res.json();
        setMessages((prev) => prev.map((m) => m.id === tempId ? { ...newMsg, pending: false } : m));
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteConversation = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(new URL(`/api/admin/chat/conversation/${userId}`, apiUrl).href, { method: "DELETE" });
      if (res.ok) {
        setConfirmDelete(false);
        navigation.goBack();
      }
    } catch {}
    finally {
      setIsDeleting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      setToast({ visible: true, message: t("copy_id_success"), type: "success" });
    } catch {}
  };

  const renderMessages = () => {
    let lastDateStr = "";
    return messages.map((msg) => {
      const rawDate = msg.created_at === "pending" ? new Date().toDateString() : new Date(msg.created_at).toDateString();
      const showSeparator = rawDate !== lastDateStr && msg.created_at !== "pending";
      if (msg.created_at !== "pending") lastDateStr = rawDate;
      const isAdmin = msg.message_admin !== null;

      return (
        <View key={msg.id}>
          {showSeparator && (
            <View style={styles.dateSeparator}>
              <View style={[styles.dateLine, { backgroundColor: theme.border }]} />
              <ThemedText
                type="caption"
                style={[styles.dateLabel, { backgroundColor: theme.backgroundSecondary, color: theme.textSecondary }]}
              >
                {formatDateSeparator(msg.created_at, t("chat_today"), t("chat_yesterday"))}
              </ThemedText>
              <View style={[styles.dateLine, { backgroundColor: theme.border }]} />
            </View>
          )}
          <MessageBubble msg={msg} isAdmin={isAdmin} theme={theme} sendingLabel={t("chat_sending")} />
        </View>
      );
    });
  };

  const infoRows = [
    { label: t("first_name"), value: userInfo?.first_name || "-" },
    { label: t("last_name"), value: userInfo?.last_name || "-" },
    { label: t("email"), value: userInfo?.email || "-" },
    { label: "ID", value: userId },
  ];

  return (
    <ThemedView style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast((p) => ({ ...p, visible: false }))} />
      <ConfirmDeleteModal
        visible={confirmDelete}
        message={t("chat_delete_confirm")}
        isLoading={isDeleting}
        onConfirm={handleDeleteConversation}
        onCancel={() => setConfirmDelete(false)}
      />

      <View style={[styles.header, { backgroundColor: theme.backgroundDefault, borderBottomColor: theme.border }]}>
        <Pressable style={styles.headerBtn} onPress={() => setShowUserInfo(true)}>
          <Feather name="info" size={20} color={AppColors.primary} />
        </Pressable>
        <Pressable style={styles.headerBtn} onPress={() => setConfirmDelete(true)}>
          <Feather name="trash-2" size={20} color={AppColors.error} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.messagesContainer}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: Spacing.lg }}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <ActivityIndicator size="large" color={AppColors.primary} style={{ marginTop: 40 }} />
          ) : messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="message-circle" size={48} color={theme.textSecondary} />
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
                {t("chat_no_messages")}
              </ThemedText>
            </View>
          ) : (
            renderMessages()
          )}
        </ScrollView>

        <View
          style={[
            styles.inputContainer,
            { backgroundColor: theme.backgroundDefault, borderTopColor: theme.border, paddingBottom: Math.max(insets.bottom, Spacing.sm) },
          ]}
        >
          <TextInput
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t("chat_placeholder")}
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={1000}
          />
          <Pressable
            style={[
              styles.sendBtn,
              { backgroundColor: inputText.trim() ? AppColors.primary : theme.border, opacity: isSending ? 0.7 : 1 },
            ]}
            onPress={sendReply}
            disabled={isSending || !inputText.trim()}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="send" size={18} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showUserInfo} transparent animationType="fade" onRequestClose={() => setShowUserInfo(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowUserInfo(false)}>
          <View style={[styles.modalCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            <ThemedText type="h4" style={{ textAlign: "center", marginBottom: Spacing.md, color: AppColors.primary }}>
              {t("chat_user_info")}
            </ThemedText>

            {infoRows.map((item) => (
              <Pressable
                key={item.label}
                style={[
                  styles.infoRow,
                  { borderBottomColor: theme.border, flexDirection: isRTL ? "row-reverse" : "row" },
                ]}
                onPress={() => copyToClipboard(item.value)}
              >
                <ThemedText
                  type="caption"
                  style={{ color: theme.textSecondary, width: 70, textAlign: isRTL ? "right" : "left" }}
                >
                  {item.label}
                </ThemedText>
                <ThemedText
                  type="body"
                  style={{ flex: 1, color: theme.text, textAlign: isRTL ? "right" : "left" }}
                >
                  {item.value}
                </ThemedText>
                <Feather name="copy" size={14} color={theme.textSecondary} />
              </Pressable>
            ))}

            <Pressable
              style={[styles.closeBtn, { backgroundColor: AppColors.primary }]}
              onPress={() => setShowUserInfo(false)}
            >
              <ThemedText type="body" style={{ color: "#fff", fontWeight: "700" }}>
                {t("cancel")}
              </ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.md,
  },
  headerBtn: {
    padding: Spacing.xs,
  },
  messagesContainer: { flex: 1 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 80 },
  dateSeparator: { flexDirection: "row", alignItems: "center", marginVertical: Spacing.md },
  dateLine: { flex: 1, height: 1 },
  dateLabel: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginHorizontal: Spacing.xs,
    fontSize: 11,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    maxHeight: 100,
    minHeight: 40,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalCard: {
    width: "100%",
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
  },
  infoRow: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  closeBtn: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
});
