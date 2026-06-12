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
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

type Hotel = {
  id: string;
  name: string;
  image_url: string;
  location: string;
  phone: string;
  email: string;
  description?: string;
};

const COLORS = {
  surface: "#F2F2F7",
  surfaceSecondary: "#FFFFFF",
  onSurface: "#1C1C1E",
  onSurfaceMuted: "#6E6E73",
  brandPrimary: "#003580",
  brandSecondary: "#0071C2",
  border: "#E5E5EA",
};

export default function Index() {
  const router = useRouter();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const renderHotel = ({ item }: { item: Hotel }) => (
    <Pressable
      testID={`hotel-card-${item.id}`}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/hotel/${item.id}`)}
    >
      <Image
        source={{ uri: item.image_url }}
        style={styles.cardImage}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.cardTextBox} testID={`hotel-name-box-${item.id}`}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.name}
        </Text>
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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header} testID="home-header">
        <Text style={styles.headerTitle}>Oteller</Text>
        <Text style={styles.headerSubtitle}>Otelleri keşfet</Text>
      </View>

      {loading ? (
        <View style={styles.center} testID="home-loading">
          <ActivityIndicator size="large" color={COLORS.brandPrimary} />
        </View>
      ) : error ? (
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
      ) : hotels.length === 0 ? (
        <View style={styles.center} testID="home-empty">
          <Ionicons name="bed-outline" size={48} color={COLORS.brandPrimary} />
          <Text style={styles.emptyText}>Henüz otel bulunmuyor.</Text>
        </View>
      ) : (
        <FlatList
          data={hotels}
          keyExtractor={(item) => item.id}
          renderItem={renderHotel}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.brandPrimary}
            />
          }
          testID="hotel-list"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.brandPrimary,
  },
  header: {
    backgroundColor: COLORS.brandPrimary,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#CFE0F5",
    fontSize: 14,
    marginTop: 4,
  },
  listContent: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  card: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardImage: {
    width: "100%",
    height: 200,
    backgroundColor: COLORS.border,
  },
  // CRITICAL: yapışık — no marginTop / no gap, flush to image
  cardTextBox: {
    backgroundColor: COLORS.surfaceSecondary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.onSurface,
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
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    padding: 24,
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
  },
  retryBtn: {
    marginTop: 16,
    backgroundColor: COLORS.brandPrimary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
