import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// ── SINIRLAR ─────────────────────────────────────────────────────
// Turda kullanılan sınır kapılarının çift yönlü bekleme süreleri.
// Veri: /api/borders (Netlify Function → borderalarm.com, 10 dk önbellek).

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const COLORS = {
  surface: "#F2F2F7",
  surfaceSecondary: "#FFFFFF",
  onSurface: "#1C1C1E",
  onSurfaceMuted: "#6E6E73",
  brandPrimary: "#003580",
  brandSecondary: "#0071C2",
  brandTertiary: "#E6F0F9",
  accent: "#FF6600",
  border: "#E5E5EA",
};

type Side = { name: string; flag: string; country: string };
type Direction = {
  wait: string | null;
  reported: string | null;
  url: string;
} | null;
type Crossing = {
  id: string;
  a: Side;
  b: Side;
  hasData: boolean;
  ab: Direction;
  ba: Direction;
};

// "10 min" / "1 h 30 min" → Türkçe kısaltma
function trWait(wait: string | null): string {
  if (!wait) return "—";
  return wait
    .replace(/hours?|std\.?|h\b/gi, "sa")
    .replace(/min\.?/gi, "dk")
    .trim();
}

// Bekleme süresine göre renk: kısa yeşil, orta turuncu, uzun kırmızı
function waitColor(wait: string | null): string {
  if (!wait) return COLORS.onSurfaceMuted;
  const h = wait.match(/(\d+)\s*(h|hour|std)/i)?.[1];
  const m = wait.match(/(\d+)\s*min/i)?.[1];
  const total = (h ? parseInt(h, 10) * 60 : 0) + (m ? parseInt(m, 10) : 0);
  if (total <= 30) return "#1E9E4C";
  if (total <= 90) return "#E08700";
  return "#D93025";
}

// "02.07.2026 20:29" → "20:29" (bugünse) ya da "02.07 20:29"
function trReported(r: string | null): string | null {
  if (!r) return null;
  const [date, time] = r.split(" ");
  if (!date || !time) return r;
  const [dd, mm] = date.split(".");
  const now = new Date();
  const isToday =
    parseInt(dd, 10) === now.getDate() && parseInt(mm, 10) === now.getMonth() + 1;
  return isToday ? time : `${dd}.${mm} ${time}`;
}

export default function Sinirlar() {
  const router = useRouter();
  const [crossings, setCrossings] = useState<Crossing[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBorders = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${BACKEND_URL ?? ""}/api/borders`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCrossings(data.crossings ?? []);
    } catch {
      setError("Sınır verilerine şu an ulaşılamıyor. Tekrar dene.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBorders();
  }, [fetchBorders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBorders();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" />

      {/* Başlık */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Sınırlar</Text>
          <Text style={styles.headerSub}>Kapılardaki bekleme süreleri · çift yön</Text>
        </View>
        <Ionicons name="git-compare-outline" size={22} color="#CFE0F5" />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.brandPrimary} />
          <Text style={styles.centerText}>Sınır kapıları sorgulanıyor…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={40} color={COLORS.onSurfaceMuted} />
          <Text style={styles.centerText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => { setLoading(true); fetchBorders(); }}>
            <Text style={styles.retryText}>Tekrar Dene</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={crossings}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <Text style={styles.note}>
              Veriler sürücü bildirimlerine dayanır (borderalarm.com). Aşağı
              çekerek yenile; karta dokununca kaynak sayfası açılır.
            </Text>
          }
          renderItem={({ item }) => <CrossingCard c={item} />}
          ListFooterComponent={<View style={{ height: 24 }} />}
        />
      )}
    </SafeAreaView>
  );
}

function CrossingCard({ c }: { c: Crossing }) {
  const open = (url?: string | null) => {
    if (url) Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={styles.card}>
      {/* Kapı adı ve taraflar */}
      <View style={styles.cardHead}>
        <Text style={styles.cardFlag}>{c.a.flag}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {c.a.name} ⇄ {c.b.name}
          </Text>
          <Text style={styles.cardSub} numberOfLines={1}>
            {c.a.country} – {c.b.country}
          </Text>
        </View>
        <Text style={styles.cardFlag}>{c.b.flag}</Text>
      </View>

      {c.hasData ? (
        <View style={styles.dirRow}>
          <DirBox
            label={`${c.a.flag} → ${c.b.flag}`}
            dir={c.ab}
            onPress={() => open(c.ab?.url)}
          />
          <View style={styles.dirDivider} />
          <DirBox
            label={`${c.b.flag} → ${c.a.flag}`}
            dir={c.ba}
            onPress={() => open(c.ba?.url)}
          />
        </View>
      ) : (
        <View style={styles.noData}>
          <Ionicons name="information-circle-outline" size={15} color={COLORS.onSurfaceMuted} />
          <Text style={styles.noDataText}>
            Canlı veri yok — küçük kapı, genelde beklemesiz.
          </Text>
        </View>
      )}
    </View>
  );
}

function DirBox({
  label,
  dir,
  onPress,
}: {
  label: string;
  dir: Direction;
  onPress: () => void;
}) {
  const reported = trReported(dir?.reported ?? null);
  return (
    <Pressable style={styles.dirBox} onPress={onPress}>
      <Text style={styles.dirLabel}>{label}</Text>
      <Text style={[styles.dirWait, { color: waitColor(dir?.wait ?? null) }]}>
        {trWait(dir?.wait ?? null)}
      </Text>
      {reported && <Text style={styles.dirReported}>rapor: {reported}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.brandPrimary,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  headerSub: {
    color: "#CFE0F5",
    fontSize: 12,
    marginTop: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  centerText: {
    fontSize: 14,
    color: COLORS.onSurfaceMuted,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: COLORS.brandPrimary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  list: {
    padding: 16,
    gap: 12,
  },
  note: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.onSurfaceMuted,
    marginBottom: 4,
  },
  card: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardFlag: {
    fontSize: 26,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.brandPrimary,
    textAlign: "center",
  },
  cardSub: {
    fontSize: 12,
    color: COLORS.onSurfaceMuted,
    marginTop: 1,
    textAlign: "center",
  },
  dirRow: {
    flexDirection: "row",
    marginTop: 12,
    backgroundColor: COLORS.brandTertiary,
    borderRadius: 12,
    overflow: "hidden",
  },
  dirDivider: {
    width: 1,
    backgroundColor: "rgba(0,53,128,0.12)",
  },
  dirBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    gap: 2,
  },
  dirLabel: {
    fontSize: 12,
    color: COLORS.onSurfaceMuted,
    fontWeight: "600",
  },
  dirWait: {
    fontSize: 18,
    fontWeight: "900",
  },
  dirReported: {
    fontSize: 10.5,
    color: COLORS.onSurfaceMuted,
  },
  noData: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  noDataText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.onSurfaceMuted,
  },
});
