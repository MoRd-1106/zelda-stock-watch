import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { EAS_PROJECT_ID } from './config';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function getExpoPushToken(): Promise<string> {
  if (!Device.isDevice) {
    throw new Error('Las notificaciones push requieren un dispositivo físico.');
  }

  if (!EAS_PROJECT_ID) {
    throw new Error('Define EXPO_PUBLIC_EAS_PROJECT_ID para habilitar Expo Push.');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('stock-alerts', {
      name: 'Alertas de stock',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;
  if (existing.status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }
  if (finalStatus !== 'granted') {
    throw new Error('No se concedió permiso para notificaciones.');
  }

  const projectId = EAS_PROJECT_ID || Constants.expoConfig?.extra?.eas?.projectId;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

export async function copyPushToken(token: string) {
  await Clipboard.setStringAsync(token);
}
