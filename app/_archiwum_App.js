import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";

import LoginScreen from "./screens/LoginScreen";
import LibraryScreen from "./screens/LibraryScreen";
import MangaDetailScreen from "./screens/MangaDetailScreen";
import ReaderScreen from "./screens/ReaderScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await AsyncStorage.getItem("mangadex_token");
        setInitialRoute(token ? "Library" : "Login");
      } catch (e) {
        setInitialRoute("Login");
      }
    }
    checkAuth();
  }, []);

  if (initialRoute === null) {
    // możesz tu pokazać splash / loader
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0d0d0d" }}>
        <ActivityIndicator size="large" color="#ff0066" />
      </View>
    );
  }
  

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerStyle: { backgroundColor: "#0d0d0d" },
            headerTintColor: "#fff",
            contentStyle: { backgroundColor: "#0d0d0d" },
          }}
        >
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Logowanie" }} />
          <Stack.Screen name="Library" component={LibraryScreen} options={{ title: "Twoja biblioteka" }} />
          <Stack.Screen name="MangaDetail" component={MangaDetailScreen} options={{ title: "Szczegóły mangi" }} />
          <Stack.Screen name="Reader" component={ReaderScreen} options={{ title: "Czytnik" }} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
