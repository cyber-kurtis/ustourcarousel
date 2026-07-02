import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  FlatList,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const ADMIN_PIN = "ustour"; // simple gate; change as needed

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

const COLORS = {
  surface: "#F2F2F7",
  surfaceSecondary: "#FFFFFF",
  onSurface: "#1C1C1E",
  onSurfaceMuted: "#6E6E73",
  brandPrimary: "#003580",
  brandSecondary: "#0071C2",
  brandTertiary: "#E6F0F9",
  border: "#E5E5EA",
  danger: "#FF3B30",
  success: "#34C759",
};

const COUNTRIES = [
  "Türkiye",
  "Makedonya",
  "Arnavutluk",
  "Bosna Hersek",
  "Sırbistan",
  "Karadağ",
  "Bulgaristan",
  "Yunanistan",
];

const EMPTY_FORM: Hotel = {
  id: "",
  name: "",
  image_url: "",
  location: "",
  phone: "",
  email: "",
  website: "",
  country: "",
  kind: "hotel",
  description: "",
};

export default function Admin() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);

  if (!authed) {
    return (
      <SafeAreaView style={styles.gateSafe} edges={["top", "bottom"]}>
        <View style={styles.gateContainer}>
          <Pressable
            testID="gate-back"
            style={styles.gateBack}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.brandPrimary} />
          </Pressable>
          <Ionicons name="lock-closed" size={48} color={COLORS.brandPrimary} />
          <Text style={styles.gateTitle}>Yönetim Paneli</Text>
          <Text style={styles.gateSubtitle}>Devam etmek için şifreyi gir.</Text>
          <TextInput
            testID="admin-pin-input"
            value={pin}
            onChangeText={setPin}
            placeholder="Şifre"
            placeholderTextColor={COLORS.onSurfaceMuted}
            secureTextEntry
            style={styles.gateInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            testID="admin-pin-submit"
            style={styles.gateBtn}
            onPress={() => {
              if (pin === ADMIN_PIN) setAuthed(true);
              else setPin("");
            }}
          >
            <Text style={styles.gateBtnText}>Giriş Yap</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return <AdminPanel onExit={() => router.back()} />;
}

// ── Çevrimiçi rehberler (iç güvenlik) ──
type Guide = {
  id: string;
  name: string;
  device: string;
  first_seen: number;
  last_seen: number;
};

const ONLINE_MS = 3 * 60 * 1000; // son 3 dk içinde sinyal = çevrimiçi

function relTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return "az önce";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} sa önce`;
  return `${Math.floor(h / 24)} gün önce`;
}

function OnlineGuides() {
  const [guides, setGuides] = useState<Guide[] | null>(null);
  const [now, setNow] = useState(Date.now());
  const [expanded, setExpanded] = useState(false);

  const loadGuides = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL ?? ""}/api/presence`);
      const data = await res.json();
      setGuides(data.guides ?? []);
      setNow(data.now ?? Date.now());
    } catch {
      setGuides([]);
    }
  }, []);

  useEffect(() => {
    loadGuides();
  }, [loadGuides]);

  if (guides === null) return null;

  const online = guides.filter((g) => now - g.last_seen < ONLINE_MS);
  const shown = expanded ? guides : guides.slice(0, 5);

  return (
    <View style={styles.presenceCard}>
      <View style={styles.presenceHead}>
        <View style={styles.presenceTitleRow}>
          <View style={styles.onlineDotBig} />
          <Text style={styles.presenceTitle}>
            Çevrimiçi: {online.length}
          </Text>
          <Text style={styles.presenceSub}>
            · toplam {guides.length} cihaz
          </Text>
        </View>
        <Pressable onPress={loadGuides} hitSlop={8}>
          <Ionicons name="refresh-outline" size={18} color={COLORS.brandPrimary} />
        </Pressable>
      </View>

      {shown.map((g) => {
        const isOnline = now - g.last_seen < ONLINE_MS;
        return (
          <View key={g.id} style={styles.presenceRow}>
            <View
              style={[
                styles.onlineDot,
                { backgroundColor: isOnline ? COLORS.success : COLORS.border },
              ]}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.presenceName} numberOfLines={1}>
                {g.name || "İsimsiz rehber"}
              </Text>
              <Text style={styles.presenceDevice} numberOfLines={1}>
                {g.device || "Bilinmeyen cihaz"}
              </Text>
            </View>
            <Text style={styles.presenceTime}>
              {isOnline ? "çevrimiçi" : relTime(now - g.last_seen)}
            </Text>
          </View>
        );
      })}

      {guides.length > 5 && (
        <Pressable onPress={() => setExpanded(!expanded)} style={styles.presenceMore}>
          <Text style={styles.presenceMoreText}>
            {expanded ? "Daha az göster" : `${guides.length - 5} cihaz daha…`}
          </Text>
        </Pressable>
      )}
      {guides.length === 0 && (
        <Text style={styles.presenceEmpty}>Henüz sinyal alınmadı.</Text>
      )}
    </View>
  );
}

function AdminPanel({ onExit }: { onExit: () => void }) {
  const [items, setItems] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Hotel | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/hotels`);
      const data: Hotel[] = await res.json();
      setItems(data.sort((a, b) => a.name.localeCompare(b.name)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: string) => {
    await fetch(`${BACKEND_URL}/api/hotels/${id}`, { method: "DELETE" });
    load();
  };

  const handleSave = async (form: Hotel) => {
    setSaving(true);
    const payload = {
      name: form.name,
      image_url: form.image_url,
      location: form.location,
      phone: form.phone,
      email: form.email || "",
      website: form.website || "",
      country: form.country || "",
      kind: form.kind || "hotel",
      description: form.description || "",
    };
    try {
      if (form.id) {
        await fetch(`${BACKEND_URL}/api/hotels/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`${BACKEND_URL}/api/hotels`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <EditScreen
        initial={editing}
        onCancel={() => setEditing(null)}
        onSave={handleSave}
        saving={saving}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          testID="admin-back"
          style={styles.headerIconBtn}
          onPress={onExit}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Yönetim</Text>
        <Pressable
          testID="admin-add"
          style={styles.headerIconBtn}
          onPress={() => setEditing({ ...EMPTY_FORM })}
          hitSlop={8}
        >
          <Ionicons name="add" size={26} color="#FFFFFF" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center} testID="admin-loading">
          <ActivityIndicator size="large" color={COLORS.brandPrimary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={<OnlineGuides />}
          renderItem={({ item }) => (
            <View style={styles.row} testID={`admin-row-${item.id}`}>
              <Image
                source={item.image_url ? { uri: item.image_url } : undefined}
                style={styles.rowImage}
                contentFit="cover"
              />
              <View style={styles.rowInfo}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {item.kind === "restaurant" ? "Restoran" : "Otel"}
                  {item.country ? ` • ${item.country}` : ""}
                </Text>
              </View>
              <View style={styles.rowActions}>
                <Pressable
                  testID={`admin-edit-${item.id}`}
                  style={styles.iconBtn}
                  onPress={() => setEditing(item)}
                  hitSlop={6}
                >
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={COLORS.brandPrimary}
                  />
                </Pressable>
                <Pressable
                  testID={`admin-delete-${item.id}`}
                  style={[styles.iconBtn, { marginLeft: 4 }]}
                  onPress={() => handleDelete(item.id)}
                  hitSlop={6}
                >
                  <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function EditScreen({
  initial,
  onCancel,
  onSave,
  saving,
}: {
  initial: Hotel;
  onCancel: () => void;
  onSave: (h: Hotel) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Hotel>(initial);
  const set = (k: keyof Hotel, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const mime = result.assets[0].mimeType ?? "image/jpeg";
      set("image_url", `data:${mime};base64,${result.assets[0].base64}`);
    }
  };

  const canSave =
    form.name.trim() && form.location.trim() && form.phone.trim() && form.image_url;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          testID="edit-cancel"
          style={styles.headerIconBtn}
          onPress={onCancel}
          hitSlop={8}
        >
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>
          {form.id ? "Düzenle" : "Yeni Ekle"}
        </Text>
        <Pressable
          testID="edit-save"
          style={[styles.headerIconBtn, !canSave && { opacity: 0.4 }]}
          onPress={() => canSave && onSave(form)}
          disabled={!canSave || saving}
          hitSlop={8}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Ionicons name="checkmark" size={24} color="#FFFFFF" />
          )}
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        <Text style={styles.label}>Görsel</Text>
        <Pressable
          testID="edit-image-picker"
          style={styles.imagePicker}
          onPress={pickImage}
        >
          {form.image_url ? (
            <Image
              source={{ uri: form.image_url }}
              style={styles.imagePreview}
              contentFit="cover"
            />
          ) : (
            <View style={styles.imageEmpty}>
              <Ionicons
                name="image-outline"
                size={40}
                color={COLORS.brandPrimary}
              />
              <Text style={styles.imageEmptyText}>Görsel Seç</Text>
            </View>
          )}
        </Pressable>

        <Text style={styles.label}>Tür</Text>
        <View style={styles.kindRow}>
          <KindBtn
            testID="kind-hotel"
            label="Otel"
            icon="bed-outline"
            active={form.kind === "hotel"}
            onPress={() => set("kind", "hotel")}
          />
          <KindBtn
            testID="kind-restaurant"
            label="Restoran"
            icon="restaurant-outline"
            active={form.kind === "restaurant"}
            onPress={() => set("kind", "restaurant")}
          />
        </View>

        <Field
          label="İsim"
          value={form.name}
          onChange={(v) => set("name", v)}
          testID="field-name"
        />
        <Field
          label="Adres / Konum"
          value={form.location}
          onChange={(v) => set("location", v)}
          testID="field-location"
          multiline
        />
        <Field
          label="Telefon"
          value={form.phone}
          onChange={(v) => set("phone", v)}
          testID="field-phone"
          keyboardType="phone-pad"
        />
        <Field
          label="E-posta (opsiyonel)"
          value={form.email}
          onChange={(v) => set("email", v)}
          testID="field-email"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label="Web Sitesi (opsiyonel)"
          value={form.website ?? ""}
          onChange={(v) => set("website", v)}
          testID="field-website"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Ülke</Text>
        <View style={styles.countriesWrap}>
          {COUNTRIES.map((c) => (
            <Pressable
              key={c}
              testID={`country-${c}`}
              onPress={() => set("country", c)}
              style={[
                styles.countryChip,
                form.country === c && styles.countryChipActive,
              ]}
            >
              <Text
                style={[
                  styles.countryChipText,
                  form.country === c && styles.countryChipTextActive,
                ]}
              >
                {c}
              </Text>
            </Pressable>
          ))}
        </View>

        <Field
          label="Açıklama (opsiyonel)"
          value={form.description ?? ""}
          onChange={(v) => set("description", v)}
          testID="field-description"
          multiline
        />
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  testID,
  multiline,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testID: string;
  multiline?: boolean;
  keyboardType?: "default" | "phone-pad" | "email-address";
  autoCapitalize?: "none" | "sentences";
}) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChange}
        style={[styles.input, multiline && { minHeight: 80, textAlignVertical: "top" }]}
        multiline={multiline}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize={autoCapitalize ?? "sentences"}
        autoCorrect={false}
        placeholderTextColor={COLORS.onSurfaceMuted}
      />
    </View>
  );
}

function KindBtn({
  label,
  icon,
  active,
  onPress,
  testID,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.kindBtn, active && styles.kindBtnActive]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={active ? "#FFFFFF" : COLORS.brandPrimary}
      />
      <Text
        style={[styles.kindBtnText, active && styles.kindBtnTextActive]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    backgroundColor: COLORS.brandPrimary,
    paddingHorizontal: 8,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: { padding: 16, paddingBottom: 32 },
  // ── Çevrimiçi rehberler ──
  presenceCard: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  presenceHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  presenceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  onlineDotBig: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.success,
  },
  presenceTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.onSurface,
  },
  presenceSub: {
    fontSize: 12,
    color: COLORS.onSurfaceMuted,
  },
  presenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  presenceName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: COLORS.onSurface,
  },
  presenceDevice: {
    fontSize: 11.5,
    color: COLORS.onSurfaceMuted,
    marginTop: 1,
  },
  presenceTime: {
    fontSize: 11.5,
    color: COLORS.onSurfaceMuted,
    fontWeight: "600",
  },
  presenceMore: {
    paddingTop: 8,
    alignItems: "center",
  },
  presenceMoreText: {
    fontSize: 12.5,
    color: COLORS.brandSecondary,
    fontWeight: "700",
  },
  presenceEmpty: {
    fontSize: 12.5,
    color: COLORS.onSurfaceMuted,
    paddingVertical: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  rowImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  rowInfo: { flex: 1, marginLeft: 12 },
  rowName: { fontSize: 15, fontWeight: "600", color: COLORS.onSurface },
  rowMeta: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: 2 },
  rowActions: { flexDirection: "row" },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: COLORS.brandTertiary,
  },
  formContent: { padding: 16, paddingBottom: 48 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.brandPrimary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: COLORS.onSurface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  imagePicker: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    height: 180,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  imagePreview: { width: "100%", height: "100%" },
  imageEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  imageEmptyText: {
    color: COLORS.brandPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  kindRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  kindBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 12,
  },
  kindBtnActive: {
    backgroundColor: COLORS.brandPrimary,
    borderColor: COLORS.brandPrimary,
  },
  kindBtnText: { color: COLORS.brandPrimary, fontWeight: "600", fontSize: 14 },
  kindBtnTextActive: { color: "#FFFFFF" },
  countriesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  countryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  countryChipActive: {
    backgroundColor: COLORS.brandPrimary,
    borderColor: COLORS.brandPrimary,
  },
  countryChipText: { fontSize: 12, color: COLORS.onSurface, fontWeight: "500" },
  countryChipTextActive: { color: "#FFFFFF" },
  // Gate
  gateSafe: { flex: 1, backgroundColor: COLORS.surface },
  gateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  gateBack: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.brandTertiary,
  },
  gateTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.onSurface,
    marginTop: 16,
  },
  gateSubtitle: {
    fontSize: 14,
    color: COLORS.onSurfaceMuted,
    marginTop: 6,
    marginBottom: 24,
  },
  gateInput: {
    width: "100%",
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.onSurface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gateBtn: {
    width: "100%",
    marginTop: 16,
    backgroundColor: COLORS.brandPrimary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  gateBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
