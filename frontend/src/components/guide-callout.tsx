import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Modal,
  ScrollView,
  Platform,
  Easing,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

// ── ŞEF REHBER SÜLEYMAN ──────────────────────────────────────────
// Web: public/suleyman-motion.mp4 (94 KB, video-avatar)
// Native: assets/images/suleyman-anim.webp (animasyonlu WebP, expo-image oynatır)
// Paylaşılabilir GIF: https://ustnaviguide.netlify.app/suleyman.gif
const SULEYMAN_ANIM = require("../../assets/images/suleyman-anim.webp");
const SULEYMAN_MOTION = "/suleyman-motion.mp4";

// Web'de rüzgârda saçları dalgalanan video-avatar, native'de statik foto.
function SuleymanAvatar({
  size,
  borderColor,
  borderWidth,
}: {
  size: number;
  borderColor: string;
  borderWidth: number;
}) {
  if (Platform.OS === "web") {
    return (
      // @ts-ignore — react-native-web DOM elemanını olduğu gibi basar
      <video
        src={SULEYMAN_MOTION}
        autoPlay
        loop
        muted
        playsInline
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          objectFit: "cover",
          border: `${borderWidth}px solid ${borderColor}`,
          backgroundColor: COLORS.brandSecondary,
          display: "block",
        }}
      />
    );
  }
  return (
    <Image
      source={SULEYMAN_ANIM}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth,
        borderColor,
        backgroundColor: COLORS.brandSecondary,
      }}
      contentFit="cover"
      autoplay
    />
  );
}

const COLORS = {
  brandPrimary: "#003580",
  brandSecondary: "#0071C2",
  accent: "#FF6600",
  onSurface: "#1C1C1E",
  onSurfaceMuted: "#6E6E73",
  surface: "#FFFFFF",
};

const useNative = Platform.OS !== "web";

export function GuideCallout() {
  // expanded: açılışta ortada duran "Beni Mutlaka OKU" callout'u görünür.
  // Okuyup kapatınca sağ-alta küçük Süleyman balonuna küçülür (hep erişilebilir).
  const [expanded, setExpanded] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  const slideX = useRef(new Animated.Value(-500)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const wiggle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!expanded) return;
    slideX.setValue(-500);
    fade.setValue(0);

    Animated.parallel([
      Animated.spring(slideX, {
        toValue: 0,
        friction: 6,
        tension: 45,
        useNativeDriver: useNative,
      }),
      Animated.timing(fade, {
        toValue: 1,
        duration: 350,
        useNativeDriver: useNative,
      }),
    ]).start(() => {
      // Dikkat çekmek için hafif sallanma döngüsü
      Animated.loop(
        Animated.sequence([
          Animated.timing(wiggle, {
            toValue: 1,
            duration: 550,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: useNative,
          }),
          Animated.timing(wiggle, {
            toValue: -1,
            duration: 550,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: useNative,
          }),
          Animated.timing(wiggle, {
            toValue: 0,
            duration: 550,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: useNative,
          }),
        ])
      ).start();
    });
  }, [expanded, slideX, fade, wiggle]);

  const rotate = wiggle.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-3deg", "3deg"],
  });

  const openInstructions = () => setModalVisible(true);
  const closeInstructions = () => {
    setModalVisible(false);
    setExpanded(false); // okuduktan sonra köşeye küçül
  };

  return (
    <>
      {/* ── Ortadaki "Beni Mutlaka OKU" callout'u ───────────────── */}
      {expanded && (
        <View style={styles.overlay} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.calloutRow,
              { opacity: fade, transform: [{ translateX: slideX }] },
            ]}
          >
            <Pressable style={styles.calloutInner} onPress={openInstructions}>
              {/* Konuşma balonu */}
              <Animated.View
                style={[styles.bubble, { transform: [{ rotate }] }]}
              >
                <Text style={styles.bubbleTitle}>BENİ MUTLAKA OKU!</Text>
                <Text style={styles.bubbleSub}>
                  Şef Rehber Süleyman'dan rehberlere 👇
                </Text>
                <View style={styles.bubbleTail} />
              </Animated.View>

              {/* Süleyman avatarı — balonun bittiği yerde */}
              <View style={styles.avatarWrap}>
                <SuleymanAvatar size={64} borderColor="#FFFFFF" borderWidth={3} />
                <View style={styles.avatarBadge}>
                  <Ionicons name="megaphone" size={11} color="#FFFFFF" />
                </View>
              </View>
            </Pressable>

            {/* Kapat (köşeye küçült) */}
            <Pressable
              style={styles.closeBtn}
              onPress={() => setExpanded(false)}
              hitSlop={10}
            >
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </Pressable>
          </Animated.View>
        </View>
      )}

      {/* ── Küçülünce sağ-altta duran kalıcı Süleyman balonu ─────── */}
      {!expanded && (
        <Pressable style={styles.miniBtn} onPress={openInstructions}>
          <SuleymanAvatar size={56} borderColor={COLORS.accent} borderWidth={3} />
          <View style={styles.miniBadge}>
            <Ionicons name="megaphone" size={10} color="#FFFFFF" />
          </View>
        </Pressable>
      )}

      {/* ── Süleyman'ın talimat penceresi ───────────────────────── */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeInstructions}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <SuleymanAvatar size={48} borderColor="#FFFFFF" borderWidth={2} />
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Şef Rehber Süleyman 👋</Text>
                <Text style={styles.modalSubtitle}>
                  NaviGuide — rehber kullanım rehberi
                </Text>
              </View>
              <Pressable onPress={closeInstructions} hitSlop={10}>
                <Ionicons name="close-circle" size={28} color={COLORS.onSurfaceMuted} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={{ paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.p}>
                Merhaba arkadaşlar! Bu uygulamayı işinizi kolaylaştırmak için
                hazırlattım. Turda kaybolmak yok — hepsi burada. Kısaca
                anlatıyorum:
              </Text>

              <Section
                icon="bed-outline"
                title="Oteller"
                text="Ülkelere göre gruplu liste. Yukarıdaki arama kutusuna otel adı ya da şehir yazınca anında bulur. Kalp ikonuna basınca favorine eklenir."
              />
              <Section
                icon="restaurant-outline"
                title="Restoranlar"
                text="Grup yemeği, mola ve çay molası noktaları burada. Adres, telefon ve fotoğrafıyla; mekânı dışarıdan tanıyın diye koydum."
              />
              <Section
                icon="heart"
                title="Favoriler"
                text="Sık gittiğin otel ve restoranları kalple işaretle; hepsi Favoriler sekmesinde toplansın. Tur sırasında hızlı erişim için birebir."
              />
              <Section
                icon="partly-sunny-outline"
                title="Hava Durumu"
                text="12 şehir, bugün + 4 gün. Grubu sabah uyandırırken 'şemsiye alın' mı 'mont alın' mı diyeceğini buradan gör."
              />
              <Section
                icon="map-outline"
                title="Konumlar (Harita)"
                text="Sağ üstteki harita ikonu. Balkanlar'daki buluşma ve tur başlangıç noktaları pinli. Şehri bilmediğin yerde pine bas → 'Buraya Git' → telefonun Google Maps navigasyonu açılır. Şoföre yol tarifi için kullan."
              />

              <Text style={[styles.p, styles.signoff]}>
                Hepsi bu kadar. İyi turlar, bol bahşiş! 🚌{"\n"}— Süleyman
              </Text>
            </ScrollView>

            <Pressable style={styles.gotItBtn} onPress={closeInstructions}>
              <Text style={styles.gotItText}>Anladım, teşekkürler 👍</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

function Section({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={16} color={COLORS.brandPrimary} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  calloutRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  calloutInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  bubble: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxWidth: 210,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 10,
  },
  bubbleTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  bubbleSub: {
    color: "#FFF0E6",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  bubbleTail: {
    position: "absolute",
    right: -7,
    top: "50%",
    marginTop: -7,
    width: 14,
    height: 14,
    backgroundColor: COLORS.accent,
    transform: [{ rotate: "45deg" }],
  },
  avatarWrap: {
    marginLeft: 10,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    backgroundColor: COLORS.brandSecondary,
  },
  avatarBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  closeBtn: {
    marginLeft: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Küçülünce köşedeki kalıcı buton
  miniBtn: {
    position: "absolute",
    right: 16,
    bottom: 24,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 10,
  },
  miniAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: COLORS.accent,
    backgroundColor: COLORS.brandSecondary,
  },
  miniBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    width: "100%",
    maxWidth: 440,
    maxHeight: "85%",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.brandPrimary,
  },
  modalAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: COLORS.brandSecondary,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  modalSubtitle: {
    color: "#CFE0F5",
    fontSize: 12,
    marginTop: 2,
  },
  modalBody: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  p: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.onSurface,
  },
  signoff: {
    marginTop: 14,
    fontStyle: "italic",
    color: COLORS.brandPrimary,
    fontWeight: "600",
  },
  section: {
    marginTop: 16,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#E6F0F9",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.brandPrimary,
  },
  sectionText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: COLORS.onSurfaceMuted,
    paddingLeft: 36,
  },
  gotItBtn: {
    margin: 16,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  gotItText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
