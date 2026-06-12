import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  TextInput,
  Keyboard,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useFavorites } from "@/src/hooks/use-favorites";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

type Hotel = {
  id: string;
  name: string;
  image_url: string;
  location: string;
  phone: string;
  email: string;
  website?: string;
  country?: string;
  kind?: "hotel" | "restaurant";
  description?: string;
};

type ViewMode = "hotel" | "restaurant" | "favorites";

type Row =
  | { type: "header"; key: string; country: string; count: number }
  | { type: "hotel"; key: string; hotel: Hotel };

type Suggestion = {
  label: string;
  icon: "bed-outline" | "restaurant-outline" | "location-outline";
};

const LOCATION_STOPWORDS = new Set([
  "rruga", "bulevardi", "bulevar", "blv", "blvd", "boulevard", "avenue",
  "street", "ulica", "settlement", "kej", "str", "number", "palmira",
  "kralja", "majke", "via",
]);

const COLORS = {
  surface: "#F2F2F7",
  surfaceSecondary: "#FFFFFF",
  onSurface: "#1C1C1E",
  onSurfaceMuted: "#6E6E73",
  brandPrimary: "#003580",
  brandSecondary: "#0071C2",
  brandTertiary: "#E6F0F9",
  border: "#E5E5EA",
  favorite: "#FF3B30",
};

export default function Index() {
  const router = useRouter();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<ViewMode>("hotel");
  const { isFavorite, toggle } = useFavorites();
  const [searchFocused, setSearchFocused] = useState(false);

  const suggestions = useMemo<Suggestion[]>(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    if (!q) return [];
    const seen = new Set<string>();
    const out: Suggestion[] = [];

    for (const h of hotels) {
      const name = h.name.trim();
      const lower = name.toLocaleLowerCase("tr");
      if (lower.startsWith(q) && lower !== q && !seen.has(lower)) {
        seen.add(lower);
        out.push({
          label: name,
          icon: h.kind === "restaurant" ? "restaurant-outline" : "bed-outline",
        });
      }
    }

    for (const h of hotels) {
      for (const raw of (h.location ?? "").split(/[\s,./]+/)) {
        const word = raw.replace(/[^\p{L}]/gu, "");
        if (word.length < 3) continue;
        const lower = word.toLocaleLowerCase("tr");
        if (LOCATION_STOPWORDS.has(lower)) continue;
        if (lower.startsWith(q) && lower !== q && !seen.has(lower)) {
          seen.add(lower);
          out.push({ label: word, icon: "location-outline" });
        }
      }
    }

    return out.slice(0, 5);
  }, [query, hotels]);

  const fetchHotels = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${BACKEND_URL}/api/hotels`);
      if (!res.ok) throw new Error("Sunucu hatası");
      const data: Hotel[] = await res.json();
      setHotels(data);
    } catch (e: any) {
      setError(e?.message ?? "Bir hata oluştu");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHotels();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    return hotels.filter((h) => {
      if (mode === "favorites") {
        if (!isFavorite(h.id)) return false;
      } else if (mode === "restaurant") {
        if (h.kind !== "restaurant") return false;
      } else {
        if (h.kind && h.kind !== "hotel") return false;
      }
      if (!q) return true;
      return (
        h.name.toLocaleLowerCase("tr").includes(q) ||
        h.location.toLocaleLowerCase("tr").includes(q)
      );
    });
  }, [hotels, query, mode, isFavorite]);

  const listData = useMemo<Row[]>(() => {
    const groups = new Map<string, Hotel[]>();
    for (const h of filtered) {
      const country = h.country?.trim() || "Diğer";
      const group = groups.get(country);
      if (group) group.push(h);
      else groups.set(country, [h]);
    }
    const countries = [...groups.keys()].sort((a, b) => {
      if (a === "Diğer") return 1;
      if (b === "Diğer") return -1;
      return a.localeCompare(b, "tr");
    });
    const rows: Row[] = [];
    for (const country of countries) {
      const items = groups
        .get(country)!
        .sort((a, b) => a.name.localeCompare(b.name, "tr"));
      rows.push({
        type: "header",
        key: `country-${country}`,
        country,
        count: items.length,
      });
      for (const hotel of items) {
        rows.push({ type: "hotel", key: hotel.id, hotel });
      }
    }
    return rows;
  }, [filtered]);

  const renderRow = ({ item: row }: { item: Row }) => {
    if (row.type === "header") {
      return (
        <View style={styles.countryHeader} testID={`country-${row.country}`}>
          <Ionicons name="earth" size={15} color={COLORS.brandSecondary} />
          <Text style={styles.countryHeaderText}>{row.country}</Text>
          <Text style={styles.countryHeaderCount}>{row.count}</Text>
        </View>
      );
    }
    const item = row.hotel;
    const fav = isFavorite(item.id);
    return (
      <Pressable
        testID={`hotel-card-${item.id}`}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => router.push(`/hotel/${item.id}`)}
      >
        <View>
          <Image
            source={{ uri: item.image_url }}
            style={styles.cardImage}
            contentFit="cover"
            transition={200}
          />
          <Pressable
            testID={`fav-toggle-${item.id}`}
            style={styles.favBtn}
            onPress={(e) => {
              e.stopPropagation();
              toggle(item.id);
            }}
            hitSlop={8}
          >
            <Ionicons
              name={fav ? "heart" : "heart-outline"}
              size={22}
              color={fav ? COLORS.favorite : "#FFFFFF"}
            />
          </Pressable>
        </View>
        <View style={styles.cardTextBox} testID={`hotel-name-box-${item.id}`}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.name}
            </Text>
            {item.country ? (
              <View style={styles.countryBadge}>
                <Text style={styles.countryBadgeText}>{item.country}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.cardLocationRow}>
            <Ionicons
              name="location-outline"
              size={14}
              color={COLORS.onSurfaceMuted}
            />
            <Text style={styles.cardLocation} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  const Header = (
    <View style={styles.headerWrap}>
      {/* Logo + butonlar */}
      <View style={styles.header} testID="home-header">
        <View style={styles.logoRow}>
          <Image
            source={require("../assets/images/ustour-logo.png")}
            style={styles.logo}
            contentFit="contain"
          />
          <View style={styles.headerActions}>
            <Pressable
              onPress={() => router.push("/map")}
              hitSlop={8}
              style={styles.actionBtn}
            >
              <Ionicons name="map-outline" size={20} color="#FFFFFF" />
            </Pressable>
            <Pressable
              testID="admin-link"
              onPress={() => router.push("/admin")}
              hitSlop={8}
              style={styles.actionBtn}
            >
              <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
        <Text style={styles.appName}>NaviGuide</Text>
        <Text style={styles.appTagline}>
          Sadece konumu değil, kendini bulduğun yer :)
        </Text>
      </View>

      {/* Sekmeler */}
      <View style={styles.chipsRow}>
        <Chip
          testID="chip-hotels"
          label="Oteller"
          icon="bed-outline"
          active={mode === "hotel"}
          onPress={() => setMode("hotel")}
        />
        <Chip
          testID="chip-restaurants"
          label="Restoranlar"
          icon="restaurant-outline"
          active={mode === "restaurant"}
          onPress={() => setMode("restaurant")}
        />
        <Chip
          testID="chip-favorites"
          label="Favoriler"
          icon="heart"
          active={mode === "favorites"}
          onPress={() => setMode("favorites")}
        />
      </View>

      {/* Arama kutusu — sekmelerin altında */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBox} testID="search-box">
          <Ionicons name="search" size={18} color={COLORS.onSurfaceMuted} />
          <TextInput
            testID="search-input"
            value={query}
            onChangeText={setQuery}
            placeholder="Otel veya konum ara..."
            placeholderTextColor={COLORS.onSurfaceMuted}
            style={styles.searchInput}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
          />
          {query.length > 0 && (
            <Pressable
              testID="search-clear"
              onPress={() => setQuery("")}
              hitSlop={8}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={COLORS.onSurfaceMuted}
              />
            </Pressable>
          )}
        </View>

        {searchFocused && suggestions.length > 0 && (
          <View style={styles.suggestBox} testID="search-suggestions">
            {suggestions.map((s) => (
              <Pressable
                key={`${s.icon}-${s.label}`}
                style={({ pressed }) => [
                  styles.suggestRow,
                  pressed && styles.suggestRowPressed,
                ]}
                onPress={() => {
                  setQuery(s.label);
                  Keyboard.dismiss();
                }}
              >
                <Ionicons
                  name={s.icon}
                  size={16}
                  color={COLORS.onSurfaceMuted}
                />
                <Text style={styles.suggestText} numberOfLines={1}>
                  <Text style={styles.suggestMatch}>
                    {s.label.slice(0, query.trim().length)}
                  </Text>
                  {s.label.slice(query.trim().length)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />

      {loading ? (
        <>
          {Header}
          <View style={styles.center} testID="home-loading">
            <ActivityIndicator size="large" color={COLORS.brandPrimary} />
          </View>
        </>
      ) : error ? (
        <>
          {Header}
          <View style={styles.center} testID="home-error">
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={COLORS.brandPrimary}
            />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              style={styles.retryBtn}
              onPress={fetchHotels}
              testID="home-retry-button"
            >
              <Text style={styles.retryText}>Tekrar Dene</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.key}
          renderItem={renderRow}
          ListHeaderComponent={Header}
          stickyHeaderIndices={[0]}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.brandPrimary}
              progressViewOffset={120}
            />
          }
          ListEmptyComponent={
            <View style={styles.center} testID="home-empty">
              <Ionicons
                name={
                  mode === "favorites"
                    ? "heart-outline"
                    : mode === "restaurant"
                    ? "restaurant-outline"
                    : "bed-outline"
                }
                size={48}
                color={COLORS.brandPrimary}
              />
              <Text style={styles.emptyText}>
                {mode === "favorites"
                  ? "Henüz favorin yok."
                  : mode === "restaurant"
                  ? query
                    ? "Sonuç bulunamadı."
                    : "Henüz restoran eklenmedi."
                  : query
                  ? "Sonuç bulunamadı."
                  : "Henüz otel bulunmuyor."}
              </Text>
            </View>
          }
          testID="hotel-list"
        />
      )}
    </SafeAreaView>
  );
}

function Chip({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: keyof typeof import("@expo/vector-icons").Ionicons.glyphMap;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
    >
      <Text
        style={[
          styles.chipText,
          active ? styles.chipTextActive : styles.chipTextInactive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.brandPrimary },
  headerWrap: { backgroundColor: COLORS.brandPrimary, zIndex: 10 },
  header: {
    backgroundColor: COLORS.brandPrimary,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    width: 110,
    height: 44,
  },
  appName: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginTop: 8,
  },
  appTagline: {
    color: "#CFE0F5",
    fontSize: 11,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  chipsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
    backgroundColor: COLORS.brandPrimary,
  },
  chip: {
    height: 36,
    paddingHorizontal: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: { backgroundColor: "#FF6600" },
  chipInactive: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  chipText: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  chipTextActive: { color: "#FFFFFF" },
  chipTextInactive: { color: "#FFFFFF" },
  searchWrap: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: COLORS.brandPrimary,
    zIndex: 100,
  },
  searchBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.onSurface,
    paddingVertical: 0,
  },
  suggestBox: {
    position: "absolute",
    top: 48,
    left: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 100,
  },
  suggestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  suggestRowPressed: {
    backgroundColor: COLORS.brandTertiary,
  },
  suggestText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.onSurfaceMuted,
  },
  suggestMatch: {
    color: COLORS.onSurface,
    fontWeight: "700",
  },
  listContent: {
    backgroundColor: COLORS.surface,
    paddingBottom: 32,
    flexGrow: 1,
  },
  countryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    marginTop: 24,
  },
  countryHeaderText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.onSurface,
  },
  countryHeaderCount: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.onSurfaceMuted,
    backgroundColor: COLORS.border,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 999,
    overflow: "hidden",
  },
  card: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    overflow: "hidden",
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPressed: { opacity: 0.85 },
  cardImage: { width: "100%", height: 160, backgroundColor: COLORS.border },
  favBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTextBox: {
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.onSurface,
    flexShrink: 1,
    textAlign: "center",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
  },
  countryBadge: {
    backgroundColor: COLORS.brandTertiary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  countryBadgeText: {
    fontSize: 11,
    color: COLORS.brandPrimary,
    fontWeight: "600",
  },
  cardLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  cardLocation: {
    fontSize: 13,
    color: COLORS.onSurfaceMuted,
    flexShrink: 1,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 64,
    backgroundColor: COLORS.surface,
    flex: 1,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.onSurface,
    marginTop: 12,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.onSurfaceMuted,
    marginTop: 12,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: COLORS.brandPrimary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
});
