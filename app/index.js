import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { getLibrary } from "../src/api/mangadex"; // dostosuj ścieżkę jeśli masz inną

export default function Index() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem("mangadex_token");
        if (!token) {
          await router.replace("/screens/LoginScreen");
          return;
        }

        // walidujemy token próbą pobrania biblioteki
        try {
          await getLibrary(token);
          await router.replace("/screens/LibraryScreen");
        } catch (e) {
          // usuń lokalne tokeny jeśli walidacja nie przeszła
          await AsyncStorage.removeItem("mangadex_token");
          await AsyncStorage.removeItem("mangadex_refresh_token");
          console.warn("Token invalid, redirecting to Login:", e?.message || e);
          await router.replace("/screens/LoginScreen");
        }
      } catch (e) {
        console.error("Startup error:", e);
        setError("Wystąpił błąd podczas sprawdzania statusu logowania.");
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0d0d0d", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#ff0066" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0d0d0d", justifyContent: "center", alignItems: "center", padding: 20 }}>
        <Text style={{ color: "#fff", marginBottom: 12 }}>{error}</Text>
        <TouchableOpacity
          onPress={async () => {
            await AsyncStorage.removeItem("mangadex_token");
            await AsyncStorage.removeItem("mangadex_refresh_token");
            await router.replace("/screens/LoginScreen");
          }}
          style={{ padding: 12, backgroundColor: "#ff0066", borderRadius: 8 }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>Przejdź do logowania</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}