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
  const [progressMap, setProgressMap] = useState({}); // { [chapterId]: { pos: number, total: number|null } }
  const [showDownloadedOnly, setShowDownloadedOnly] = useState(false);

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

  // Wczytaj progres czytania (ostatnia strona) i (jeśli możliwe) total stron z cache.
  useEffect(() => {
    async function loadProgress() {
      try {
        if (!chapters || chapters.length === 0) return;
        const entries = await Promise.all(
          chapters.map(async (c) => {
            try {
              const posRaw = await AsyncStorage.getItem(`reading_pos_${c.id}`);
              if (posRaw == null) return null; // brak progresu — nie pokazuj
              const pos = parseInt(posRaw, 10);
              if (Number.isNaN(pos) || pos < 0) return null;

              // total z cache jeśli jest
              let total = null;
              const pagesRaw = await AsyncStorage.getItem(`chapter_pages_${c.id}`);
              if (pagesRaw) {
                try {
                  const arr = JSON.parse(pagesRaw);
                  if (Array.isArray(arr)) total = arr.length;
                } catch {}
              }
              // jeśli nie ma total, pobierz tylko dla tych, które mają progres
              if (total == null) {
                try {
                  const pages = await getChapterPages(c.id);
                  total = Array.isArray(pages) ? pages.length : null;
                } catch (e) {
                  console.warn("Unable to fetch page count for", c.id, e?.message || e);
                }
              }

              return [c.id, { pos: pos + 1, total }];
            } catch (e) {
              return null;
            }
          })
        );
        const map = {};
        for (const ent of entries) {
          if (ent && ent[0]) map[ent[0]] = ent[1];
        }
        setProgressMap(map);
      } catch (e) {
        console.error("loadProgress error:", e);
      }
    }
    loadProgress();
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
  console.error("Failed to fetch chapters:", err);
  setError("Failed to fetch chapters.");
      } finally {
        setLoading(false);
      }
    }
    fetchChapters();
  }, [manga]);

  if (!manga) {
    return (
      <View style={styles.center}>
  <Text style={{ color: "#fff" }}>No manga data — go back to Library.</Text>
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

  // pobierz i zapisz
  async function downloadChapterAndOpen(item) {
    if (downloadingId) return;
    setDownloadingId(item.id);
    try {
      const pages = await getChapterPages(item.id);
      await AsyncStorage.setItem(`chapter_pages_${item.id}`, JSON.stringify(pages));
      // update state
      setDownloadedIds((prev) => new Set(Array.from(prev).concat(item.id)));
      // Nie otwieraj automatycznie czytnika po pobraniu — zostajemy na liście.
    } catch (e) {
      console.error("Chapter download error:", e);
    } finally {
      setDownloadingId(null);
    }
  }

  // usuń cache rozdziału
  async function deleteDownloadedChapter(item) {
    try {
      await AsyncStorage.removeItem(`chapter_pages_${item.id}`);
      await AsyncStorage.removeItem(`reading_pos_${item.id}`); // zresetuj progres czytania
      setDownloadedIds((prev) => {
        const copy = new Set(prev);
        copy.delete(item.id);
        return copy;
      });
      // wyczyść progres w pamięci, żeby odświeżył się napis (pos/total)
      setProgressMap((prev) => {
        const next = { ...(prev || {}) };
        if (next[item.id]) delete next[item.id];
        return next;
      });
    } catch (e) {
      console.error("Downloaded chapter deletion error:", e);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { if (router?.back) return router.back(); if (navigation?.goBack) return navigation.goBack(); }}>
          <Text style={styles.headerText}>◀ Back</Text>
        </TouchableOpacity>
      </View>

      {coverUrl && <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" />}
      <Text style={styles.title}>{title}</Text>
      <View style={{ flexDirection: "row", marginBottom: 8 }}>
        <TouchableOpacity
          onPress={() => setShowDownloadedOnly((v) => !v)}
          style={{
            paddingVertical: 6,
            paddingHorizontal: 10,
            backgroundColor: showDownloadedOnly ? "#ff0066" : "#333",
            borderRadius: 8,
            alignSelf: "flex-start",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>
            {showDownloadedOnly ? "Downloaded only" : "Show All"}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={showDownloadedOnly ? chapters.filter((c) => downloadedIds.has(c.id)) : chapters}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isDownloaded = downloadedIds.has(item.id);
          // wyciągamy numer rozdziału i tytuł (jeśli dostępny)
          const attrs = item.attributes || {};
          const chapterNumber = attrs.chapter ? `Chapter ${attrs.chapter}` : null;

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

          let displayTitle = chapterNumber
            ? titleValue
              ? `${chapterNumber} — ${titleValue}`
              : chapterNumber
            : titleValue || "Chapter";

          // Dołącz progres (jeśli istnieje)
          const prog = progressMap[item.id];
          if (prog && typeof prog.pos === "number") {
            const totalNum = typeof prog.total === "number" ? prog.total : null;
            const totalLabel = totalNum ?? "?";
            displayTitle += `  (${prog.pos}/${totalLabel})`;
            // Completed marker, gdy przeczytano ostatnią stronę
            if (totalNum != null && prog.pos >= totalNum) {
              displayTitle += " — Completed ✅";
            }
          }

          return (
            <View style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <TouchableOpacity
                  style={[styles.chapter, { flex: 1 }]}
                  onPress={async () => {
                    try {
                      const order = chapters.map((c) => c.id);
                      await AsyncStorage.multiSet([
                        ["selected_chapter", JSON.stringify(item)],
                        ["chapters_order", JSON.stringify(order)],
                        ["current_chapter_index", String(order.indexOf(item.id))],
                      ]);
                      await router.push("/screens/ReaderScreen");
                    } catch (e) {
                      console.error("Navigation to Reader failed:", e);
                    }
                  }}
                >
                  <Text style={styles.chapterText}>{displayTitle}</Text>
                  {isDownloaded && <Text style={{ marginLeft: 8 }}>⬇️</Text>}
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
                        {downloadingId === item.id ? "Downloading..." : "Download"}
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
                      <Text style={{ color: "#fff", fontWeight: "600" }}>Delete</Text>
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
