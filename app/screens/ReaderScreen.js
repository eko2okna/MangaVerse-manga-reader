import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Image,
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  Animated,
  ScrollView,
  Platform,
  Pressable,
  Dimensions,
} from "react-native";
import ImageZoom from "react-native-image-pan-zoom";
import { getChapterPages } from "../../src/api/mangadex";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

function PageView({ uri, pageHeight, onNext, onPrev, onScaleChange }) {
  const windowWidth = Dimensions.get("window").width;
  const [scale, setScale] = useState(1);

  return (
    <View style={{ height: pageHeight, width: windowWidth, justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
      <ImageZoom
        cropWidth={windowWidth}
        cropHeight={pageHeight}
        imageWidth={windowWidth}
        imageHeight={pageHeight}
        panToMove={true}
        pinchToZoom={true}
        enableDoubleClick={false}
        onDoubleClick={() => {}}
        minScale={1}
        maxScale={3}
        onMove={(evt) => {
          // react-native-image-pan-zoom przekazuje obiekt z polem scale
          if (evt && typeof evt.scale === "number") {
            setScale(evt.scale);
            onScaleChange?.(evt.scale);
          }
        }}
        onClick={(evt) => {
          // Spróbujmy pobrać pozycję X kliknięcia i wybrać lewa/prawa połowa
          const e = evt?.nativeEvent || evt;
          const x = typeof e?.locationX === "number" ? e.locationX : null;
          if (x == null) return;
          // Ignoruj kliknięcia, gdy powiększone
          if ((scale ?? 1) > 1.02) return;
          if (x < windowWidth / 2) {
            onNext?.();
          } else {
            onPrev?.();
          }
        }}
      >
        <Image source={{ uri }} style={[styles.page, { width: windowWidth, height: pageHeight }]} resizeMode="contain" />
      </ImageZoom>
    </View>
  );
}

export default function ReaderScreen({ route, navigation }) {
  const router = useRouter();
  const [chapter, setChapter] = useState(route?.params?.chapter ?? null);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [chaptersOrder, setChaptersOrder] = useState([]);
  const [chapterPos, setChapterPos] = useState(null);
  const [transitioningNext, setTransitioningNext] = useState(false);

  // obliczamy wysokość strony (okno - przybliżony header)
  const WINDOW_HEIGHT = Dimensions.get("window").height;
  const HEADER_HEIGHT = 60; // dopasuj jeśli masz inny header
  const PAGE_HEIGHT = WINDOW_HEIGHT - HEADER_HEIGHT;
  const PAGE_WIDTH = Dimensions.get("window").width;
  const positionKeyRef = useRef(null);
  useEffect(() => {
    positionKeyRef.current = chapter ? `reading_pos_${chapter.id}` : null;
  }, [chapter]);

  // wczytaj zapisaną pozycję strony po załadowaniu stron
  useEffect(() => {
    (async () => {
      try {
        if (!chapter || pages.length === 0) return;
        const key = positionKeyRef.current;
        if (!key) return;
        const saved = await AsyncStorage.getItem(key);
        const idx = saved != null ? parseInt(saved, 10) : NaN;
        if (!Number.isNaN(idx) && idx >= 0 && idx < pages.length) {
          setCurrentIndex(idx);
          // Opóźnij, aby FlatList zdążyła się wyrenderować
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: idx, animated: false });
          }, 50);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [pages.length, chapter?.id]);

  // zapisuj bieżącą stronę
  useEffect(() => {
    (async () => {
      try {
        const key = positionKeyRef.current;
        if (!key) return;
        await AsyncStorage.setItem(key, String(currentIndex));
      } catch (e) {
        // ignore
      }
    })();
  }, [currentIndex]);
  

  // wczytaj kolejność rozdziałów i bieżącą pozycję (raz na start)
  useEffect(() => {
    (async () => {
      try {
        const [orderRaw, posRaw] = await Promise.all([
          AsyncStorage.getItem("chapters_order"),
          AsyncStorage.getItem("current_chapter_index"),
        ]);
        if (orderRaw) {
          const arr = JSON.parse(orderRaw);
          if (Array.isArray(arr)) setChaptersOrder(arr);
        }
        const p = posRaw != null ? parseInt(posRaw, 10) : NaN;
        if (!Number.isNaN(p)) setChapterPos(p);
      } catch (e) {
        // ignore
      }
    })();
  }, []);

    useEffect(() => {
    async function loadChapterAndPages() {
      try {
        if (!chapter) {
          const raw = await AsyncStorage.getItem("selected_chapter");
          if (raw) setChapter(JSON.parse(raw));
        }
        const current = chapter ?? JSON.parse(await AsyncStorage.getItem("selected_chapter"));
        if (!current) {
          setError("No chapter selected.");
          setLoading(false);
          return;
        }

        const cacheKey = `chapter_pages_${current.id}`;
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          setPages(JSON.parse(cached));
          setLoading(false);
          return;
        }

        const fetched = await getChapterPages(current.id);
        setPages(fetched);
        await AsyncStorage.setItem(cacheKey, JSON.stringify(fetched));
      } catch (e) {
  console.error("Failed to fetch chapter pages:", e);
  setError("Failed to load chapter pages.");
      } finally {
        setLoading(false);
      }
    }

    loadChapterAndPages();
  }, [chapter]);

  // przejście do kolejnego rozdziału
  const goToNextChapter = async () => {
    if (transitioningNext) return;
    if (!Array.isArray(chaptersOrder) || chaptersOrder.length === 0) return;
    const pos = typeof chapterPos === "number" ? chapterPos : chaptersOrder.indexOf(chapter?.id);
    const nextPos = (pos ?? -1) + 1;
    if (nextPos >= chaptersOrder.length || nextPos < 0) {
      // brak kolejnego rozdziału — pozostaw zapisany progres na ostatniej stronie
      return;
    }
    setTransitioningNext(true);
    try {
      const nextId = chaptersOrder[nextPos];
      const nextChapter = { id: nextId };
      setChapter(nextChapter);
      setPages([]);
      setCurrentIndex(0);
      setIsZoomed(false);
      setChapterPos(nextPos);
      await AsyncStorage.multiSet([
        ["selected_chapter", JSON.stringify(nextChapter)],
        ["current_chapter_index", String(nextPos)],
      ]);
    } finally {
      setTransitioningNext(false);
    }
  };

  // usunięto prompt na końcu rozdziału na prośbę użytkownika

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#ff0066" />
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Text style={{ color: "#fff" }}>{error}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#0d0d0d" }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { if (router?.back) return router.back(); if (navigation?.goBack) return navigation.goBack(); }}>
          <Text style={styles.headerText}>◀ Back</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        ref={flatListRef}
        data={pages.length > 0 ? [...pages, "__NEXT__"] : pages}
        keyExtractor={(item, idx) => (item === "__NEXT__" ? "__NEXT__" : String(idx))}
        renderItem={({ item, index }) => (
          item === "__NEXT__" ? (
            <View style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ color: "#aaa" }}>Continue to next chapter…</Text>
            </View>
          ) : (
            <PageView
              uri={item}
              pageHeight={PAGE_HEIGHT}
              onScaleChange={(s) => {
                if (index === currentIndex) {
                  setIsZoomed((s ?? 1) > 1.02);
                }
              }}
              onNext={() => {
                const isLast = pages.length > 0 && currentIndex >= pages.length - 1;
                if (isLast) {
                  goToNextChapter();
                  return;
                }
                const next = Math.min(currentIndex + 1, pages.length - 1);
                if (next !== currentIndex) {
                  setCurrentIndex(next);
                  flatListRef.current?.scrollToIndex({ index: next, animated: true });
                }
              }}
              onPrev={() => {
                const prev = Math.max(currentIndex - 1, 0);
                if (prev !== currentIndex) {
                  setCurrentIndex(prev);
                  flatListRef.current?.scrollToIndex({ index: prev, animated: true });
                }
              }}
            />
          )
        )}
        horizontal
        pagingEnabled
        inverted
        scrollEnabled={!isZoomed}
        disableIntervalMomentum
        bounces={false}
        decelerationRate="fast"
        snapToAlignment="start"
        showsHorizontalScrollIndicator={false}
        initialNumToRender={3}
        windowSize={5}
        removeClippedSubviews={false}
        onMomentumScrollEnd={undefined}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        onViewableItemsChanged={({ viewableItems }) => {
          if (isZoomed) return; // nie aktualizuj indeksu w trakcie zoomu/panowania
          if (viewableItems && viewableItems.length > 0) {
            const idx = viewableItems[0]?.index;
            if (typeof idx === "number") {
              if (pages.length > 0 && idx === pages.length) {
                // sentinel widoczny -> przejście do kolejnego rozdziału
                goToNextChapter();
                return;
              }
              setCurrentIndex(idx);
            }
          }
        }}
        getItemLayout={(_, index) => ({ length: PAGE_WIDTH, offset: PAGE_WIDTH * index, index })}
      />
      {/* Pasek postępu/pozycji strony */}
      <View style={styles.footerBar}>
        <Text style={styles.footerText}>{`${Math.min(currentIndex + 1, pages.length)} / ${pages.length}`}</Text>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0d0d0d",
  },
  page: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
    marginBottom: 8,
  },
  footerBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 8,
    alignItems: "center",
  },
  footerText: {
    color: "#fff",
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 10,
    overflow: "hidden",
  },
});