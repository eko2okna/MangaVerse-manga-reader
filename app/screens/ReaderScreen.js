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

function ZoomableImage({ uri, pageHeight }) {
  const windowWidth = Dimensions.get("window").width;
  return (
    <View style={{ height: pageHeight, justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
      <ImageZoom
        cropWidth={windowWidth}
        cropHeight={pageHeight}
        imageWidth={windowWidth}
        imageHeight={pageHeight}
        panToMove={true}
        pinchToZoom={true}
        enableDoubleClick={false}    // wyłącz double-tap
        onDoubleClick={() => {}}     // dodatkowy no-op handler dla pewności
        minScale={1}
        maxScale={3}
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

  // obliczamy wysokość strony (okno - przybliżony header)
  const WINDOW_HEIGHT = Dimensions.get("window").height;
  const HEADER_HEIGHT = 60; // dopasuj jeśli masz inny header
  const PAGE_HEIGHT = WINDOW_HEIGHT - HEADER_HEIGHT;

    useEffect(() => {
    async function loadChapterAndPages() {
      try {
        if (!chapter) {
          const raw = await AsyncStorage.getItem("selected_chapter");
          if (raw) setChapter(JSON.parse(raw));
        }
        const current = chapter ?? JSON.parse(await AsyncStorage.getItem("selected_chapter"));
        if (!current) {
          setError("Brak wybranego rozdziału.");
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
        console.error("Błąd pobierania stron rozdziału:", e);
        setError("Nie udało się załadować stron rozdziału.");
      } finally {
        setLoading(false);
      }
    }

    loadChapterAndPages();
  }, [chapter]);

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
          <Text style={styles.headerText}>◀ Powrót</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={pages}
        keyExtractor={(_, idx) => idx.toString()}
        renderItem={({ item }) => <ZoomableImage uri={item} pageHeight={PAGE_HEIGHT} />}
        pagingEnabled={true}                 // dokładne "zapadki" na każdej stronie
        snapToInterval={PAGE_HEIGHT}
        decelerationRate="fast"
        snapToAlignment="start"
        showsVerticalScrollIndicator={false}
        initialNumToRender={3}
        windowSize={5}
        removeClippedSubviews={false}
        getItemLayout={(_, index) => ({ length: PAGE_HEIGHT, offset: PAGE_HEIGHT * index, index })}
      />
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
});