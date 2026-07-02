import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

// ── ÇEVRİMİÇİ REHBER SİNYALİ (presence beacon) ──────────────────
// Uygulama açıkken ~60 sn'de bir /api/presence'a kalp atışı yollar:
// {id, name, device}. Yönetim paneli bu veriden kimin çevrimiçi
// olduğunu görür. İsim ilk açılışta bir kez sorulur (atlanabilir).

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const KEY_ID = "naviguide_device_id";
const KEY_NAME = "naviguide_guide_name";
const KEY_NAME_SKIP = "naviguide_guide_name_skip";
const HEARTBEAT_MS = 60_000;

const COLORS = {
  brandPrimary: "#003580",
  accent: "#FF6600",
  onSurface: "#1C1C1E",
  onSurfaceMuted: "#6E6E73",
  surface: "#FFFFFF",
  border: "#E5E5EA",
};

function randomId(): string {
  try {
    // @ts-ignore — web ve yeni RN'de var
    if (typeof crypto !== "undefined" && crypto.randomUUID)
      return crypto.randomUUID();
  } catch {}
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// Tarayıcı kimliğinden okunabilir cihaz etiketi üret.
// Not: Web, "Ahmet'in iPhone'u" gibi kişisel cihaz adını vermez;
// model/tarayıcı bilgisi alınabilenin en iyisidir.
function deviceLabel(): string {
  if (Platform.OS === "ios") return "iOS uygulaması";
  if (Platform.OS === "android") return "Android uygulaması";
  if (typeof navigator === "undefined") return "Bilinmiyor";
  const ua = navigator.userAgent || "";
  let device = "Bilgisayar";
  if (/iPhone/.test(ua)) device = "iPhone";
  else if (/iPad/.test(ua)) device = "iPad";
  else if (/Android/.test(ua)) {
    const model = ua
      .match(/Android[^;]*;\s*([^);]+)[);]/)?.[1]
      ?.replace(/Build.*/i, "")
      .trim();
    device = model && model.length > 1 ? `Android · ${model}` : "Android";
  } else if (/Windows/.test(ua)) device = "Windows PC";
  else if (/Macintosh/.test(ua)) device = "Mac";
  let browser = "";
  if (/Edg/i.test(ua)) browser = "Edge";
  else if (/CriOS|Chrome/i.test(ua)) browser = "Chrome";
  else if (/FxiOS|Firefox/i.test(ua)) browser = "Firefox";
  else if (/Safari/i.test(ua)) browser = "Safari";
  return browser ? `${device} · ${browser}` : device;
}

// Kalp atışı gönder; sunucu bu cihaz duraklatılmışsa blocked:true döner.
async function sendHeartbeat(id: string, name: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL ?? ""}/api/presence`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name, device: deviceLabel() }),
    });
    const data = await res.json();
    return Boolean(data?.blocked);
  } catch {
    return false; // ağ hatasında kilitleme — çevrimdışı rehberi mağdur etme
  }
}

export function PresenceBeacon() {
  const [askName, setAskName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [blocked, setBlocked] = useState(false);
  const idRef = useRef<string | null>(null);
  const nameRef = useRef<string>("");

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const beat = async () => {
      if (!idRef.current) return;
      const isBlocked = await sendHeartbeat(idRef.current, nameRef.current);
      if (!cancelled) setBlocked(isBlocked);
    };

    (async () => {
      // Kalıcı cihaz kimliği
      let id = await AsyncStorage.getItem(KEY_ID);
      if (!id) {
        id = randomId();
        await AsyncStorage.setItem(KEY_ID, id);
      }
      idRef.current = id;

      const storedName = (await AsyncStorage.getItem(KEY_NAME)) ?? "";
      nameRef.current = storedName;
      const skipped = await AsyncStorage.getItem(KEY_NAME_SKIP);

      if (cancelled) return;

      // İlk sinyal hemen, sonra periyodik
      beat();
      interval = setInterval(beat, HEARTBEAT_MS);

      // İsim yoksa (ve daha önce "atla" denmediyse) biraz sonra sor —
      // açılıştaki diğer pencerelerle çakışmasın diye 6 sn bekle.
      if (!storedName && !skipped) {
        setTimeout(() => {
          if (!cancelled) setAskName(true);
        }, 6000);
      }
    })();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, []);

  const retryBlocked = async () => {
    if (!idRef.current) return;
    const isBlocked = await sendHeartbeat(idRef.current, nameRef.current);
    setBlocked(isBlocked);
  };

  const saveName = async () => {
    const name = nameInput.trim().slice(0, 40);
    if (!name) return;
    nameRef.current = name;
    await AsyncStorage.setItem(KEY_NAME, name);
    setAskName(false);
    if (idRef.current) sendHeartbeat(idRef.current, name);
  };

  const skipName = async () => {
    setAskName(false);
    await AsyncStorage.setItem(KEY_NAME_SKIP, "1");
  };

  // ── Kilit ekranı: yönetici bu cihazı duraklattı ──
  if (blocked) {
    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.blockBackdrop}>
          <View style={styles.card}>
            <Ionicons name="pause-circle" size={52} color={COLORS.accent} />
            <Text style={styles.title}>Kullanım Duraklatıldı</Text>
            <Text style={styles.sub}>
              Bu cihazın erişimi UStour yönetimi tarafından geçici olarak
              durduruldu. Yanlışlık olduğunu düşünüyorsan yöneticiyle
              iletişime geç.
            </Text>
            <Pressable style={styles.saveBtn} onPress={retryBlocked}>
              <Text style={styles.saveText}>Tekrar Dene</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={askName}
      transparent
      animationType="fade"
      onRequestClose={skipName}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="person-circle-outline" size={34} color={COLORS.brandPrimary} />
          </View>
          <Text style={styles.title}>Adını yazar mısın? 👋</Text>
          <Text style={styles.sub}>
            Ekip listesinde görünmen için — sadece UStour yönetimi görür.
          </Text>
          <TextInput
            value={nameInput}
            onChangeText={setNameInput}
            placeholder="Adın Soyadın"
            placeholderTextColor={COLORS.onSurfaceMuted}
            style={styles.input}
            autoCapitalize="words"
            maxLength={40}
            onSubmitEditing={saveName}
          />
          <Pressable style={styles.saveBtn} onPress={saveName}>
            <Text style={styles.saveText}>Kaydet</Text>
          </Pressable>
          <Pressable style={styles.skipBtn} onPress={skipName} hitSlop={8}>
            <Text style={styles.skipText}>Şimdi değil</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  // Kilit ekranı arkası tam opak — uygulama kullanılamasın
  blockBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,20,50,0.97)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    width: "100%",
    maxWidth: 360,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  iconWrap: {
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.onSurface,
  },
  sub: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.onSurfaceMuted,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 14,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.onSurface,
    marginBottom: 12,
  },
  saveBtn: {
    width: "100%",
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  saveText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  skipBtn: {
    paddingVertical: 10,
  },
  skipText: {
    fontSize: 13,
    color: COLORS.onSurfaceMuted,
    fontWeight: "600",
  },
});
