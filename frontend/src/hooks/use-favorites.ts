import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, useCallback } from "react";

const KEY = "favorite_hotels_v1";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        setFavorites(raw ? JSON.parse(raw) : []);
      } catch {
        setFavorites([]);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persist = async (next: string[]) => {
    setFavorites(next);
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const toggle = useCallback(
    (id: string) => {
      const next = favorites.includes(id)
        ? favorites.filter((x) => x !== id)
        : [...favorites, id];
      persist(next);
    },
    [favorites]
  );

  const isFavorite = useCallback(
    (id: string) => favorites.includes(id),
    [favorites]
  );

  return { favorites, isFavorite, toggle, loaded };
}
