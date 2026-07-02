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
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useFavorites } from "@/src/hooks/use-favorites";
import { GuideCallout } from "@/src/components/guide-callout";
import { AddToHome } from "@/src/components/add-to-home";

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

type ViewMode = "hotel" | "restaurant" | "favorites" | "currency" | "weather";

type CityForecast = {
  city: string;
  days: { date: string; code: number; max: number; min: number }[];
};

const WEATHER_CITIES = [
  { name: "Skopje", lat: 41.9981, lng: 21.4254 },
  { name: "Pristina", lat: 42.6629, lng: 21.1655 },
  { name: "Prizren", lat: 42.2139, lng: 20.7397 },
  { name: "Bitola", lat: 41.0297, lng: 21.3292 },
  { name: "Ohrid", lat: 41.1231, lng: 20.8016 },
  { name: "Tirana", lat: 41.3275, lng: 19.8187 },
  { name: "Shkoder", lat: 42.0683, lng: 19.5126 },
  { name: "Kotor", lat: 42.4247, lng: 18.7712 },
  { name: "Trebinje", lat: 42.712, lng: 18.3444 },
  { name: "Mostar", lat: 43.3438, lng: 17.8078 },
  { name: "Sarajevo", lat: 43.8563, lng: 18.4131 },
  { name: "Beograd", lat: 44.7866, lng: 20.4489 },
];

// ── Döviz ────────────────────────────────────────────────────────
// Balkan turu güzergâhındaki para birimleri. Kurlar /api/rates'ten
// EUR bazlı gelir; çapraz kur = miktar / kur[kaynak] * kur[hedef].
const CURRENCIES = [
  { code: "TRY", name: "Türk Lirası", flag: "🇹🇷", symbol: "₺" },
  { code: "EUR", name: "Euro", flag: "🇪🇺", symbol: "€" },
  { code: "USD", name: "ABD Doları", flag: "🇺🇸", symbol: "$" },
  { code: "MKD", name: "Makedon Dinarı", flag: "🇲🇰", symbol: "ден" },
  { code: "RSD", name: "Sırp Dinarı", flag: "🇷🇸", symbol: "дин" },
  { code: "ALL", name: "Arnavut Leki", flag: "🇦🇱", symbol: "L" },
  { code: "BAM", name: "Bosna Markı", flag: "🇧🇦", symbol: "KM" },
] as const;

type CurrencyCode = (typeof CURRENCIES)[number]["code"];

// Hızlı bakış satırları: küçük birimli paralar 100'lük gösterilir.
const QUICK_ROWS: { code: CurrencyCode; amount: number }[] = [
  { code: "EUR", amount: 1 },
  { code: "USD", amount: 1 },
  { code: "BAM", amount: 1 },
  { code: "MKD", amount: 100 },
  { code: "RSD", amount: 100 },
  { code: "ALL", amount: 100 },
];

const fmt = (n: number, digits = 2) =>
  n.toLocaleString("tr-TR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const TR_DAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const dayName = (dateStr: string) =>
  TR_DAYS[new Date(dateStr + "T12:00:00").getDay()];

// WMO hava kodu → ikon + Türkçe etiket
function weatherInfo(code: number): {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
} {
  if (code === 0) return { icon: "sunny", label: "Açık" };
  if (code === 1) return { icon: "partly-sunny", label: "Az bulutlu" };
  if (code === 2) return { icon: "partly-sunny", label: "Parçalı bulutlu" };
  if (code === 3) return { icon: "cloudy", label: "Bulutlu" };
  if (code === 45 || code === 48) return { icon: "cloudy", label: "Sisli" };
  if (code >= 51 && code <= 57) return { icon: "rainy", label: "Çisenti" };
  if (code >= 61 && code <= 67) return { icon: "rainy", label: "Yağmurlu" };
  if (code >= 71 && code <= 77) return { icon: "snow", label: "Karlı" };
  if (code >= 80 && code <= 82) return { icon: "rainy", label: "Sağanak" };
  if (code === 85 || code === 86) return { icon: "snow", label: "Kar sağanağı" };
  if (code >= 95) return { icon: "thunderstorm", label: "Fırtınalı" };
  return { icon: "cloudy", label: "" };
}

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

  const [weather, setWeather] = useState<CityForecast[] | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const fetchWeather = useCallback(async () => {
    try {
      setWeatherLoading(true);
      setWeatherError(null);
      const lats = WEATHER_CITIES.map((c) => c.lat).join(",");
      const lngs = WEATHER_CITIES.map((c) => c.lng).join(",");
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lngs}&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`
      );
      if (!res.ok) throw new Error("Hava durumu alınamadı");
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [data];
      setWeather(
        WEATHER_CITIES.map((c, i) => ({
          city: c.name,
          days: (arr[i]?.daily?.time ?? []).map((t: string, j: number) => ({
            date: t,
            code: arr[i].daily.weather_code[j],
            max: arr[i].daily.temperature_2m_max[j],
            min: arr[i].daily.temperature_2m_min[j],
          })),
        }))
      );
    } catch (e: any) {
      setWeatherError(e?.message ?? "Bir hata oluştu");
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode === "weather" && !weather && !weatherLoading) fetchWeather();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ── Döviz state ──
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);
  const [cvAmount, setCvAmount] = useState("100");
  const [cvFrom, setCvFrom] = useState<CurrencyCode>("EUR");
  const [cvTo, setCvTo] = useState<CurrencyCode>("TRY");

  const fetchRates = useCallback(async () => {
    try {
      setRatesLoading(true);
      setRatesError(null);
      const res = await fetch(`${BACKEND_URL ?? ""}/api/rates`);
      if (!res.ok) throw new Error("Kurlar alınamadı");
      const data = await res.json();
      if (!data.rates) throw new Error("Kurlar alınamadı");
      setRates(data.rates);
    } catch (e: any) {
      setRatesError(e?.message ?? "Bir hata oluştu");
    } finally {
      setRatesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode === "currency" && !rates && !ratesLoading) fetchRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // EUR bazlı kurlardan çapraz çeviri
  const convert = useCallback(
    (amount: number, from: CurrencyCode, to: CurrencyCode) => {
      if (!rates || !rates[from] || !rates[to]) return null;
      return (amount / rates[from]) * rates[to];
    },
    [rates]
  );

  const cvResult = useMemo(() => {
    const n = parseFloat(cvAmount.replace(",", "."));
    if (!isFinite(n) || n < 0) return null;
    return convert(n, cvFrom, cvTo);
  }, [cvAmount, cvFrom, cvTo, convert]);

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
              testID="weather-button"
              onPress={() => setMode("weather")}
              hitSlop={8}
              style={[
                styles.actionBtn,
                mode === "weather" && styles.actionBtnActive,
              ]}
            >
              <Ionicons name="partly-sunny-outline" size={20} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={() => router.push("/map")}
              hitSlop={8}
              style={styles.actionBtn}
            >
              <Ionicons name="map-outline" size={20} color="#FFFFFF" />
            </Pressable>
            <Pressable
              testID="borders-button"
              onPress={() => router.push("/sinirlar")}
              hitSlop={8}
              style={styles.actionBtn}
            >
              <Ionicons name="flag-outline" size={20} color="#FFFFFF" />
            </Pressable>
            <Pressable
              testID="refresh-button"
              onPress={() => { setRefreshing(true); fetchHotels(); }}
              hitSlop={8}
              style={styles.actionBtn}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
              )}
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsRow}
      >
        <Chip
          testID="chip-hotels"
          label="Otel"
          active={mode === "hotel"}
          onPress={() => setMode("hotel")}
        />
        <Chip
          testID="chip-restaurants"
          label="Restoran"
          active={mode === "restaurant"}
          onPress={() => setMode("restaurant")}
        />
        <Chip
          testID="chip-currency"
          label="Döviz"
          active={mode === "currency"}
          onPress={() => setMode("currency")}
        />
        <Chip
          testID="chip-favorites"
          label="Favoriler"
          active={mode === "favorites"}
          onPress={() => setMode("favorites")}
        />
      </ScrollView>

      {/* Arama kutusu — sekmelerin altında (hava durumu ve dövizde gizli) */}
      {mode !== "weather" && mode !== "currency" && (
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
      )}
    </View>
  );

  const renderWeatherCard = ({ item }: { item: CityForecast }) => {
    const today = item.days[0];
    return (
      <View style={styles.weatherCard}>
        <View style={styles.weatherCityRow}>
          <Ionicons name="location" size={15} color={COLORS.brandSecondary} />
          <Text style={styles.weatherCity}>{item.city}</Text>
          {today && (
            <Text style={styles.weatherToday}>
              {weatherInfo(today.code).label}
            </Text>
          )}
        </View>
        <View style={styles.weatherDaysRow}>
          {item.days.map((d, i) => {
            const info = weatherInfo(d.code);
            return (
              <View key={d.date} style={styles.weatherDay}>
                <Text style={styles.weatherDayName}>
                  {i === 0 ? "Bugün" : dayName(d.date)}
                </Text>
                <Ionicons
                  name={info.icon}
                  size={22}
                  color={COLORS.brandSecondary}
                />
                <Text style={styles.weatherMax}>{Math.round(d.max)}°</Text>
                <Text style={styles.weatherMin}>{Math.round(d.min)}°</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />

      {mode === "currency" ? (
        <ScrollView
          stickyHeaderIndices={[0]}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          testID="currency-view"
        >
          {Header}

          {/* QR Ekstra Tur Satışı — rehberin tahsilat ekranına giriş */}
          <Pressable
            testID="qr-sale-card"
            style={({ pressed }) => [
              styles.qrSaleCard,
              pressed && { opacity: 0.9 },
            ]}
            onPress={() => router.push("/qr-satis")}
          >
            <View style={styles.qrSaleIconBox}>
              <Ionicons name="qr-code" size={30} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.qrSaleTitle}>QR EKSTRA TUR SATIŞI</Text>
              <Text style={styles.qrSaleSub}>
                Garanti ATM ile TL tahsilatı — günün satış kurundan
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
          </Pressable>

          {ratesLoading ? (
            <View style={styles.center} testID="currency-loading">
              <ActivityIndicator size="large" color={COLORS.brandPrimary} />
            </View>
          ) : ratesError || !rates ? (
            <View style={styles.center} testID="currency-error">
              <Ionicons
                name="cash-outline"
                size={48}
                color={COLORS.brandPrimary}
              />
              <Text style={styles.errorText}>
                {ratesError ?? "Kurlar alınamadı"}
              </Text>
              <Pressable style={styles.retryBtn} onPress={fetchRates}>
                <Text style={styles.retryText}>Tekrar Dene</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Çevirici */}
              <View style={styles.cvCard} testID="currency-converter">
                <Text style={styles.cvCardTitle}>Döviz Çevirici</Text>

                <View style={styles.cvInputRow}>
                  <TextInput
                    testID="cv-amount"
                    value={cvAmount}
                    onChangeText={setCvAmount}
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    style={styles.cvInput}
                    placeholder="Miktar"
                    placeholderTextColor={COLORS.onSurfaceMuted}
                  />
                  <Text style={styles.cvInputCode}>{cvFrom}</Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cvChipRow}
                >
                  {CURRENCIES.map((c) => (
                    <Pressable
                      key={`from-${c.code}`}
                      onPress={() => setCvFrom(c.code)}
                      style={[
                        styles.cvChip,
                        cvFrom === c.code && styles.cvChipActive,
                      ]}
                    >
                      <Text style={styles.cvChipFlag}>{c.flag}</Text>
                      <Text
                        style={[
                          styles.cvChipText,
                          cvFrom === c.code && styles.cvChipTextActive,
                        ]}
                      >
                        {c.code}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <View style={styles.cvSwapRow}>
                  <View style={styles.cvSwapLine} />
                  <Pressable
                    testID="cv-swap"
                    style={styles.cvSwapBtn}
                    onPress={() => {
                      setCvFrom(cvTo);
                      setCvTo(cvFrom);
                    }}
                    hitSlop={8}
                  >
                    <Ionicons
                      name="swap-vertical"
                      size={18}
                      color="#FFFFFF"
                    />
                  </Pressable>
                  <View style={styles.cvSwapLine} />
                </View>

                <Text style={styles.cvResult} testID="cv-result">
                  {cvResult == null ? "—" : fmt(cvResult)}{" "}
                  <Text style={styles.cvResultCode}>
                    {CURRENCIES.find((c) => c.code === cvTo)?.symbol ?? cvTo}
                  </Text>
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cvChipRow}
                >
                  {CURRENCIES.map((c) => (
                    <Pressable
                      key={`to-${c.code}`}
                      onPress={() => setCvTo(c.code)}
                      style={[
                        styles.cvChip,
                        cvTo === c.code && styles.cvChipActive,
                      ]}
                    >
                      <Text style={styles.cvChipFlag}>{c.flag}</Text>
                      <Text
                        style={[
                          styles.cvChipText,
                          cvTo === c.code && styles.cvChipTextActive,
                        ]}
                      >
                        {c.code}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              {/* Hızlı bakış — TL karşılıkları */}
              <View style={styles.cvCard} testID="currency-quick">
                <Text style={styles.cvCardTitle}>TL Karşılıkları</Text>
                {QUICK_ROWS.map(({ code, amount }) => {
                  const c = CURRENCIES.find((x) => x.code === code)!;
                  const v = convert(amount, code, "TRY");
                  return (
                    <View key={code} style={styles.quickRow}>
                      <Text style={styles.quickFlag}>{c.flag}</Text>
                      <Text style={styles.quickLabel}>
                        {amount} {code}
                      </Text>
                      <Text style={styles.quickName}>{c.name}</Text>
                      <Text style={styles.quickValue}>
                        {v == null ? "—" : `${fmt(v)} ₺`}
                      </Text>
                    </View>
                  );
                })}
                <Text style={styles.cvFootnote}>
                  Orta piyasa kuru, bilgi amaçlıdır. Tahsilatta QR satış
                  ekranındaki günün satış kuru esas alınır.
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      ) : mode === "weather" ? (
        <FlatList
          data={weather ?? []}
          keyExtractor={(c) => c.city}
          renderItem={renderWeatherCard}
          ListHeaderComponent={Header}
          stickyHeaderIndices={[0]}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          testID="weather-list"
          ListEmptyComponent={
            <View style={styles.center} testID="weather-status">
              {weatherLoading ? (
                <ActivityIndicator size="large" color={COLORS.brandPrimary} />
              ) : weatherError ? (
                <>
                  <Ionicons
                    name="cloud-offline-outline"
                    size={48}
                    color={COLORS.brandPrimary}
                  />
                  <Text style={styles.errorText}>{weatherError}</Text>
                  <Pressable style={styles.retryBtn} onPress={fetchWeather}>
                    <Text style={styles.retryText}>Tekrar Dene</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          }
        />
      ) : loading ? (
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

      {/* Şef Rehber Süleyman callout'u — ekranda sabit, kaydırmadan etkilenmez */}
      <GuideCallout />

      {/* Açılışta "ana ekrana ekle" tarifi (sadece web tarayıcıda) */}
      <AddToHome />
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
  actionBtnActive: { backgroundColor: "#FF6600" },
  chipsScroll: {
    backgroundColor: COLORS.brandPrimary,
    flexGrow: 0,
  },
  chipsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  chip: {
    height: 34,
    paddingHorizontal: 14,
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
  chipText: { fontSize: 12, fontWeight: "700", textAlign: "center" },
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
  // ── Döviz ──
  qrSaleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#00854A", // Garanti yeşili
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: "#00854A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  qrSaleIconBox: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  qrSaleTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  qrSaleSub: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    marginTop: 2,
  },
  cvCard: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cvCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.onSurfaceMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  cvInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 56,
    marginBottom: 10,
  },
  cvInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.onSurface,
    paddingVertical: 0,
  },
  cvInputCode: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.brandSecondary,
    marginLeft: 8,
  },
  cvChipRow: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 2,
  },
  cvChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
  },
  cvChipActive: {
    backgroundColor: COLORS.brandTertiary,
    borderColor: COLORS.brandSecondary,
  },
  cvChipFlag: { fontSize: 13 },
  cvChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.onSurfaceMuted,
  },
  cvChipTextActive: { color: COLORS.brandPrimary },
  cvSwapRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 12,
  },
  cvSwapLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  cvSwapBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.brandSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  cvResult: {
    fontSize: 34,
    fontWeight: "800",
    color: COLORS.brandPrimary,
    textAlign: "center",
    marginBottom: 12,
  },
  cvResultCode: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.brandSecondary,
  },
  quickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  quickFlag: { fontSize: 16 },
  quickLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.onSurface,
    minWidth: 76,
  },
  quickName: {
    flex: 1,
    fontSize: 12,
    color: COLORS.onSurfaceMuted,
  },
  quickValue: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.brandPrimary,
  },
  cvFootnote: {
    fontSize: 11,
    color: COLORS.onSurfaceMuted,
    marginTop: 10,
    lineHeight: 15,
  },
  weatherCard: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  weatherCityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  weatherCity: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.onSurface,
    flex: 1,
  },
  weatherToday: {
    fontSize: 12,
    color: COLORS.onSurfaceMuted,
    fontWeight: "600",
  },
  weatherDaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  weatherDay: {
    alignItems: "center",
    gap: 3,
    flex: 1,
  },
  weatherDayName: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.onSurfaceMuted,
  },
  weatherMax: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.onSurface,
  },
  weatherMin: {
    fontSize: 12,
    color: COLORS.onSurfaceMuted,
  },
});
