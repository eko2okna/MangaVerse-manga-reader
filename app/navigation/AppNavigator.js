import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { login } from "../../src/api/mangadex";

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");
    setLoading(true);

    try {
      const token = await login(username, password, clientId, clientSecret, email);
      if (token) {
  console.log("Logged in, token:", token);
  navigation.replace("Library"); // go to library
      }
    } catch (err) {
  setError("Could not log in. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MangaDex Login</Text>

      <TextInput
        style={styles.input}
  placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
  placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TextInput
        style={styles.input}
        placeholder="Client ID"
        value={clientId}
        onChangeText={setClientId}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Client Secret"
        value={clientSecret}
        onChangeText={setClientSecret}
        secureTextEntry
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log in</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 40,
  },
  input: {
    width: "100%",
    backgroundColor: "#1c1c1e",
    color: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#ff0066",
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  error: {
    color: "#ff4d4d",
    marginBottom: 20,
  },
});