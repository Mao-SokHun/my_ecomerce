import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string) {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const tokenStorage = {
  getToken: () => getItem('token'),
  getRefreshToken: () => getItem('refreshToken'),
  setTokens: async (token: string, refreshToken?: string) => {
    await setItem('token', token);
    if (refreshToken) await setItem('refreshToken', refreshToken);
  },
  clear: async () => {
    await removeItem('token');
    await removeItem('refreshToken');
  },
};
