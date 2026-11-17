import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
const CHUNK_SIZE = 1800;
function countKey(key) {
  return `${key}.chunks`;
}
function partKey(key, index) {
  return `${key}.chunk.${index}`;
}
async function clearChunks(key) {
  const raw = await SecureStore.getItemAsync(countKey(key));
  const count = raw ? Number(raw) : 0;
  if (Number.isInteger(count) && count > 0) {
    for (let index = 0; index < count; index += 1) {
      await SecureStore.deleteItemAsync(partKey(key, index));
    }
  }
  if (raw) await SecureStore.deleteItemAsync(countKey(key));
}

/**
 * Sessão do Supabase no chaveiro do aparelho.
 * O valor é dividido porque o chaveiro do iOS recusa textos longos.
 */
export const sessionStorage = {
  async getItem(key) {
    if (Platform.OS === 'web') {
      try {
        return globalThis.localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    try {
      const raw = await SecureStore.getItemAsync(countKey(key));
      if (!raw) return null;
      const count = Number(raw);
      if (!Number.isInteger(count) || count <= 0) return null;
      const parts = [];
      for (let index = 0; index < count; index += 1) {
        const part = await SecureStore.getItemAsync(partKey(key, index));
        if (part == null) return null;
        parts.push(part);
      }
      return parts.join('');
    } catch {
      return null;
    }
  },
  async setItem(key, value) {
    if (Platform.OS === 'web') {
      globalThis.localStorage.setItem(key, value);
      return;
    }
    await clearChunks(key);
    const count = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
    for (let index = 0; index < count; index += 1) {
      const part = value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE);
      await SecureStore.setItemAsync(partKey(key, index), part);
    }
    await SecureStore.setItemAsync(countKey(key), String(count));
  },
  async removeItem(key) {
    if (Platform.OS === 'web') {
      globalThis.localStorage.removeItem(key);
      return;
    }
    await clearChunks(key);
  }
};
