import { useEffect, useRef } from "react";
import {
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Platform,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ── SINIR KAPISI YOĞUNLUK — CANLI BUTON ─────────────────────────
// Sağ üstteki ikon sırasının hemen altında durur. Beyaz callout zemin,
// turuncu yanıp sönen "canlı yayın" noktası — canlı veri hissi verir.
// Basınca /sinirlar ekranı açılır.

const ACCENT = "#FF6600";
const useNative = Platform.OS !== "web";

export function BorderLiveButton({ onPress }: { onPress: () => void }) {
  // Nokta: yanıp sönme (opacity) + nabız gibi büyüyüp küçülme (scale)
  const blink = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(blink, {
          toValue: 0.25,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: useNative,
        }),
        Animated.timing(blink, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: useNative,
        }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.35,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: useNative,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: useNative,
        }),
      ])
    ).start();
  }, [blink, pulse]);

  return (
    <Pressable testID="borders-live-button" onPress={onPress} style={styles.wrap}>
      {/* Yanıp sönen canlı nokta */}
      <View style={styles.dotArea}>
        <Animated.View
          style={[
            styles.dotHalo,
            { opacity: blink, transform: [{ scale: pulse }] },
          ]}
        />
        <Animated.View style={[styles.dot, { opacity: blink }]} />
      </View>
      <Text style={styles.label}>Sınır Kapısı Yoğunluk</Text>
      <View style={styles.liveBadge}>
        <Text style={styles.liveText}>CANLI</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={ACCENT} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingVertical: 7,
    paddingLeft: 12,
    paddingRight: 8,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  dotArea: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dotHalo: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255,102,0,0.3)",
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: ACCENT,
  },
  label: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#003580",
  },
  liveBadge: {
    backgroundColor: ACCENT,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  liveText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
});
