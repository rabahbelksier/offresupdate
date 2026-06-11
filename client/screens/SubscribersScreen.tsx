import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Toast } from "@/components/Toast";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/contexts/LanguageContext";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { SHIPPING_COUNTRIES } from "@/constants/countries";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Subscriber {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  online: string | null;
  createdAt: string | null;
  temps: number | null;
  desactive: string | null;
}

type PeriodFilter = "all" | "this_month" | "last_month";
type SortFilter = "registration" | "name" | "most_connected" | "recently_connected";

const PAGE_SIZE = 50;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(totalSeconds: number, t: (k: any) => string): string {
  if (!totalSeconds || totalSeconds <= 0) return `0${t("time_seconds")}`;
  const months  = Math.floor(totalSeconds / 2592000);
  const weeks   = Math.floor((totalSeconds % 2592000) / 604800);
  const days    = Math.floor((totalSeconds % 604800) / 86400);
  const hours   = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const parts: string[] = [];
  if (months  > 0) parts.push(`${months}${t("time_months")}`);
  if (weeks   > 0) parts.push(`${weeks}${t("time_weeks")}`);
  if (days    > 0) parts.push(`${days}${t("time_days")}`);
  if (hours   > 0) parts.push(`${hours}${t("time_hours")}`);
  if (minutes > 0) parts.push(`${minutes}${t("time_minutes")}`);
  if (seconds > 0) parts.push(`${seconds}${t("time_seconds")}`);
  return parts.length > 0 ? parts.join(" ") : `0${t("time_seconds")}`;
}

function formatRelativeTime(isoDate: string | null, t: (k: any) => string): string | null {
  if (!isoDate) return null;
  const diffMs = Date.now() - new Date(isoDate).getTime();
  if (diffMs < 0) return null;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours   = Math.floor(diffMinutes / 60);
  const diffDays    = Math.floor(diffHours / 24);
  const diffWeeks   = Math.floor(diffDays / 7);
  const diffMonths  = Math.floor(diffDays / 30);

  if (diffSeconds < 60) return t("just_now");
  if (diffMinutes < 60) return `${t("active_since")} ${diffMinutes} ${t("time_minutes")}`;
  if (diffHours   < 24) return `${t("active_since")} ${diffHours} ${t("time_hours")}`;
  if (diffDays    <  7) return `${t("active_since")} ${diffDays} ${t("time_days")}`;
  if (diffWeeks   <  4) return `${t("active_since")} ${diffWeeks} ${t("time_weeks")}`;
  return `${t("active_since")} ${diffMonths} ${t("time_months")}`;
}

function getCountryLabel(code: string, t: (key: any) => string): string {
  const found = SHIPPING_COUNTRIES.find((c) => c.value === code);
  if (!found) return code;
  return t(found.labelKey as any);
}

function isThisMonth(createdAt: string | null): boolean {
  if (!createdAt) return false;
  const now = new Date();
  const d = new Date(createdAt);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function isLastMonth(createdAt: string | null): boolean {
  if (!createdAt) return false;
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const d = new Date(createdAt);
  return d.getFullYear() === lastMonth.getFullYear() && d.getMonth() === lastMonth.getMonth();
}

// ─── Filter Pill ─────────────────────────────────────────────────────────────

interface FilterPillProps {
  label: string;
  value: string;
  onPress: () => void;
  theme: any;
  isRTL: boolean;
}

function FilterPill({ label, value, onPress, theme, isRTL }: FilterPillProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterPill,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: AppColors.primary,
          opacity: pressed ? 0.75 : 1,
          flexDirection: isRTL ? "row-reverse" : "row",
        },
      ]}
    >
      <Feather
        name="chevron-down"
        size={10}
        color={AppColors.primary}
        style={isRTL ? { marginRight: 2 } : { marginLeft: 2 }}
      />
      <ThemedText
        type="caption"
        style={{ color: theme.text, fontWeight: "700", fontSize: 11, marginHorizontal: 2 }}
        numberOfLines={1}
      >
        {value}
      </ThemedText>
      <ThemedText
        type="caption"
        style={{ color: AppColors.primary, fontWeight: "600", fontSize: 11 }}
        numberOfLines={1}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

// ─── Dropdown Modal ───────────────────────────────────────────────────────────

interface DropdownOption { label: string; value: string }

interface DropdownModalProps {
  visible: boolean;
  options: DropdownOption[];
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
  theme: any;
  isRTL: boolean;
}

function DropdownModal({ visible, options, selected, onSelect, onClose, theme, isRTL }: DropdownModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.dropdownOverlay} onPress={onClose}>
        <View style={[styles.dropdownCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          {options.map((opt) => (
            <Pressable
              key={opt.value}
              style={({ pressed }) => [
                styles.dropdownItem,
                {
                  backgroundColor: selected === opt.value ? `${AppColors.primary}18` : "transparent",
                  opacity: pressed ? 0.7 : 1,
                  flexDirection: isRTL ? "row-reverse" : "row",
                },
              ]}
              onPress={() => { onSelect(opt.value); onClose(); }}
            >
              <ThemedText
                type="body"
                style={{
                  color: selected === opt.value ? AppColors.primary : theme.text,
                  fontWeight: selected === opt.value ? "700" : "400",
                  fontSize: 14,
                  textAlign: isRTL ? "right" : "left",
                  flex: 1,
                }}
              >
                {opt.label}
              </ThemedText>
              {selected === opt.value && <Feather name="check" size={15} color={AppColors.primary} />}
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SubscribersScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { t, language } = useLanguage();
  const isRTL = language === "ar";

  const listRef = useRef<FlatList>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSub, setSelectedSub] = useState<Subscriber | null>(null);
  const [toast, setToast] = useState({ visible: false, message: "", type: "success" as const });

  // Filters — reset when screen is focused
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [sortBy, setSortBy] = useState<SortFilter>("registration");
  const [countryFilter, setCountryFilter] = useState("all");

  // Pagination
  const [page, setPage] = useState(0);

  // Dropdown visibility
  const [periodOpen, setPeriodOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);

  // Reset all filters and page when navigating back to this screen
  useFocusEffect(
    useCallback(() => {
      setPeriod("all");
      setSortBy("registration");
      setCountryFilter("all");
      setSearchQuery("");
      setPage(0);
    }, [])
  );

  const { data: subscribers = [], isLoading } = useQuery<Subscriber[]>({
    queryKey: ["/api/admin/subscribers"],
    queryFn: async () => {
      const apiUrl = getApiUrl();
      const res = await fetch(new URL("/api/admin/subscribers", apiUrl).href);
      if (!res.ok) throw new Error("Failed to fetch subscribers");
      return res.json();
    },
    staleTime: 0,
    refetchInterval: 15_000,
  });

  const onlineCount = subscribers.filter((s) => s.online === "on").length;

  // All 11 countries sorted by localized name
  const countries = useMemo(() => {
    return [...SHIPPING_COUNTRIES].sort((a, b) =>
      t(a.labelKey as any).localeCompare(t(b.labelKey as any))
    );
  }, [language]);

  // ─── Ticker for real-time relative time display ───────────────────────────
  // Ticks every 30s so "active since X minutes" increments without waiting for
  // the next server refetch (which happens every 15 s but doesn't trigger a
  // re-render of memoized relative-time strings).
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const isDefaultFilters = period === "all" && sortBy === "registration" && countryFilter === "all";

  const filtered = useMemo(() => {
    let list = [...subscribers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.id.includes(q)
      );
    }

    if (period === "this_month") {
      list = list.filter((s) => isThisMonth(s.createdAt));
    } else if (period === "last_month") {
      list = list.filter((s) => isLastMonth(s.createdAt));
    }

    if (countryFilter !== "all") {
      list = list.filter((s) => s.country === countryFilter);
    }

    if (sortBy === "name") {
      list.sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
    } else if (sortBy === "most_connected") {
      list.sort((a, b) => (b.temps ?? 0) - (a.temps ?? 0));
    } else if (sortBy === "recently_connected") {
      // Online users first (they are currently connected — order among them is irrelevant)
      // then offline users sorted by desactive descending (most recently disconnected first)
      // users with no desactive timestamp go to the very end
      list.sort((a, b) => {
        const aOnline = a.online === "on";
        const bOnline = b.online === "on";
        if (aOnline && bOnline) return 0;
        if (aOnline) return -1;
        if (bOnline) return 1;
        if (!a.desactive && !b.desactive) return 0;
        if (!a.desactive) return 1;
        if (!b.desactive) return -1;
        return new Date(b.desactive).getTime() - new Date(a.desactive).getTime();
      });
    } else {
      if (isDefaultFilters) {
        list.sort((a, b) => {
          const aOnline = a.online === "on" ? 1 : 0;
          const bOnline = b.online === "on" ? 1 : 0;
          if (bOnline !== aOnline) return bOnline - aOnline;
          return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
        });
      } else {
        list.sort((a, b) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
        );
      }
    }

    return list;
  }, [subscribers, searchQuery, period, countryFilter, sortBy, isDefaultFilters]);

  // Paginated slice
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = useMemo(
    () => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filtered, page]
  );

  // Reset page when filters/search change
  const handleSetPeriod = useCallback((v: PeriodFilter) => { setPeriod(v); setPage(0); }, []);
  const handleSetSort  = useCallback((v: SortFilter)  => { setSortBy(v);  setPage(0); }, []);
  const handleSetCountry = useCallback((v: string)    => { setCountryFilter(v); setPage(0); }, []);
  const handleSearch = useCallback((v: string) => { setSearchQuery(v); setPage(0); }, []);

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage);
    setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 50);
  }, []);

  const showToast = (message: string) => {
    setToast({ visible: true, message, type: "success" });
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text);
      if (Platform.OS !== "web") await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showToast(`${label} ${t("copied_to_clipboard")}`);
    } catch {}
  };

  // Pill labels
  const periodLabel  = period === "all" ? t("filter_all") : period === "this_month" ? t("filter_this_month") : t("filter_last_month");
  const sortLabel =
    sortBy === "registration"      ? t("sort_registration") :
    sortBy === "name"              ? t("sort_name") :
    sortBy === "most_connected"    ? t("sort_most_connected") :
                                     t("sort_recently_connected");
  const countryLabel = countryFilter === "all" ? t("filter_all") : getCountryLabel(countryFilter, t);

  // Dropdown options
  const periodOptions: DropdownOption[] = [
    { label: t("filter_all"), value: "all" },
    { label: t("filter_this_month"), value: "this_month" },
    { label: t("filter_last_month"), value: "last_month" },
  ];
  const sortOptions: DropdownOption[] = [
    { label: t("sort_registration"),       value: "registration" },
    { label: t("sort_name"),               value: "name" },
    { label: t("sort_most_connected"),     value: "most_connected" },
    { label: t("sort_recently_connected"), value: "recently_connected" },
  ];
  const countryOptions: DropdownOption[] = [
    { label: t("filter_all"), value: "all" },
    ...countries.map((c) => ({ label: t(c.labelKey as any), value: c.value })),
  ];

  const renderItem = useCallback(({ item }: { item: Subscriber }) => {
    const isOnline = item.online === "on";
    const relativeTime = !isOnline ? formatRelativeTime(item.desactive, t) : null;
    const statusText = isOnline
      ? t("online_label")
      : relativeTime ?? t("offline_label");

    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
          pressed && { opacity: 0.8 },
        ]}
        onPress={() => setSelectedSub(item)}
        testID={`card-subscriber-${item.id}`}
      >
        <View style={[styles.cardLeft, { direction: "ltr" } as any]}>
          <View style={[styles.onlineDot, { backgroundColor: isOnline ? "#22c55e" : theme.border }]} />
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: "600", textAlign: "left" }}>
              {item.firstName} {item.lastName}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: "left" }}>
              {item.id}
            </ThemedText>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: isOnline ? "#22c55e20" : `${theme.border}50` }]}>
          <ThemedText
            type="caption"
            style={{ color: isOnline ? "#22c55e" : theme.textSecondary, fontWeight: "600", fontSize: 11 }}
            numberOfLines={1}
          >
            {statusText}
          </ThemedText>
        </View>
      </Pressable>
    );
  }, [theme, t]);

  // ─── Modal info row (respects RTL) ───────────────────────────────────────────
  const InfoRow = useCallback(({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={[styles.infoRow, isRTL && { flexDirection: "row-reverse" }]}>
      <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }}>
        {label}
      </ThemedText>
      {children}
    </View>
  ), [isRTL, theme]);

  return (
    <ThemedView style={styles.container}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast(p => ({ ...p, visible: false }))} />

      {/* Dropdown modals */}
      <DropdownModal visible={periodOpen}  options={periodOptions}  selected={period}         onSelect={(v) => handleSetPeriod(v as PeriodFilter)} onClose={() => setPeriodOpen(false)}  theme={theme} isRTL={isRTL} />
      <DropdownModal visible={sortOpen}    options={sortOptions}    selected={sortBy}          onSelect={(v) => handleSetSort(v as SortFilter)}    onClose={() => setSortOpen(false)}    theme={theme} isRTL={isRTL} />
      <DropdownModal visible={countryOpen} options={countryOptions} selected={countryFilter}   onSelect={handleSetCountry}                          onClose={() => setCountryOpen(false)} theme={theme} isRTL={isRTL} />

      <FlatList
        ref={listRef}
        data={paginated}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: Spacing.lg, paddingTop: headerHeight + Spacing.md }}>
            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <Feather name="users" size={20} color={AppColors.primary} />
                <ThemedText type="h3" style={styles.statNumber}>{subscribers.length}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>{t("total_subscribers")}</ThemedText>
              </View>
              <View style={[styles.statCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <View style={[styles.onlineDot, { backgroundColor: "#22c55e", width: 12, height: 12, borderRadius: 6 }]} />
                <ThemedText type="h3" style={[styles.statNumber, { color: "#22c55e" }]}>{onlineCount}</ThemedText>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>{t("online_now")}</ThemedText>
              </View>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchInputContainer, { backgroundColor: theme.backgroundSecondary, borderColor: searchQuery ? AppColors.primary : theme.border }]}>
              <Feather name="search" size={18} color={searchQuery ? AppColors.primary : theme.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                value={searchQuery}
                onChangeText={handleSearch}
                placeholder={t("search_subscribers")}
                placeholderTextColor={theme.textSecondary}
                textAlign={isRTL ? "right" : "left"}
                testID="input-search-subscribers"
              />
              {searchQuery.length > 0 ? (
                <Pressable onPress={() => handleSearch("")}>
                  <Feather name="x" size={18} color={theme.textSecondary} />
                </Pressable>
              ) : null}
            </View>

            {/* Filter Pills — centered row */}
            <View style={styles.filterRow}>
              <FilterPill
                label={t("filter_period") + ":"}
                value={periodLabel}
                onPress={() => setPeriodOpen(true)}
                theme={theme}
                isRTL={isRTL}
              />
              <FilterPill
                label={t("filter_sort") + ":"}
                value={sortLabel}
                onPress={() => setSortOpen(true)}
                theme={theme}
                isRTL={isRTL}
              />
              <FilterPill
                label={t("filter_country") + ":"}
                value={countryLabel}
                onPress={() => setCountryOpen(true)}
                theme={theme}
                isRTL={isRTL}
              />
            </View>

            <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.sm, textAlign: "center" }}>
              {filtered.length} / {subscribers.length}
            </ThemedText>
          </View>
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={[styles.paginationRow, { paddingBottom: insets.bottom + Spacing.xl }]}>
              <Pressable
                onPress={() => goToPage(page - 1)}
                disabled={page === 0}
                style={({ pressed }) => [
                  styles.pageBtn,
                  { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, opacity: page === 0 ? 0.35 : pressed ? 0.7 : 1 },
                ]}
              >
                <Feather name="chevron-left" size={18} color={AppColors.primary} />
                <ThemedText type="caption" style={{ color: AppColors.primary, fontWeight: "700" }}>{t("previous") ?? "السابق"}</ThemedText>
              </Pressable>

              <ThemedText type="caption" style={{ color: theme.textSecondary, fontWeight: "600" }}>
                {page + 1} / {totalPages}
              </ThemedText>

              <Pressable
                onPress={() => goToPage(page + 1)}
                disabled={page >= totalPages - 1}
                style={({ pressed }) => [
                  styles.pageBtn,
                  { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, opacity: page >= totalPages - 1 ? 0.35 : pressed ? 0.7 : 1 },
                ]}
              >
                <ThemedText type="caption" style={{ color: AppColors.primary, fontWeight: "700" }}>{t("next") ?? "التالي"}</ThemedText>
                <Feather name="chevron-right" size={18} color={AppColors.primary} />
              </Pressable>
            </View>
          ) : (
            <View style={{ paddingBottom: insets.bottom + Spacing.xl }} />
          )
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator size="large" color={AppColors.primary} style={{ marginTop: 60 }} />
          ) : (
            <View style={styles.empty}>
              <Feather name="users" size={48} color={theme.textSecondary} />
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
                {t("no_subscribers")}
              </ThemedText>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 0 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Subscriber Detail Modal */}
      <Modal
        visible={!!selectedSub}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedSub(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedSub(null)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]} onPress={() => {}}>
            {/* Header — title always centered, close icon on the correct side */}
            <View style={[styles.modalHeader, isRTL && { flexDirection: "row-reverse" }]}>
              <Pressable onPress={() => setSelectedSub(null)}>
                <Feather name="x" size={22} color={theme.textSecondary} />
              </Pressable>
              <ThemedText type="h3" style={{ flex: 1, textAlign: "center" }}>
                {t("subscriber_info")}
              </ThemedText>
              {/* Invisible spacer to keep title truly centered */}
              <View style={{ width: 22 }} />
            </View>

            {selectedSub && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <InfoRow label={t("first_name")}>
                  <ThemedText type="body" style={{ fontWeight: "600", textAlign: isRTL ? "left" : "right" }}>
                    {selectedSub.firstName}
                  </ThemedText>
                </InfoRow>
                <InfoRow label={t("last_name")}>
                  <ThemedText type="body" style={{ fontWeight: "600", textAlign: isRTL ? "left" : "right" }}>
                    {selectedSub.lastName}
                  </ThemedText>
                </InfoRow>
                <InfoRow label={t("country_label")}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    {getCountryLabel(selectedSub.country, t)}
                  </ThemedText>
                </InfoRow>

                {/* Online status — show relative time if offline but has desactive */}
                <InfoRow label={t("online_status")}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={[styles.onlineDot, { backgroundColor: selectedSub.online === "on" ? "#22c55e" : theme.border }]} />
                    <ThemedText
                      type="body"
                      style={{ fontWeight: "600", color: selectedSub.online === "on" ? "#22c55e" : theme.textSecondary }}
                      numberOfLines={2}
                    >
                      {selectedSub.online === "on"
                        ? t("online_label")
                        : (formatRelativeTime(selectedSub.desactive, t) ?? t("offline_label"))}
                    </ThemedText>
                  </View>
                </InfoRow>

                {/* Total connection time */}
                <View style={[
                  styles.infoRow,
                  isRTL && { flexDirection: "row-reverse" },
                  { backgroundColor: `${AppColors.primary}0d`, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm },
                ]}>
                  <ThemedText type="caption" style={{ color: theme.textSecondary, textAlign: isRTL ? "right" : "left" }}>
                    {t("total_time")}
                  </ThemedText>
                  <ThemedText type="body" style={{ fontWeight: "700", color: AppColors.primary }}>
                    {formatDuration(selectedSub.temps ?? 0, t)}
                  </ThemedText>
                </View>

                {/* Copyable Email */}
                <Pressable
                  style={[styles.copyRow, { backgroundColor: `${AppColors.primary}10`, borderColor: `${AppColors.primary}30`, flexDirection: isRTL ? "row-reverse" : "row" }]}
                  onPress={() => copyToClipboard(selectedSub.email, t("email"))}
                >
                  <Feather name="mail" size={16} color={AppColors.primary} />
                  <ThemedText type="body" style={{ color: AppColors.primary, flex: 1, marginHorizontal: Spacing.sm }} numberOfLines={1}>
                    {selectedSub.email}
                  </ThemedText>
                  <Feather name="copy" size={14} color={AppColors.primary} />
                </Pressable>

                {/* Copyable ID */}
                <Pressable
                  style={[styles.copyRow, { backgroundColor: `${AppColors.primary}10`, borderColor: `${AppColors.primary}30`, flexDirection: isRTL ? "row-reverse" : "row" }]}
                  onPress={() => copyToClipboard(selectedSub.id, t("copy_id"))}
                >
                  <Feather name="hash" size={16} color={AppColors.primary} />
                  <ThemedText type="body" style={{ color: AppColors.primary, flex: 1, marginHorizontal: Spacing.sm }}>
                    {selectedSub.id}
                  </ThemedText>
                  <Feather name="copy" size={14} color={AppColors.primary} />
                </Pressable>

                {/* Registration date */}
                {selectedSub.createdAt && (
                  <InfoRow label={t("joined_at")}>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>
                      {new Date(selectedSub.createdAt).toLocaleDateString()}
                    </ThemedText>
                  </InfoRow>
                )}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    alignItems: "center",
    gap: Spacing.xs,
  },
  statNumber: {
    fontWeight: "700",
    fontSize: 24,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 15,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  filterPill: {
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: 2,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xs,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
    marginRight: Spacing.sm,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
    maxWidth: 130,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
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
    overflow: "hidden",
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalBody: {
    padding: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  copyRow: {
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  dropdownCard: {
    width: "85%",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  dropdownItem: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
});
