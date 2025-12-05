import { Platform } from "react-native";
import { storage } from "./storage";

export interface ConfigCacheOptions<T> {
  key: string;
  defaultValue: T;
  urlParamName?: string;
  validate?: (value: unknown) => value is T;
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
}

/**
 * A modular controller for managing configuration values with priority:
 * 1. URL search params (highest priority)
 * 2. Cached in storage (second priority)
 * 3. Default value (fallback)
 */
export class ConfigCacheController<T> {
  private key: string;
  private defaultValue: T;
  private urlParamName: string;
  private validate: (value: unknown) => value is T;
  private serialize: (value: T) => string;
  private deserialize: (value: string) => T;

  constructor(options: ConfigCacheOptions<T>) {
    this.key = options.key;
    this.defaultValue = options.defaultValue;
    this.urlParamName = options.urlParamName || options.key;
    this.validate = options.validate || ((value): value is T => value as T);
    this.serialize = options.serialize || ((value) => String(value));
    this.deserialize = options.deserialize || ((value) => value as T);
  }

  /**
   * Get the configuration value following priority order:
   * 1. URL search params (if on web)
   * 2. Cached value from storage
   * 3. Default value
   */
  async getValue(): Promise<T> {
    // Priority 1: URL search params (web only)
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.location) {
          const params = new URLSearchParams(window.location.search);
          const urlValue = params.get(this.urlParamName);
          if (urlValue !== null) {
            const deserialized = this.deserialize(urlValue);
            if (this.validate(deserialized)) {
              // Save to cache for future use
              await this.setValue(deserialized);
              return deserialized;
            }
          }
        }
      } catch (e) {
        // Ignore errors, fall through to next priority
      }
    }

    // Priority 2: Cached value from storage
    try {
      const cached = await storage.getItem(this.key);
      if (cached !== null) {
        const deserialized = this.deserialize(cached);
        if (this.validate(deserialized)) {
          return deserialized;
        }
      }
    } catch (e) {
      // Ignore errors, fall through to default
    }

    // Priority 3: Default value
    return this.defaultValue;
  }

  /**
   * Set and cache the configuration value
   */
  async setValue(value: T): Promise<void> {
    try {
      const serialized = this.serialize(value);
      await storage.setItem(this.key, serialized);
    } catch (e) {
      // Ignore storage errors
    }
  }

  /**
   * Clear the cached value (revert to default)
   */
  async clearValue(): Promise<void> {
    try {
      await storage.removeItem(this.key);
    } catch (e) {
      // Ignore storage errors
    }
  }

  /**
   * Get the current value synchronously (for initial render)
   * This will only check URL params on web, otherwise returns default
   */
  getValueSync(): T {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined" && window.location) {
          const params = new URLSearchParams(window.location.search);
          const urlValue = params.get(this.urlParamName);
          if (urlValue !== null) {
            const deserialized = this.deserialize(urlValue);
            if (this.validate(deserialized)) {
              return deserialized;
            }
          }
        }
      } catch (e) {
        // Ignore errors
      }
    }
    return this.defaultValue;
  }
}

