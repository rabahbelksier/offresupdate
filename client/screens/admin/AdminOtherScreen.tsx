import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Toast } from "@/components/Toast";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { SHIPPING_COUNTRIES } from "@/constants/countries";

// ─── Types ────────────────────────────────────────────────────────────────────

type RowData = Record<string, string | number | null>;

interface FieldDef {
  key: string;
  labelKey: string;
  multiline?: boolean;
}

interface TabConfig {
  key: string;
  labelKey: string;
  apiPath: string;
  fields: FieldDef[];
  supportsCountry?: boolean;
}

// ─── Tab Configurations ───────────────────────────────────────────────────────

const TAB_CONFIGS: TabConfig[] = [
  {
    key: "update",
    labelKey: "tab_update",
    apiPath: "/api/admin/update",
    fields: [
      { key: "message", labelKey: "field_message_ar", multiline: true },
      { key: "message_en", labelKey: "field_message_en", multiline: true },
      { key: "message_fr", labelKey: "field_message_fr", multiline: true },
      { key: "message_pt", labelKey: "field_message_pt", multiline: true },
      { key: "link", labelKey: "field_link" },
      { key: "version", labelKey: "field_version" },
    ],
  },
  {
    key: "social",
    labelKey: "tab_social",
    apiPath: "/api/admin/social",
    fields: [
      { key: "telegram", labelKey: "field_telegram" },
      { key: "facebook", labelKey: "field_facebook" },
      { key: "tiktok", labelKey: "field_tiktok" },
      { key: "bot", labelKey: "field_bot" },
    ],
  },
  {
    key: "sale",
    labelKey: "tab_sale",
    apiPath: "/api/admin/sale",
    supportsCountry: true,
    fields: [
      { key: "linkImg", labelKey: "field_link_img" },
      { key: "link", labelKey: "field_link" },
    ],
  },
  {
    key: "cart",
    labelKey: "tab_cart",
    apiPath: "/api/admin/cart",
    fields: [
      { key: "linkcart", labelKey: "field_linkcart" },
      { key: "pricecart", labelKey: "field_pricecart" },
    ],
  },
];

// Fields for each pub ad type
const PUB_OFFER_FIELDS: FieldDef[] = [
  { key: "productName", labelKey: "field_product_name" },
  { key: "price", labelKey: "field_price" },
  { key: "link", labelKey: "field_link" },
  { key: "promoCode", labelKey: "field_promo_code" },
  { key: "codeValue", labelKey: "field_code_value" },
  { key: "image", labelKey: "field_image" },
  { key: "sellerCoupon", labelKey: "field_seller_coupon" },
  { key: "sellerCouponValue", labelKey: "field_seller_coupon_value" },
  { key: "note", labelKey: "field_note", multiline: true },
];

const PUB_GENERAL_FIELDS: FieldDef[] = [
  { key: "image", labelKey: "field_image" },
  { key: "note", labelKey: "field_note", multiline: true },
  { key: "buttonLabel", labelKey: "field_button_label" },
  { key: "buttonLink", labelKey: "field_button_link" },
];

// ─── Active Toggle (for General Ad only) ─────────────────────────────────────

interface ActiveToggleProps {
  value: "on" | "off";
  onChange: (v: "on" | "off") => void;
  theme: any;
  t: (k: any) => string;
}

function ActiveToggle({ value, onChange, theme, t }: ActiveToggleProps) {
  return (
    <View style={{ marginBottom: Spacing.sm }}>
      <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>
        {t("field_active")}
      </ThemedText>
      <View style={{ flexDirection: "row", gap: Spacing.sm }}>
        <Pressable
          style={[
            activeToggleStyles.btn,
            value === "on"
              ? { backgroundColor: AppColors.primary, borderColor: AppColors.primary }
              : { backgroundColor: "transparent", borderColor: theme.border },
          ]}
          onPress={() => onChange("on")}
        >
          <Feather name="repeat" size={14} color={value === "on" ? "#fff" : theme.textSecondary} />
          <ThemedText type="caption" style={{ color: value === "on" ? "#fff" : theme.textSecondary, fontWeight: "700" }}>
            {t("active_on")}
          </ThemedText>
        </Pressable>
        <Pressable
          style={[
            activeToggleStyles.btn,
            value === "off"
              ? { backgroundColor: AppColors.secondary, borderColor: AppColors.secondary }
              : { backgroundColor: "transparent", borderColor: theme.border },
          ]}
          onPress={() => onChange("off")}
        >
          <Feather name="eye-off" size={14} color={value === "off" ? "#fff" : theme.textSecondary} />
          <ThemedText type="caption" style={{ color: value === "off" ? "#fff" : theme.textSecondary, fontWeight: "700" }}>
            {t("active_off")}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const activeToggleStyles = StyleSheet.create({
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
});

// ─── Country Picker (reusable) ────────────────────────────────────────────────

interface CountryPickerProps {
  value: string;
  onChange: (v: string) => void;
  theme: any;
  t: (k: any) => string;
  language: string;
}

function CountryPicker({ value, onChange, theme, t, language }: CountryPickerProps) {
  const [open, setOpen] = useState(false);
  const displayLabel = SHIPPING_COUNTRIES.find((c) => c.value.toLowerCase() === value.toLowerCase());
  const label = displayLabel
    ? `${displayLabel.value} — ${t(displayLabel.labelKey as any)}`
    : value.toUpperCase();

  return (
    <>
      <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
        {t("field_country")}
      </ThemedText>
      <Pressable
        style={[styles.countryBtn, { backgroundColor: AppColors.primary }]}
        onPress={() => setOpen(true)}
      >
        <ThemedText type="body" style={{ color: "#fff", fontWeight: "700", flex: 1, textAlign: "center" }}>
          {label}
        </ThemedText>
        <Feather name="chevron-down" size={16} color="#fff" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.pickerOverlay} onPress={() => setOpen(false)}>
          <View style={[styles.pickerCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            <ThemedText type="h4" style={{ padding: Spacing.md, textAlign: "center" }}>
              {t("select_country")}
            </ThemedText>
            <ScrollView>
              {SHIPPING_COUNTRIES.map((c) => (
                <Pressable
                  key={c.value}
                  style={[
                    styles.pickerItem,
                    { borderColor: theme.border },
                    value.toLowerCase() === c.value.toLowerCase() && { backgroundColor: `${AppColors.primary}15` },
                  ]}
                  onPress={() => { onChange(c.value.toLowerCase()); setOpen(false); }}
                >
                  <ThemedText
                    type="body"
                    style={{
                      color: value.toLowerCase() === c.value.toLowerCase() ? AppColors.primary : theme.text,
                      fontWeight: value.toLowerCase() === c.value.toLowerCase() ? "700" : "400",
                    }}
                  >
                    {c.value} — {t(c.labelKey as any)}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Country Picker with "All Countries" option ───────────────────────────────

function CountryPickerWithAll({ value, onChange, theme, t, language }: CountryPickerProps) {
  const [open, setOpen] = useState(false);
  const allLabel = t("all_countries_label");
  const found = SHIPPING_COUNTRIES.find((c) => c.value.toLowerCase() === value.toLowerCase());
  const label = value === "all" || value === ""
    ? allLabel
    : found
      ? `${found.value} — ${t(found.labelKey as any)}`
      : value.toUpperCase();

  return (
    <>
      <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
        {t("field_country")}
      </ThemedText>
      <Pressable
        style={[styles.countryBtn, { backgroundColor: AppColors.primary }]}
        onPress={() => setOpen(true)}
      >
        <ThemedText type="body" style={{ color: "#fff", fontWeight: "700", flex: 1, textAlign: "center" }}>
          {label}
        </ThemedText>
        <Feather name="chevron-down" size={16} color="#fff" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.pickerOverlay} onPress={() => setOpen(false)}>
          <View style={[styles.pickerCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            <ThemedText type="h4" style={{ padding: Spacing.md, textAlign: "center" }}>
              {t("select_country")}
            </ThemedText>
            <ScrollView>
              <Pressable
                style={[
                  styles.pickerItem,
                  { borderColor: theme.border },
                  (value === "all" || value === "") && { backgroundColor: `${AppColors.primary}15` },
                ]}
                onPress={() => { onChange("all"); setOpen(false); }}
              >
                <ThemedText
                  type="body"
                  style={{
                    color: (value === "all" || value === "") ? AppColors.primary : theme.text,
                    fontWeight: (value === "all" || value === "") ? "700" : "400",
                  }}
                >
                  {allLabel}
                </ThemedText>
              </Pressable>
              {SHIPPING_COUNTRIES.map((c) => (
                <Pressable
                  key={c.value}
                  style={[
                    styles.pickerItem,
                    { borderColor: theme.border },
                    value.toLowerCase() === c.value.toLowerCase() && { backgroundColor: `${AppColors.primary}15` },
                  ]}
                  onPress={() => { onChange(c.value.toLowerCase()); setOpen(false); }}
                >
                  <ThemedText
                    type="body"
                    style={{
                      color: value.toLowerCase() === c.value.toLowerCase() ? AppColors.primary : theme.text,
                      fontWeight: value.toLowerCase() === c.value.toLowerCase() ? "700" : "400",
                    }}
                  >
                    {c.value} — {t(c.labelKey as any)}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Generic Tab Panel ────────────────────────────────────────────────────────

function emptyForm(fields: FieldDef[]): Record<string, string> {
  return fields.reduce((acc, f) => ({ ...acc, [f.key]: "" }), {});
}

function TabPanel({ config }: { config: TabConfig }) {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const isRTL = language === "ar";
  const insets = useSafeAreaInsets();
  const apiUrl = getApiUrl();
  const queryClient = useQueryClient();

  const [addMode, setAddMode] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(() => emptyForm(config.fields));
  const [formCountry, setFormCountry] = useState("all");
  const [pending, setPending] = useState<Record<string, string>[]>([]);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editCountry, setEditCountry] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmClean, setConfirmClean] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" as "success" | "error" });

  const showToast = (message: string, type: "success" | "error" = "success") =>
    setToast({ visible: true, message, type });

  const { data: rows = [], isLoading } = useQuery<RowData[]>({
    queryKey: [config.apiPath],
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [config.apiPath] });

  const handleSaveEntry = () => {
    const entry: Record<string, string> = { ...form };
    if (config.supportsCountry) entry.country = formCountry === "all" ? "" : formCountry;
    setPending((prev) => [...prev, entry]);
    setForm(emptyForm(config.fields));
    if (config.supportsCountry) setFormCountry("all");
    showToast(t("entry_added"));
  };

  const handleSubmitAll = async () => {
    if (pending.length === 0) { showToast(t("no_pending"), "error"); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch(new URL(`${config.apiPath}/bulk`, apiUrl).href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: pending }),
      });
      if (!res.ok) throw new Error();
      showToast(t("changes_saved"));
      setPending([]);
      setAddMode(false);
      await invalidate();
    } catch {
      showToast(t("error"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClean = async () => {
    setIsConfirmLoading(true);
    try {
      const res = await fetch(new URL(`${config.apiPath}/all`, apiUrl).href, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast(t("table_cleaned"));
      setConfirmClean(false);
      await invalidate();
    } catch {
      showToast(t("error"), "error");
    } finally {
      setIsConfirmLoading(false);
    }
  };

  const handleDeleteRow = async () => {
    if (confirmDeleteId === null) return;
    setIsConfirmLoading(true);
    try {
      const res = await fetch(
        new URL(`${config.apiPath}/${confirmDeleteId}`, apiUrl).href,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      showToast(t("entry_deleted"));
      setConfirmDeleteId(null);
      await invalidate();
    } catch {
      showToast(t("error"), "error");
    } finally {
      setIsConfirmLoading(false);
    }
  };

  const startEdit = (row: RowData) => {
    setEditingId(row.id as string | number);
    const ef: Record<string, string> = {};
    config.fields.forEach((f) => { ef[f.key] = String(row[f.key] ?? ""); });
    setEditForm(ef);
    if (config.supportsCountry) setEditCountry(row["country"] ? String(row["country"]) : "all");
  };

  const handleEditSave = async () => {
    if (editingId === null) return;
    setIsSubmitting(true);
    try {
      const body: Record<string, string> = { ...editForm };
      if (config.supportsCountry) body.country = editCountry === "all" ? "" : editCountry;
      const res = await fetch(
        new URL(`${config.apiPath}/${editingId}`, apiUrl).href,
        { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      if (!res.ok) throw new Error();
      showToast(t("changes_saved"));
      setEditingId(null);
      await invalidate();
    } catch {
      showToast(t("error"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderEditCard = (row: RowData) => {
    const rowId = row.id as string | number;
    return (
      <View key={String(rowId)} style={[styles.card, { backgroundColor: theme.backgroundSecondary, borderColor: AppColors.primary, borderWidth: 1.5 }]}>
        {config.fields.map((field) => (
          <View key={field.key} style={styles.fieldRow}>
            <ThemedText type="caption" style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              {t(field.labelKey as any)}
            </ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
              value={editForm[field.key] ?? ""}
              onChangeText={(v) => setEditForm((prev) => ({ ...prev, [field.key]: v }))}
              multiline={field.multiline}
              numberOfLines={field.multiline ? 3 : 1}
              textAlign={isRTL ? "right" : "left"}
              textAlignVertical={field.multiline ? "top" : "center"}
            />
          </View>
        ))}
        {config.supportsCountry && (
          <View style={styles.fieldRow}>
            <CountryPickerWithAll value={editCountry} onChange={setEditCountry} theme={theme} t={t} language={language} />
          </View>
        )}
        <View style={styles.cardActions}>
          <Pressable style={[styles.smallBtn, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, borderWidth: 1 }]} onPress={() => setEditingId(null)}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>{t("cancel")}</ThemedText>
          </Pressable>
          <Pressable style={[styles.smallBtn, { backgroundColor: AppColors.primary, opacity: isSubmitting ? 0.7 : 1 }]} onPress={handleEditSave} disabled={isSubmitting}>
            {isSubmitting
              ? <ActivityIndicator size="small" color="#fff" />
              : <ThemedText type="caption" style={{ color: "#fff", fontWeight: "700" }}>{t("save")}</ThemedText>
            }
          </Pressable>
        </View>
      </View>
    );
  };

  const renderCard = (row: RowData) => {
    const rowId = row.id as string | number;
    if (editingId === rowId) return renderEditCard(row);
    return (
      <View key={String(rowId)} style={[styles.card, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Pressable style={styles.iconBtn} onPress={() => startEdit(row)} testID={`button-edit-${rowId}`}>
            <Feather name="edit-2" size={16} color={AppColors.primary} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => setConfirmDeleteId(rowId)} testID={`button-delete-${rowId}`}>
            <Feather name="trash-2" size={16} color={AppColors.error} />
          </Pressable>
        </View>
        {config.fields.map((field) => (
          <View key={field.key} style={styles.fieldRow}>
            <ThemedText type="caption" style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              {t(field.labelKey as any)}:
            </ThemedText>
            <ThemedText type="small" style={{ flex: 1, color: theme.text }} numberOfLines={2}>
              {String(row[field.key] ?? "-")}
            </ThemedText>
          </View>
        ))}
        {config.supportsCountry && (
          <View style={styles.fieldRow}>
            <ThemedText type="caption" style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              {t("field_country")}:
            </ThemedText>
            <ThemedText type="small" style={{ flex: 1, color: theme.text }} numberOfLines={1}>
              {row["country"] ? String(row["country"]).toUpperCase() : (language === "ar" ? "كل الدول" : "All Countries")}
            </ThemedText>
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast((p) => ({ ...p, visible: false }))} />
      <ConfirmDeleteModal visible={confirmClean} message={t("clean_confirm_msg")} isLoading={isConfirmLoading} onConfirm={handleClean} onCancel={() => setConfirmClean(false)} />
      <ConfirmDeleteModal visible={confirmDeleteId !== null} message={t("delete_confirm_msg")} isLoading={isConfirmLoading} onConfirm={handleDeleteRow} onCancel={() => setConfirmDeleteId(null)} />

      <View style={[styles.actionRow, { borderBottomColor: theme.border }]}>
        <Pressable style={[styles.actionBtn, { backgroundColor: `${AppColors.error}15`, borderColor: AppColors.error }]} onPress={() => setConfirmClean(true)} testID="button-clean">
          <Feather name="trash" size={15} color={AppColors.error} />
          <ThemedText type="caption" style={{ color: AppColors.error, fontWeight: "600" }}>{t("clean")}</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: `${AppColors.primary}15`, borderColor: AppColors.primary }]}
          onPress={() => { setAddMode((v) => !v); setPending([]); setForm(emptyForm(config.fields)); }}
          testID="button-add-toggle"
        >
          <Feather name={addMode ? "x" : "plus"} size={15} color={AppColors.primary} />
          <ThemedText type="caption" style={{ color: AppColors.primary, fontWeight: "600" }}>
            {addMode ? t("cancel") : t("add")}
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: Spacing.md, paddingBottom: insets.bottom + (Platform.OS === "android" ? 340 : Spacing["2xl"]) }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {addMode ? (
          <View>
            {config.fields.map((field) => (
              <View key={field.key} style={styles.fieldContainer}>
                <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
                  {t(field.labelKey as any)}
                </ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                  value={form[field.key]}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, [field.key]: v }))}
                  multiline={field.multiline}
                  numberOfLines={field.multiline ? 3 : 1}
                  textAlign={isRTL ? "right" : "left"}
                  textAlignVertical={field.multiline ? "top" : "center"}
                />
              </View>
            ))}
            {config.supportsCountry && (
              <View style={styles.fieldContainer}>
                <CountryPickerWithAll value={formCountry} onChange={setFormCountry} theme={theme} t={t} language={language} />
              </View>
            )}
            {pending.length > 0 && (
              <View style={[styles.pendingBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <ThemedText type="caption" style={{ color: AppColors.primary, fontWeight: "600" }}>
                  {pending.length} {t("pending_entries")}
                </ThemedText>
                {pending.map((e, i) => (
                  <ThemedText key={i} type="small" style={{ color: theme.textSecondary }}>
                    {Object.values(e).filter(Boolean).join(" · ").substring(0, 70)}
                  </ThemedText>
                ))}
              </View>
            )}
            <View style={styles.submitRow}>
              <Pressable style={[styles.submitBtn, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, borderWidth: 1 }]} onPress={handleSaveEntry}>
                <Feather name="save" size={15} color={AppColors.primary} />
                <ThemedText type="caption" style={{ color: AppColors.primary, fontWeight: "600" }}>{t("save_entry")}</ThemedText>
              </Pressable>
              <Pressable style={[styles.submitBtn, { backgroundColor: AppColors.primary, opacity: isSubmitting ? 0.7 : 1 }]} onPress={handleSubmitAll} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="upload" size={15} color="#fff" />}
                <ThemedText type="caption" style={{ color: "#fff", fontWeight: "700" }}>{t("add_entry")}</ThemedText>
              </Pressable>
            </View>
          </View>
        ) : isLoading ? (
          <ActivityIndicator size="large" color={AppColors.primary} style={{ marginTop: Spacing.xl }} />
        ) : rows.length === 0 ? (
          <ThemedText type="body" style={{ textAlign: "center", color: theme.textSecondary, marginTop: Spacing.xl }}>
            {t("no_coin_data")}
          </ThemedText>
        ) : (
          rows.map((row) => renderCard(row))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Pub Tab Panel (custom — handles "إعلان عرض" and "إعلان عام") ─────────────

type PubAdType = "offer" | "general";

function PubTabPanel() {
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const isRTL = language === "ar";
  const insets = useSafeAreaInsets();
  const apiUrl = getApiUrl();
  const queryClient = useQueryClient();

  // ── Ad type selector ──────────────────────────────────────────────────────
  const [adType, setAdType] = useState<PubAdType>("offer");
  const [typePickerOpen, setTypePickerOpen] = useState(false);

  const currentFields = adType === "offer" ? PUB_OFFER_FIELDS : PUB_GENERAL_FIELDS;
  const currentApiPath = adType === "offer" ? "/api/admin/pub" : "/api/admin/pub2";

  // ── Form state ────────────────────────────────────────────────────────────
  const [addMode, setAddMode] = useState(false);
  const [form, setForm] = useState<Record<string, string>>(() => emptyPubForm("offer"));
  const [formCountry, setFormCountry] = useState("dz");
  const [formActive, setFormActive] = useState<"on" | "off">("on");
  const [pending, setPending] = useState<Array<Record<string, string>>>([]);
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editCountry, setEditCountry] = useState("dz");
  const [editActive, setEditActive] = useState<"on" | "off">("on");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmClean, setConfirmClean] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" as "success" | "error" });

  const showToast = (msg: string, type: "success" | "error" = "success") =>
    setToast({ visible: true, message: msg, type });

  const { data: rows = [], isLoading } = useQuery<RowData[]>({
    queryKey: [currentApiPath],
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [currentApiPath] });

  // Reset form when switching ad type
  const handleTypeChange = (newType: PubAdType) => {
    setAdType(newType);
    setAddMode(false);
    setPending([]);
    setEditingId(null);
    setForm(emptyPubForm(newType));
    setFormCountry("dz");
    setFormActive("on");
    setTypePickerOpen(false);
  };

  function emptyPubForm(type: PubAdType): Record<string, string> {
    const fields = type === "offer" ? PUB_OFFER_FIELDS : PUB_GENERAL_FIELDS;
    return fields.reduce((acc, f) => ({ ...acc, [f.key]: "" }), {});
  }

  const handleSaveEntry = () => {
    const entry: Record<string, string> = { ...form, country: formCountry, active: formActive };
    setPending((prev) => [...prev, entry]);
    setForm(emptyPubForm(adType));
    setFormCountry("dz");
    setFormActive("on");
    showToast(t("entry_added"));
  };

  const handleSubmitAll = async () => {
    if (pending.length === 0) { showToast(t("no_pending"), "error"); return; }
    setIsSubmitting(true);
    try {
      const res = await fetch(new URL(`${currentApiPath}/bulk`, apiUrl).href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: pending }),
      });
      if (!res.ok) throw new Error();
      showToast(t("changes_saved"));
      setPending([]);
      setAddMode(false);
      await invalidate();
    } catch {
      showToast(t("error"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClean = async () => {
    setIsConfirmLoading(true);
    try {
      const res = await fetch(new URL(`${currentApiPath}/all`, apiUrl).href, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToast(t("table_cleaned"));
      setConfirmClean(false);
      await invalidate();
    } catch {
      showToast(t("error"), "error");
    } finally {
      setIsConfirmLoading(false);
    }
  };

  const handleDeleteRow = async () => {
    if (confirmDeleteId === null) return;
    setIsConfirmLoading(true);
    try {
      const res = await fetch(
        new URL(`${currentApiPath}/${confirmDeleteId}`, apiUrl).href,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      showToast(t("entry_deleted"));
      setConfirmDeleteId(null);
      await invalidate();
    } catch {
      showToast(t("error"), "error");
    } finally {
      setIsConfirmLoading(false);
    }
  };

  const startEdit = (row: RowData) => {
    setEditingId(row.id as string | number);
    const ef: Record<string, string> = {};
    currentFields.forEach((f) => { ef[f.key] = String(row[f.key] ?? ""); });
    setEditForm(ef);
    setEditCountry(String(row.country ?? "dz"));
    setEditActive(row.active === "off" ? "off" : "on");
  };

  const handleEditSave = async () => {
    if (editingId === null) return;
    setIsSubmitting(true);
    try {
      const body: Record<string, string> = { ...editForm, country: editCountry, active: editActive };
      const res = await fetch(
        new URL(`${currentApiPath}/${editingId}`, apiUrl).href,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error();
      showToast(t("changes_saved"));
      setEditingId(null);
      await invalidate();
    } catch {
      showToast(t("error"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render edit card ──────────────────────────────────────────────────────
  const renderEditCard = (row: RowData) => {
    const rowId = row.id as string | number;
    return (
      <View key={String(rowId)} style={[styles.card, { backgroundColor: theme.backgroundSecondary, borderColor: AppColors.primary, borderWidth: 1.5 }]}>
        {currentFields.map((field) => (
          <View key={field.key} style={styles.fieldContainer}>
            <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
              {t(field.labelKey as any)}
            </ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}
              value={editForm[field.key] ?? ""}
              onChangeText={(v) => setEditForm((prev) => ({ ...prev, [field.key]: v }))}
              multiline={field.multiline}
              numberOfLines={field.multiline ? 3 : 1}
              textAlign={isRTL ? "right" : "left"}
              textAlignVertical={field.multiline ? "top" : "center"}
            />
          </View>
        ))}
        <View style={styles.fieldContainer}>
          <CountryPicker value={editCountry} onChange={setEditCountry} theme={theme} t={t} language={language} />
        </View>
        <View style={styles.fieldContainer}>
          <ActiveToggle value={editActive} onChange={setEditActive} theme={theme} t={t} />
        </View>
        <View style={styles.cardActions}>
          <Pressable style={[styles.smallBtn, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, borderWidth: 1 }]} onPress={() => setEditingId(null)}>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>{t("cancel")}</ThemedText>
          </Pressable>
          <Pressable style={[styles.smallBtn, { backgroundColor: AppColors.primary, opacity: isSubmitting ? 0.7 : 1 }]} onPress={handleEditSave} disabled={isSubmitting}>
            {isSubmitting
              ? <ActivityIndicator size="small" color="#fff" />
              : <ThemedText type="caption" style={{ color: "#fff", fontWeight: "700" }}>{t("save")}</ThemedText>
            }
          </Pressable>
        </View>
      </View>
    );
  };

  // ── Render display card ───────────────────────────────────────────────────
  const renderCard = (row: RowData) => {
    const rowId = row.id as string | number;
    if (editingId === rowId) return renderEditCard(row);
    return (
      <View key={String(rowId)} style={[styles.card, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Pressable style={styles.iconBtn} onPress={() => startEdit(row)} testID={`button-edit-${rowId}`}>
            <Feather name="edit-2" size={16} color={AppColors.primary} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => setConfirmDeleteId(rowId)} testID={`button-delete-${rowId}`}>
            <Feather name="trash-2" size={16} color={AppColors.error} />
          </Pressable>
        </View>
        {currentFields.map((field) => (
          <View key={field.key} style={styles.fieldRow}>
            <ThemedText type="caption" style={[styles.fieldLabel, { color: theme.textSecondary }]}>
              {t(field.labelKey as any)}:
            </ThemedText>
            <ThemedText type="small" style={{ flex: 1, color: theme.text }} numberOfLines={2}>
              {String(row[field.key] ?? "-")}
            </ThemedText>
          </View>
        ))}
        <View style={styles.fieldRow}>
          <ThemedText type="caption" style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            {t("field_country")}:
          </ThemedText>
          <ThemedText type="small" style={{ flex: 1, color: theme.text }}>
            {String(row.country ?? "-").toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.fieldRow}>
          <ThemedText type="caption" style={[styles.fieldLabel, { color: theme.textSecondary }]}>
            {t("field_active")}:
          </ThemedText>
          <View style={[
            styles.activeBadge,
            { backgroundColor: row.active === "off" ? `${AppColors.secondary}20` : `${AppColors.primary}20` },
          ]}>
            <Feather
              name={row.active === "off" ? "eye-off" : "repeat"}
              size={12}
              color={row.active === "off" ? AppColors.secondary : AppColors.primary}
            />
            <ThemedText type="small" style={{ color: row.active === "off" ? AppColors.secondary : AppColors.primary, fontWeight: "700" }}>
              {row.active === "off" ? t("active_off") : t("active_on")}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

  const adTypeLabel = adType === "offer" ? t("pub_type_offer") : t("pub_type_general");

  return (
    <View style={{ flex: 1 }}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast((p) => ({ ...p, visible: false }))} />
      <ConfirmDeleteModal visible={confirmClean} message={t("clean_confirm_msg")} isLoading={isConfirmLoading} onConfirm={handleClean} onCancel={() => setConfirmClean(false)} />
      <ConfirmDeleteModal visible={confirmDeleteId !== null} message={t("delete_confirm_msg")} isLoading={isConfirmLoading} onConfirm={handleDeleteRow} onCancel={() => setConfirmDeleteId(null)} />

      {/* Ad Type Selector */}
      <View style={[styles.typeRow, { borderBottomColor: theme.border, backgroundColor: theme.backgroundSecondary }]}>
        <ThemedText type="caption" style={{ color: theme.textSecondary, fontWeight: "600" }}>
          {t("pub_type_label")}:
        </ThemedText>
        <Pressable
          style={[styles.typeBtn, { backgroundColor: AppColors.primary }]}
          onPress={() => setTypePickerOpen(true)}
        >
          <ThemedText type="caption" style={{ color: "#fff", fontWeight: "700" }}>
            {adTypeLabel}
          </ThemedText>
          <Feather name="chevron-down" size={14} color="#fff" />
        </Pressable>
      </View>

      {/* Type picker modal */}
      <Modal visible={typePickerOpen} transparent animationType="fade" onRequestClose={() => setTypePickerOpen(false)}>
        <Pressable style={styles.pickerOverlay} onPress={() => setTypePickerOpen(false)}>
          <View style={[styles.pickerCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, maxHeight: 160 }]}>
            <ThemedText type="h4" style={{ padding: Spacing.md, textAlign: "center" }}>
              {t("pub_type_label")}
            </ThemedText>
            {(["offer", "general"] as PubAdType[]).map((type) => (
              <Pressable
                key={type}
                style={[
                  styles.pickerItem,
                  { borderColor: theme.border },
                  adType === type && { backgroundColor: `${AppColors.primary}15` },
                ]}
                onPress={() => handleTypeChange(type)}
              >
                <ThemedText type="body" style={{ color: adType === type ? AppColors.primary : theme.text, fontWeight: adType === type ? "700" : "400" }}>
                  {type === "offer" ? t("pub_type_offer") : t("pub_type_general")}
                </ThemedText>
                {adType === type && <Feather name="check" size={16} color={AppColors.primary} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Action buttons */}
      <View style={[styles.actionRow, { borderBottomColor: theme.border }]}>
        <Pressable style={[styles.actionBtn, { backgroundColor: `${AppColors.error}15`, borderColor: AppColors.error }]} onPress={() => setConfirmClean(true)} testID="button-clean">
          <Feather name="trash" size={15} color={AppColors.error} />
          <ThemedText type="caption" style={{ color: AppColors.error, fontWeight: "600" }}>{t("clean")}</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: `${AppColors.primary}15`, borderColor: AppColors.primary }]}
          onPress={() => { setAddMode((v) => !v); setPending([]); setForm(emptyPubForm(adType)); setFormCountry("dz"); setFormActive("on"); }}
          testID="button-add-toggle"
        >
          <Feather name={addMode ? "x" : "plus"} size={15} color={AppColors.primary} />
          <ThemedText type="caption" style={{ color: AppColors.primary, fontWeight: "600" }}>
            {addMode ? t("cancel") : t("add")}
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: insets.bottom + (Platform.OS === "android" ? 340 : Spacing["2xl"]) }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {addMode ? (
          <View>
            {/* Country picker */}
            <View style={styles.fieldContainer}>
              <CountryPicker value={formCountry} onChange={setFormCountry} theme={theme} t={t} language={language} />
            </View>

            {/* Dynamic fields */}
            {currentFields.map((field) => (
              <View key={field.key} style={styles.fieldContainer}>
                <ThemedText type="caption" style={[styles.label, { color: theme.textSecondary }]}>
                  {t(field.labelKey as any)}
                </ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                  value={form[field.key] ?? ""}
                  onChangeText={(v) => setForm((prev) => ({ ...prev, [field.key]: v }))}
                  multiline={field.multiline}
                  numberOfLines={field.multiline ? 3 : 1}
                  textAlign={isRTL ? "right" : "left"}
                  textAlignVertical={field.multiline ? "top" : "center"}
                />
              </View>
            ))}

            {/* Active toggle */}
            <View style={styles.fieldContainer}>
              <ActiveToggle value={formActive} onChange={setFormActive} theme={theme} t={t} />
            </View>

            {pending.length > 0 && (
              <View style={[styles.pendingBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <ThemedText type="caption" style={{ color: AppColors.primary, fontWeight: "600" }}>
                  {pending.length} {t("pending_entries")}
                </ThemedText>
                {pending.map((e, i) => (
                  <ThemedText key={i} type="small" style={{ color: theme.textSecondary }}>
                    {e.country?.toUpperCase()} — {Object.values(e).filter(Boolean).join(" · ").substring(0, 60)}
                  </ThemedText>
                ))}
              </View>
            )}

            <View style={styles.submitRow}>
              <Pressable style={[styles.submitBtn, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, borderWidth: 1 }]} onPress={handleSaveEntry}>
                <Feather name="save" size={15} color={AppColors.primary} />
                <ThemedText type="caption" style={{ color: AppColors.primary, fontWeight: "600" }}>{t("save_entry")}</ThemedText>
              </Pressable>
              <Pressable style={[styles.submitBtn, { backgroundColor: AppColors.primary, opacity: isSubmitting ? 0.7 : 1 }]} onPress={handleSubmitAll} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="upload" size={15} color="#fff" />}
                <ThemedText type="caption" style={{ color: "#fff", fontWeight: "700" }}>{t("add_entry")}</ThemedText>
              </Pressable>
            </View>
          </View>
        ) : isLoading ? (
          <ActivityIndicator size="large" color={AppColors.primary} style={{ marginTop: Spacing.xl }} />
        ) : rows.length === 0 ? (
          <ThemedText type="body" style={{ textAlign: "center", color: theme.textSecondary, marginTop: Spacing.xl }}>
            {t("no_coin_data")}
          </ThemedText>
        ) : (
          rows.map((row) => renderCard(row))
        )}
      </ScrollView>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AdminOtherScreen() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState(0);

  // All tabs including the pub tab (index 2 = pub, injected between sale and cart)
  const allTabs = [
    TAB_CONFIGS[0], // update
    TAB_CONFIGS[1], // social
    TAB_CONFIGS[2], // sale
    { key: "pub", labelKey: "tab_pub", apiPath: "", fields: [] }, // pub (custom)
    TAB_CONFIGS[3], // cart
  ];

  return (
    <ThemedView style={{ flex: 1 }}>
      <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
          {allTabs.map((tab, i) => (
            <Pressable
              key={tab.key}
              style={[styles.tab, activeTab === i && { borderBottomColor: AppColors.primary, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(i)}
              testID={`tab-${tab.key}`}
            >
              <ThemedText
                type="body"
                style={[
                  styles.tabLabel,
                  { color: activeTab === i ? AppColors.primary : theme.textSecondary },
                  activeTab === i ? { fontWeight: "700" } : {},
                ]}
              >
                {t(tab.labelKey as any)}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {allTabs[activeTab].key === "pub"
        ? <PubTabPanel key="pub" />
        : <TabPanel key={allTabs[activeTab].key} config={allTabs[activeTab] as TabConfig} />
      }
    </ThemedView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBar: { borderBottomWidth: StyleSheet.hairlineWidth },
  tabBarContent: { flexDirection: "row", paddingHorizontal: Spacing.sm },
  tab: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabLabel: { fontSize: 14 },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  typeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.md,
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  card: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  cardHeader: { flexDirection: "row", justifyContent: "flex-end", gap: Spacing.sm, marginBottom: Spacing.xs },
  iconBtn: { padding: Spacing.xs },
  fieldRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.xs, flexWrap: "wrap" },
  fieldLabel: { fontSize: 12, fontWeight: "600", minWidth: 70 },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  cardActions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm },
  smallBtn: { flex: 1, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.sm, alignItems: "center", justifyContent: "center" },
  fieldContainer: { marginBottom: Spacing.md },
  label: { marginBottom: Spacing.xs, fontSize: 12, fontWeight: "600" },
  input: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: 14 },
  pendingBox: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, gap: Spacing.xs },
  submitRow: { flexDirection: "row", gap: Spacing.md, marginTop: Spacing.sm },
  submitBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing.xs, padding: Spacing.md, borderRadius: BorderRadius.md },
  // Country picker
  countryBtn: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
  },
  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: Spacing.xl },
  pickerCard: { width: "100%", borderRadius: BorderRadius.xl, borderWidth: 1, overflow: "hidden", maxHeight: 400 },
  pickerItem: { padding: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
