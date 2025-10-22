import React, { useEffect, useState } from "react";
import { View, Text, Image, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getMangaChapters, getChapterPages } from "../../src/api/mangadex";
import { useRouter } from "expo-router";

export default function MangaDetailScreen({ route, navigation }) {
  const router = useRouter();
  // najpierw sprawdzamy route.params, a jeśli nie ma — ładujemy z AsyncStorage
  const [manga, setManga] = useState(route?.params?.manga ?? null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadedIds, setDownloadedIds] = useState(new Set());

  // po pobraniu chapters — sprawdź, które rozdziały są w cache
  useEffect(() => {
    async function refreshDownloads() {
      try {
        if (!chapters || chapters.length === 0) return;
        const checks = await Promise.all(
          chapters.map(async (c) => {
            const key = `chapter_pages_${c.id}`;
            const v = await AsyncStorage.getItem(key);
            return v ? c.id : null;
          })
        );
        const present = new Set(checks.filter(Boolean));
        setDownloadedIds(present);
      } catch (e) {
        console.error("refreshDownloads error:", e);
      }
    }
    refreshDownloads();
  }, [chapters]);

  useEffect(() => {
    async function loadManga() {
      if (!manga) {
        try {
          const raw = await AsyncStorage.getItem("selected_manga");
          if (raw) setManga(JSON.parse(raw));
        } catch (e) {
          console.error("Failed to read selected_manga:", e);
        }
      }
    }
    loadManga();
  }, []);

  useEffect(() => {
    async function fetchChapters() {
      if (!manga) return;
      try {
        const data = await getMangaChapters(manga.id);
        setChapters(data);
      } catch (err) {
        console.error("Błąd pobierania rozdziałów:", err);
        setError("Nie udało się pobrać rozdziałów.");
      } finally {
        setLoading(false);
      }
    }
    fetchChapters();
  }, [manga]);

  if (!manga) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#fff" }}>Brak danych mangi — wróć do biblioteki.</Text>
      </View>
    );
  }

  const title = manga.attributes?.title?.en || Object.values(manga.attributes?.title || {})[0];
  const coverFileName = manga.relationships?.find(r => r.type === "cover_art")?.attributes?.fileName;
  const coverUrl = coverFileName
    ? `https://uploads.mangadex.org/covers/${manga.id}/${coverFileName}.512.jpg`
    : null;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#ff0066" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: "#fff" }}>{error}</Text>
      </View>
    );
  }

  // helper: pobierz i zapisz
  async function downloadChapterAndOpen(item) {
    if (downloadingId) return;
    setDownloadingId(item.id);
    try {
      const pages = await getChapterPages(item.id);
      await AsyncStorage.setItem(`chapter_pages_${item.id}`, JSON.stringify(pages));
      // update state
      setDownloadedIds((prev) => new Set(Array.from(prev).concat(item.id)));
      await AsyncStorage.setItem("selected_chapter", JSON.stringify(item));
      await router.push("/screens/ReaderScreen");
    } catch (e) {
      console.error("Błąd pobierania rozdziału:", e);
    } finally {
      setDownloadingId(null);
    }
  }

  // helper: usuń cache rozdziału
  async function deleteDownloadedChapter(item) {
    try {
      await AsyncStorage.removeItem(`chapter_pages_${item.id}`);
      setDownloadedIds((prev) => {
        const copy = new Set(prev);
        copy.delete(item.id);
        return copy;
      });
    } catch (e) {
      console.error("Błąd usuwania pobranego rozdziału:", e);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { if (router?.back) return router.back(); if (navigation?.goBack) return navigation.goBack(); }}>
          <Text style={styles.headerText}>◀ Powrót</Text>
        </TouchableOpacity>
      </View>

      {coverUrl && <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" />}
      <Text style={styles.title}>{title}</Text>

      <FlatList
        data={chapters}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isDownloaded = downloadedIds.has(item.id);
          // wyciągamy numer rozdziału i tytuł (jeśli dostępny)
          const attrs = item.attributes || {};
          const chapterNumber = attrs.chapter ? `Rozdział ${attrs.chapter}` : null;

          // bezpieczne wydobycie tytułu: obsługuje string, mapa języków i zagnieżdżone obiekty
          let titleValue = null;
          if (attrs.title) {
            if (typeof attrs.title === "string") {
              titleValue = attrs.title;
            } else if (typeof attrs.title === "object") {
              const candidates = Object.values(attrs.title)
                .map(v => {
                  if (typeof v === "string") return v;
                  if (v && typeof v === "object") return Object.values(v).find(Boolean) || "";
                  return "";
                })
                .filter(Boolean);
              // wybierz najdłuższy (często to pełny tytuł)
              titleValue = candidates.sort((a, b) => b.length - a.length)[0] || null;
            }
          }

          const displayTitle = chapterNumber
            ? titleValue
              ? `${chapterNumber} — ${titleValue}`
              : chapterNumber
            : titleValue || "Rozdział";

          return (
            <View style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <TouchableOpacity
                  style={[styles.chapter, { flex: 1 }]}
                  onPress={async () => {
                    try {
                      await AsyncStorage.setItem("selected_chapter", JSON.stringify(item));
                      await router.push("/screens/ReaderScreen");
                    } catch (e) {
                      console.error("Navigation to Reader failed:", e);
                    }
                  }}
                >
                  <Text style={styles.chapterText}>{displayTitle}</Text>
                  {isDownloaded && <Text style={{ marginLeft: 8 }}>✅</Text>}
                </TouchableOpacity>

                <View style={{ flexDirection: "row", marginLeft: 8 }}>
                  {!isDownloaded ? (
                    <TouchableOpacity
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                        backgroundColor: "#ff0066",
                        borderRadius: 8,
                        marginLeft: 8,
                      }}
                      onPress={() => downloadChapterAndOpen(item)}
                    >
                      <Text style={{ color: "#fff", fontWeight: "600" }}>
                        {downloadingId === item.id ? "Pobieranie..." : "Pobierz"}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                        backgroundColor: "#444",
                        borderRadius: 8,
                        marginLeft: 8,
                      }}
                      onPress={() => deleteDownloadedChapter(item)}
                    >
                      <Text style={{ color: "#fff", fontWeight: "600" }}>Usuń</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    padding: 10,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0d0d0d",
  },
  header: {
    width: "100%",
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: "transparent",
  },
  headerText: {
    color: "#fff",
    fontSize: 16,
  },
  cover: {
    width: "100%",
    height: 300,
    borderRadius: 10,
    marginBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  subtitle: {
    color: "#aaa",
    marginBottom: 10,
  },
  chapter: {
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  chapterText: {
    color: "#fff",
  },
});
