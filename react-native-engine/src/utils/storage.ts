import { Platform } from "react-native";

const THEME_STORAGE_KEY = "automobile-complete-theme";

/**
 * Cross-platform storage utility
 * Uses localStorage on web, AsyncStorage on native (if available)
 */
export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    } else {
      // For native, try to use AsyncStorage if available
      try {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        return await AsyncStorage.getItem(key);
      } catch (e) {
        // AsyncStorage not available, return null
        return null;
      }
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        // Ignore storage errors
      }
    } else {
      // For native, try to use AsyncStorage if available
      try {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        await AsyncStorage.setItem(key, value);
      } catch (e) {
        // AsyncStorage not available, ignore
      }
    }
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // Ignore storage errors
      }
    } else {
      try {
        const AsyncStorage = require("@react-native-async-storage/async-storage").default;
        await AsyncStorage.removeItem(key);
      } catch (e) {
        // Ignore storage errors
      }
    }
  },
};

/**
 * Get theme from storage
 */
export async function getStoredTheme(): Promise<string | null> {
  return await storage.getItem(THEME_STORAGE_KEY);
}

/**
 * Save theme to storage
 */
export async function saveTheme(theme: string): Promise<void> {
  await storage.setItem(THEME_STORAGE_KEY, theme);
}

/**
 * Get theme from URL search params (web only)
 */
export function getThemeFromURL(): string | null {
  if (Platform.OS !== "web") {
    return null;
  }

  try {
    if (typeof window !== "undefined" && window.location) {
      const params = new URLSearchParams(window.location.search);
      const theme = params.get("theme");
      if (theme === "light" || theme === "dark" || theme === "system") {
        return theme;
      }
    }
  } catch (e) {
    // Ignore errors
  }

  return null;
}

