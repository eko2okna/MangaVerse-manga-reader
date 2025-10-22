import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet, Image } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLibrary } from "../../src/api/mangadex";
import { useRouter } from "expo-router";

export default function LibraryScreen({ navigation }) {
  const router = useRouter();
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchLibrary() {
      try {
        const token = await AsyncStorage.getItem("mangadex_token");
        if (!token) {
          setError("Brak tokena – zaloguj się ponownie.");
          setLoading(false);
          return;
        }
        const data = await getLibrary(token);
        setLibrary(data);
      } catch (err) {
        console.error("Błąd pobierania biblioteki:", err);
        setError("Nie udało się pobrać biblioteki.");
      } finally {
        setLoading(false);
      }
    }

    fetchLibrary();
  }, []);

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

  return (
    <View style={styles.container}>
      <FlatList
        data={library}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const coverFileName = item.relationships.find(r => r.type === "cover_art")?.attributes?.fileName;
          const coverUrl = coverFileName
            ? `https://uploads.mangadex.org/covers/${item.id}/${coverFileName}.256.jpg`
            : null;

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={async () => {
                try {
                  await AsyncStorage.setItem("selected_manga", JSON.stringify(item));
                  await router.push("/screens/MangaDetailScreen");
                } catch (e) {
                  console.error("Navigation error:", e);
                }
              }}
            >
              {coverUrl && (
                <Image source={{ uri: coverUrl }} style={styles.cover} resizeMode="cover" />
              )}
              <Text style={styles.title}>
                {item.attributes.title.en || Object.values(item.attributes.title)[0]}
              </Text>
            </TouchableOpacity>
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
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 10,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  cover: {
    width: 70,
    height: 100,
    borderRadius: 6,
    marginRight: 12,
  },
  title: {
    color: "#fff",
    fontSize: 15,
    flexShrink: 1,
  },
});
