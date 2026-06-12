import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
  StatusBar,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

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
  brandTertiary: "#E6F0F9",
  border: "#E5E5EA",
};

export default function HotelDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/hotels/${id}`);
        if (!res.ok) throw new Error("Otel bulunamadı");
        const data: Hotel = await res.json();
        setHotel(data);
      } catch (e: any) {
        setError(e?.message ?? "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const openMaps = () => {
    if (!hotel) return;
    const query = encodeURIComponent(`${hotel.name} ${hotel.location}`);
    const url = Platform.select({
      ios: `https://www.google.com/maps/search/?api=1&query=${query}`,
      android: `https://www.google.com/maps/search/?api=1&query=${query}`,
      default: `https://www.google.com/maps/search/?api=1&query=${query}`,
    })!;
    Linking.openURL(url);
  };

  const callPhone = () => {
    if (!hotel) return;
    Linking.openURL(`tel:${hotel.phone}`);
  };

  const sendMail = () => {
    if (!hotel) return;
    Linking.openURL(`mailto:${hotel.email}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center} testID="detail-loading">
          <ActivityIndicator size="large" color={COLORS.brandPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !hotel) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center} testID="detail-error">
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={COLORS.brandPrimary}
          />
          <Text style={styles.errorText}>{error ?? "Otel bulunamadı"}</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => router.back()}
            testID="detail-back-button"
          >
            <Text style={styles.retryText}>Geri Dön</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        testID="detail-scroll"
      >
        <View style={styles.heroWrapper}>
          <Image
            source={{ uri: hotel.image_url }}
            style={styles.hero}
            contentFit="cover"
            transition={200}
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0)"]}
            style={styles.heroScrim}
          />
          <SafeAreaView style={styles.headerOverlay} edges={["top"]}>
            <Pressable
              style={styles.backBtn}
              onPress={() => router.back()}
              testID="back-button"
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </Pressable>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          <Text style={styles.title} testID="hotel-detail-name">
            {hotel.name}
          </Text>
          {hotel.description ? (
            <Text style={styles.description} testID="hotel-detail-description">
              {hotel.description}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <ActionButton
              testID="action-location-button"
              icon="location"
              label="Konum"
              sub={hotel.location}
              onPress={openMaps}
            />
            <ActionButton
              testID="action-phone-button"
              icon="call"
              label="Telefon"
              sub={hotel.phone}
              onPress={callPhone}
            />
            <ActionButton
              testID="action-email-button"
              icon="mail"
              label="E-posta"
              sub={hotel.email}
              onPress={sendMail}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  sub,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub: string;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        pressed && styles.actionBtnPressed,
      ]}
    >
      <View style={styles.actionIconWrap}>
        <Ionicons name={icon} size={22} color={COLORS.brandPrimary} />
      </View>
      <View style={styles.actionTextWrap}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionSub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={COLORS.brandPrimary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  safe: { flex: 1, backgroundColor: COLORS.surface },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  heroWrapper: {
    width: "100%",
    height: 300,
    position: "relative",
    backgroundColor: COLORS.border,
  },
  hero: { width: "100%", height: "100%" },
  heroScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  body: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.onSurface,
  },
  description: {
    fontSize: 14,
    color: COLORS.onSurfaceMuted,
    marginTop: 8,
    lineHeight: 20,
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.brandTertiary,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 64,
    gap: 12,
  },
  actionBtnPressed: { opacity: 0.85 },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  actionTextWrap: { flex: 1 },
  actionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.brandPrimary,
  },
  actionSub: {
    fontSize: 13,
    color: COLORS.brandSecondary,
    marginTop: 2,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.onSurface,
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
  retryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
