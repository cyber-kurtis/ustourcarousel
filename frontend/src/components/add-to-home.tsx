import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// ── ANA EKRANA EKLE (Uygulama gibi kur) ──────────────────────────
// Web'de tarayıcıda açılınca "bunu telefonuna uygulama olarak ekle"
// tarifini gösterir. Zaten uygulama olarak (standalone) açıldıysa ya da
// kullanıcı "Kapat" dediyse görünmez.
const STORAGE_KEY = "naviguide_a2hs_hidden";

const COLORS = {
  brandPrimary: "#003580",
  brandSecondary: "#0071C2",
  accent: "#FF6600",
  onSurface: "#1C1C1E",
  onSurfaceMuted: "#6E6E73",
  surface: "#FFFFFF",
};

type Platf = "ios" | "android" | "other";

// Tarayıcıyı basitçe ayırt et (sadece web'de çağrılır).
function detectPlatform(): Platf {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

// Zaten ana ekrandan (uygulama olarak) mı açıldı?
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mm =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  // iOS Safari'ye özel bayrak
  const iosStandalone = (window.navigator as any)?.standalone === true;
  return Boolean(mm || iosStandalone);
}

export function AddToHome() {
  const [visible, setVisible] = useState(false);
  const [platf, setPlatf] = useState<Platf>("other");
  // Android Chrome'un yakaladığı "yükle" olayı (varsa tek tıkla kurar)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (isStandalone()) return; // zaten uygulama olarak açık
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") return; // daha önce kapatmış
    } catch {}

    setPlatf(detectPlatform());

    // Android/desktop Chrome: kurulum olayını yakala
    const onBip = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    // Açılışta biraz bekleyip göster (ekran otursun diye)
    const t = setTimeout(() => setVisible(true), 900);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      clearTimeout(t);
    };
  }, []);

  const close = (remember: boolean) => {
    setVisible(false);
    if (remember) {
      try {
        window.localStorage.setItem(STORAGE_KEY, "1");
      } catch {}
    }
  };

  // Android tek-tık kurulum
  const installNow = async () => {
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch {}
    setDeferredPrompt(null);
    close(true);
  };

  if (Platform.OS !== "web") return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => close(false)}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.logoWrap}>
              <Ionicons name="phone-portrait-outline" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Uygulama gibi kullan 📲</Text>
              <Text style={styles.subtitle}>
                NaviGuide'ı ana ekranına ekle, tek dokunuşla aç.
              </Text>
            </View>
            <Pressable onPress={() => close(false)} hitSlop={10}>
              <Ionicons name="close-circle" size={26} color={COLORS.onSurfaceMuted} />
            </Pressable>
          </View>

          <View style={styles.body}>
            {platf === "ios" && (
              <>
                <Step
                  n="1"
                  text="Alttaki (veya üstteki) Paylaş butonuna bas."
                  icon="share-outline"
                />
                <Step
                  n="2"
                  text="Açılan listede 'Ana Ekrana Ekle'yi seç."
                  icon="add-circle-outline"
                />
                <Step n="3" text="'Ekle'ye bas — bitti! Simge ana ekranında." icon="checkmark-circle-outline" />
              </>
            )}

            {platf === "android" && (
              <>
                {deferredPrompt ? (
                  <Text style={styles.oneTap}>
                    Tek dokunuşla kurabilirsin 👇
                  </Text>
                ) : (
                  <>
                    <Step
                      n="1"
                      text="Sağ üstteki ⋮ (üç nokta) menüsüne bas."
                      icon="ellipsis-vertical"
                    />
                    <Step
                      n="2"
                      text="'Uygulamayı yükle' ya da 'Ana ekrana ekle'yi seç."
                      icon="download-outline"
                    />
                    <Step n="3" text="Onayla — simge ana ekranında hazır." icon="checkmark-circle-outline" />
                  </>
                )}
              </>
            )}

            {platf === "other" && (
              <>
                <Step
                  n="1"
                  text="Tarayıcı menüsünü aç (⋮ veya Paylaş)."
                  icon="menu-outline"
                />
                <Step
                  n="2"
                  text="'Ana ekrana ekle' / 'Uygulamayı yükle'yi seç."
                  icon="download-outline"
                />
                <Step n="3" text="Onayla — kısayol ana ekranına gelir." icon="checkmark-circle-outline" />
              </>
            )}
          </View>

          {platf === "android" && deferredPrompt ? (
            <Pressable style={styles.primaryBtn} onPress={installNow}>
              <Ionicons name="download-outline" size={20} color="#FFFFFF" />
              <Text style={styles.primaryText}>Ana ekrana ekle</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.primaryBtn} onPress={() => close(true)}>
              <Text style={styles.primaryText}>Anladım 👍</Text>
            </Pressable>
          )}

          <Pressable onPress={() => close(false)} hitSlop={8} style={styles.laterBtn}>
            <Text style={styles.laterText}>Sonra hatırlat</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Step({
  n,
  text,
  icon,
}: {
  n: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <Ionicons name={icon} size={18} color={COLORS.brandPrimary} style={{ marginRight: 8 }} />
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    width: "100%",
    maxWidth: 420,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.brandPrimary,
  },
  logoWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.brandSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  subtitle: {
    color: "#CFE0F5",
    fontSize: 12.5,
    marginTop: 2,
    lineHeight: 17,
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 4,
  },
  oneTap: {
    fontSize: 14.5,
    fontWeight: "700",
    color: COLORS.onSurface,
    textAlign: "center",
    paddingVertical: 8,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  stepNumText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  stepText: {
    flex: 1,
    fontSize: 13.5,
    lineHeight: 19,
    color: COLORS.onSurface,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  laterBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  laterText: {
    color: COLORS.onSurfaceMuted,
    fontSize: 13,
    fontWeight: "600",
  },
});
