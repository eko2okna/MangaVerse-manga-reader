import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import qs from "qs"; // npm install qs
// No platform-specific API proxying; Expo Go uses native platforms

const BASE_URL = "https://api.mangadex.org";
const AUTH_URL = "https://auth.mangadex.org/realms/mangadex/protocol/openid-connect/token";

const TOKEN_KEY = "mangadex_token";
const REFRESH_KEY = "mangadex_refresh_token";
const CLIENT_ID_KEY = "mangadex_client_id";
const CLIENT_SECRET_KEY = "mangadex_client_secret";

// 🔐 Logowanie (password grant)
export async function login(username, password, clientId, clientSecret) {
  const user = username?.trim();
  const pass = password?.trim();

  if (!user || !pass) throw new Error("Missing username/email or password.");

  let payload;
  try {
    payload = qs.stringify({
      grant_type: "password",
      username: user,
      password: pass,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await axios.post(AUTH_URL, payload, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const { access_token, refresh_token } = response.data;
    if (!access_token) throw new Error("No access token in API response.");

    await AsyncStorage.setItem(TOKEN_KEY, access_token);
    await AsyncStorage.setItem(REFRESH_KEY, refresh_token);
    if (clientId) await AsyncStorage.setItem(CLIENT_ID_KEY, clientId);
    if (clientSecret) await AsyncStorage.setItem(CLIENT_SECRET_KEY, clientSecret);

    console.log("✅ Logged in successfully!");
    return access_token;

  } catch (err) {
    const safeRequest = {
      username: user,
      password: pass ? `*** (len=${pass.length})` : null,
      client_id: clientId,
    };
    console.error("❌ Login error:", {
      status: err.response?.status,
      responseData: err.response?.data,
      request: safeRequest,
      message: err.message,
    });
    throw new Error("Login failed — check your credentials or API client settings.");
  }
}

// 📦 Pobieranie zapisanego tokena
export async function getToken() {
  return await AsyncStorage.getItem(TOKEN_KEY);
}

// 🔄 Odświeżanie tokena
export async function refreshToken() {
  const refresh_token = await AsyncStorage.getItem(REFRESH_KEY);
  if (!refresh_token) throw new Error("No refresh_token stored.");

  try {
    // pobierz zapisane dane klienta (jeśli dostępne)
    const [client_id, client_secret] = await Promise.all([
      AsyncStorage.getItem(CLIENT_ID_KEY),
      AsyncStorage.getItem(CLIENT_SECRET_KEY),
    ]);

    const payload = {
      grant_type: "refresh_token",
      refresh_token,
    };
    if (client_id) payload.client_id = client_id;
    if (client_secret) payload.client_secret = client_secret;

    const data = qs.stringify(payload);

    const response = await axios.post(AUTH_URL, data, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const { access_token, refresh_token: new_refresh } = response.data;
  if (!access_token) throw new Error("No access token in API response during refresh.");

    await AsyncStorage.setItem(TOKEN_KEY, access_token);
    if (new_refresh) await AsyncStorage.setItem(REFRESH_KEY, new_refresh);

    console.log("🔁 Token refreshed.");
    return access_token;

  } catch (err) {
    console.error("❌ Token refresh error:", err.response?.data || err.message);
    throw new Error("Failed to refresh token.");
  }
}

// 📚 Pobieranie biblioteki użytkownika
export async function getLibrary() {
  let token = await getToken();
  if (!token) token = await refreshToken();

  try {
    const response = await axios.get(`${BASE_URL}/user/follows/manga`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { 
        'includes[]': 'cover_art',
        // możesz też dodać inne include w razie potrzeby, np. author, artist
      },
      // zapewnij serializację z bracketami: includes[]=cover_art
      paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'brackets' }),
    });
    return response.data.data;
  } catch (err) {
    console.error("❌ Library fetch error:", err.response?.data || err.message);
    throw err;
  }
}

// 🔁📖 Pobierz rozdziały (feed) dla danej mangi
export async function getMangaChapters(mangaId, { translatedLanguage = "en", limit = 500 } = {}) {
  try {
    const url = `${BASE_URL}/manga/${mangaId}/feed?translatedLanguage[]=${encodeURIComponent(
      translatedLanguage
    )}&order[chapter]=asc&limit=${encodeURIComponent(limit)}`;

    const response = await axios.get(url);
    // API zwraca obiekt z polem data (lista rozdziałów)
    return response.data?.data || [];
  } catch (err) {
    console.error("getMangaChapters error:", err);
    throw err;
  }
}

// Pobiera listę pełnych URLi stron rozdziału
export async function getChapterPages(chapterId) {
  try {
    const chapterResp = await axios.get(`${BASE_URL}/chapter/${chapterId}`);
    const atHomeResp = await axios.get(`${BASE_URL}/at-home/server/${chapterId}`);

    const chapterData = chapterResp.data ?? {};
    const atHomeData = atHomeResp.data ?? {};

    // baseUrl z at-home
    const baseUrl = atHomeData.baseUrl ?? atHomeData.base_url ?? atHomeData.baseURI ?? atHomeData.base_uri;

    // możliwe miejsca z listą plików i hashem
    const atHomeChapter = atHomeData.chapter ?? atHomeData;
    const filesFromAtHome = Array.isArray(atHomeChapter.data)
      ? atHomeChapter.data
      : atHomeChapter.data
      ? Object.values(atHomeChapter.data)
      : null;
    const hashFromAtHome = atHomeChapter.hash ?? null;

    const chapterAttrs = chapterData.data?.attributes ?? chapterData.attributes ?? chapterData.chapter ?? chapterData;
    const filesFromChapter = chapterAttrs?.data
      ? Array.isArray(chapterAttrs.data)
        ? chapterAttrs.data
        : Object.values(chapterAttrs.data)
      : null;
    const hashFromChapter = chapterAttrs?.hash ?? null;

    const dataFiles = filesFromChapter || filesFromAtHome;
    const hash = hashFromChapter || hashFromAtHome;

    if (!baseUrl || !dataFiles || !Array.isArray(dataFiles) || !hash) {
      console.error("getChapterPages: unexpected API response", {
        chapterId,
        chapterResponse: chapterResp.data,
        atHomeResponse: atHomeResp.data,
      });
      throw new Error("Invalid API response while fetching chapter pages.");
    }

    const base = baseUrl.replace(/\/+$/, "");
    const pages = dataFiles.map((filename) => `${base}/data/${hash}/${encodeURIComponent(filename)}`);

    return pages;
  } catch (err) {
    console.error("getChapterPages error:", err);
    throw err;
  }
}