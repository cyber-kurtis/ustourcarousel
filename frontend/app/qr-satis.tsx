import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// ATM ekranında gösterilecek QR: frontend/public/qr-ekstra-tur.png
// (Garanti ATM'nin okuyacağı, hesaba para yatırma karekodu.)
const QR_URI = "/qr-ekstra-tur.png";

const COLORS = {
  surface: "#F2F2F7",
  surfaceSecondary: "#FFFFFF",
  onSurface: "#1C1C1E",
  onSurfaceMuted: "#6E6E73",
  brandPrimary: "#003580",
  brandSecondary: "#0071C2",
  border: "#E5E5EA",
  garanti: "#00854A",
  garantiDark: "#006B3B",
  atmBody: "#3A3F47",
  atmBezel: "#22262C",
};

type EurTry = {
  selling: number;
  source: string;
  date: string | null;
};

const fmtTl = (n: number) =>
  n.toLocaleString("tr-TR", { maximumFractionDigits: 0 });

export default function QrSatis() {
  const router = useRouter();

  const [eurTry, setEurTry] = useState<EurTry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rehberin gireceği EUR satış tutarı
  const [eurAmount, setEurAmount] = useState("");

  // Kur API'ye ulaşılamazsa (veya rehber isterse) elle kur girilebilir
  const [manualRate, setManualRate] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState(false);

  const [qrMissing, setQrMissing] = useState(false);

  const fetchRate = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${BACKEND_URL ?? ""}/api/rates`);
      if (!res.ok) throw new Error("Kur alınamadı");
      const data = await res.json();
      if (!data.eurTry?.selling) throw new Error("Kur alınamadı");
      setEurTry(data.eurTry);
    } catch (e: any) {
      setError(e?.message ?? "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRate();
  }, [fetchRate]);

  const rate = useMemo(() => {
    if (manualRate != null) {
      const n = parseFloat(manualRate.replace(",", "."));
      if (isFinite(n) && n > 0) return n;
    }
    return eurTry?.selling ?? null;
  }, [manualRate, eurTry]);

  const eur = useMemo(() => {
    const n = parseFloat(eurAmount.replace(",", "."));
    return isFinite(n) && n > 0 ? n : null;
  }, [eurAmount]);

  // Rehber lehine tam TL'ye yukarı yuvarlanır — kur zararı oluşmasın.
  const tl = eur != null && rate != null ? Math.ceil(eur * rate) : null;

  const rateLabel = manualRate != null
    ? "Elle girilen kur"
    : eurTry
    ? `${eurTry.source}${eurTry.date ? ` · ${eurTry.date}` : ""}`
    : "";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" />

      {/* Başlık */}
      <View style={styles.header}>
        <Pressable
          testID="qr-back"
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>QR Ekstra Tur Satışı</Text>
          <Text style={styles.headerSub}>Garanti ATM ile TL tahsilatı</Text>
        </View>
        <Ionicons name="qr-code" size={24} color="rgba(255,255,255,0.7)" />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* EUR tutar girişi */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>EKSTRA TUR SATIŞ TUTARI</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputSymbol}>€</Text>
            <TextInput
              testID="qr-eur-input"
              value={eurAmount}
              onChangeText={setEurAmount}
              keyboardType="decimal-pad"
              inputMode="decimal"
              placeholder="0"
              placeholderTextColor={COLORS.border}
              style={styles.input}
              maxLength={7}
            />
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.brandPrimary} />
          </View>
        ) : (
          <>
            {/* EUR tutarı — ATM'nin tam üstünde */}
            <Text style={styles.eurBig} testID="qr-eur-display">
              {eur != null ? `${eurAmount.replace(".", ",")} €` : "— €"}
            </Text>

            {/* Garanti ATM */}
            <View style={styles.atmBody}>
              <View style={styles.atmBrandBar}>
                <View style={styles.atmBrandDot}>
                  <Ionicons name="leaf" size={13} color={COLORS.garanti} />
                </View>
                <Text style={styles.atmBrandText}>Garanti BBVA</Text>
                <Text style={styles.atmBrandAtm}>ATM</Text>
              </View>

              <View style={styles.atmBezel}>
                <View style={styles.atmScreen}>
                  {qrMissing ? (
                    <View style={styles.qrPlaceholder} testID="qr-missing">
                      <Ionicons
                        name="qr-code-outline"
                        size={56}
                        color={COLORS.onSurfaceMuted}
                      />
                      <Text style={styles.qrPlaceholderText}>
                        QR kod henüz yüklenmedi
                      </Text>
                    </View>
                  ) : (
                    <Image
                      testID="qr-image"
                      source={{ uri: QR_URI }}
                      style={styles.qrImage}
                      contentFit="contain"
                      onError={() => setQrMissing(true)}
                    />
                  )}
                  <Text style={styles.atmScreenHint}>
                    Karekodu ATM'ye okutunuz
                  </Text>
                </View>
              </View>

              {/* Kart yuvası + para çıkış detayı */}
              <View style={styles.atmSlotRow}>
                <View style={styles.atmSlot} />
                <View style={styles.atmSlotSmall} />
              </View>
            </View>

            {/* TL karşılığı — ATM'nin hemen altında */}
            <View style={styles.tlBox} testID="qr-tl-display">
              <Text style={styles.tlLabel}>YATIRILACAK TUTAR</Text>
              <Text style={styles.tlBig}>
                {tl != null ? `${fmtTl(tl)} ₺` : "— ₺"}
              </Text>

              {/* Kur satırı — dokununca elle düzenlenebilir */}
              {editingRate ? (
                <View style={styles.rateEditRow}>
                  <TextInput
                    testID="qr-rate-input"
                    value={manualRate ?? (rate != null ? String(rate) : "")}
                    onChangeText={setManualRate}
                    keyboardType="decimal-pad"
                    inputMode="decimal"
                    style={styles.rateInput}
                    autoFocus
                  />
                  <Pressable
                    style={styles.rateOkBtn}
                    onPress={() => setEditingRate(false)}
                    hitSlop={8}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </Pressable>
                  {manualRate != null && (
                    <Pressable
                      style={[styles.rateOkBtn, styles.rateResetBtn]}
                      onPress={() => {
                        setManualRate(null);
                        setEditingRate(false);
                      }}
                      hitSlop={8}
                    >
                      <Ionicons name="refresh" size={16} color="#FFFFFF" />
                    </Pressable>
                  )}
                </View>
              ) : (
                <Pressable
                  testID="qr-rate-row"
                  style={styles.rateRow}
                  onPress={() => setEditingRate(true)}
                >
                  <Text style={styles.rateText}>
                    {rate != null
                      ? `1 € = ${rate.toLocaleString("tr-TR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })} ₺`
                      : "Kur yok — dokunup elle girin"}
                  </Text>
                  <Ionicons
                    name="pencil"
                    size={12}
                    color={COLORS.onSurfaceMuted}
                  />
                </Pressable>
              )}
              {!!rateLabel && rate != null && (
                <Text style={styles.rateSource}>{rateLabel}</Text>
              )}
              {error && rate == null && (
                <Pressable style={styles.retryBtn} onPress={fetchRate}>
                  <Text style={styles.retryText}>Kuru Tekrar Çek</Text>
                </Pressable>
              )}
            </View>

            {/* Yolcu talimatı */}
            <View style={styles.noteCard}>
              <Ionicons
                name="information-circle"
                size={18}
                color={COLORS.brandSecondary}
              />
              <Text style={styles.noteText}>
                Yolcu, en yakın Garanti BBVA ATM'sinde{" "}
                <Text style={styles.noteBold}>QR İşlemler → Para Yatırma</Text>
                {" "}adımını seçip bu karekodu okutur ve yukarıdaki TL tutarını
                yatırır. Tutar, günün satış kurundan hesaplanır ve rehber
                lehine tam liraya yuvarlanır.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.brandPrimary },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
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
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  headerSub: {
    color: "#CFE0F5",
    fontSize: 11,
    marginTop: 1,
  },
  content: {
    backgroundColor: COLORS.surface,
    paddingBottom: 40,
    flexGrow: 1,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  inputCard: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: COLORS.onSurfaceMuted,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inputSymbol: {
    fontSize: 30,
    fontWeight: "800",
    color: COLORS.brandSecondary,
  },
  input: {
    flex: 1,
    fontSize: 34,
    fontWeight: "800",
    color: COLORS.onSurface,
    paddingVertical: 4,
  },
  eurBig: {
    fontSize: 40,
    fontWeight: "900",
    color: COLORS.brandPrimary,
    textAlign: "center",
    marginTop: 22,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  // ── ATM görseli ──
  atmBody: {
    marginHorizontal: 32,
    backgroundColor: COLORS.atmBody,
    borderRadius: 18,
    paddingBottom: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 6,
  },
  atmBrandBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.garanti,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  atmBrandDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  atmBrandText: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  atmBrandAtm: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  atmBezel: {
    margin: 14,
    marginBottom: 8,
    backgroundColor: COLORS.atmBezel,
    borderRadius: 12,
    padding: 10,
  },
  atmScreen: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  qrPlaceholder: {
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    borderRadius: 8,
  },
  qrPlaceholderText: {
    fontSize: 12,
    color: COLORS.onSurfaceMuted,
    textAlign: "center",
  },
  atmScreenHint: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.garantiDark,
    letterSpacing: 0.4,
  },
  atmSlotRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    marginTop: 4,
  },
  atmSlot: {
    width: 110,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.atmBezel,
  },
  atmSlotSmall: {
    width: 34,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.atmBezel,
  },
  // ── TL sonuç ──
  tlBox: {
    alignItems: "center",
    marginTop: 18,
    marginHorizontal: 16,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: COLORS.garanti,
  },
  tlLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    color: COLORS.onSurfaceMuted,
  },
  tlBig: {
    fontSize: 44,
    fontWeight: "900",
    color: COLORS.garanti,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  rateText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.onSurface,
  },
  rateSource: {
    fontSize: 11,
    color: COLORS.onSurfaceMuted,
    marginTop: 2,
  },
  rateEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  rateInput: {
    width: 110,
    height: 36,
    borderWidth: 1,
    borderColor: COLORS.brandSecondary,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.onSurface,
    backgroundColor: COLORS.surface,
    textAlign: "center",
  },
  rateOkBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.garanti,
    alignItems: "center",
    justifyContent: "center",
  },
  rateResetBtn: {
    backgroundColor: COLORS.onSurfaceMuted,
  },
  retryBtn: {
    marginTop: 10,
    backgroundColor: COLORS.brandPrimary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  noteCard: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#E6F0F9",
    borderRadius: 12,
    padding: 14,
  },
  noteText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.onSurface,
  },
  noteBold: { fontWeight: "800" },
});
