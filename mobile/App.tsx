import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { loadStock } from './src/api';
import { copyPushToken, getExpoPushToken } from './src/notifications';
import type { StockPayload, StoreResult, StoreStatus } from './src/types';

const statusUi: Record<StoreStatus, { label: string; icon: string; tone: string }> = {
  AVAILABLE: { label: 'Disponible', icon: '🟢', tone: '#46d369' },
  PREORDER: { label: 'Preventa', icon: '🟢', tone: '#46d369' },
  COMING_SOON: { label: 'Próximamente', icon: '🟡', tone: '#eac54f' },
  OUT_OF_STOCK: { label: 'Agotado', icon: '🔴', tone: '#ff6b6b' },
  LISTED: { label: 'Ficha publicada', icon: '🔵', tone: '#6ba7ff' },
  NOT_FOUND: { label: 'Sin publicación', icon: '⚪', tone: '#b4b4b4' },
  BLOCKED: { label: 'Consulta bloqueada', icon: '🟠', tone: '#ffad4d' },
  ERROR: { label: 'Error de consulta', icon: '⚫', tone: '#aaaaaa' },
};

function priceText(store: StoreResult) {
  const value = store.price ?? store.expectedPrice;
  if (value == null) return 'Precio no confirmado';
  try {
    return new Intl.NumberFormat(store.country === 'Colombia' ? 'es-CO' : 'en-US', {
      style: 'currency',
      currency: store.currency,
      maximumFractionDigits: store.currency === 'COP' ? 0 : 2,
    }).format(value);
  } catch {
    return `${store.currency} ${value}`;
  }
}

function formatTime(value: string) {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Bogota',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function StoreCard({ store }: { store: StoreResult }) {
  const ui = statusUi[store.status];
  const buyable = store.status === 'AVAILABLE' || store.status === 'PREORDER';

  return (
    <View style={[styles.card, buyable && styles.cardBuyable]}>
      <View style={styles.cardTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.storeName}>{store.country === 'USA' ? '🇺🇸' : '🇨🇴'} {store.retailer}</Text>
          <Text style={[styles.status, { color: ui.tone }]}>{ui.icon} {ui.label}</Text>
        </View>
        <Text style={styles.price}>{priceText(store)}</Text>
      </View>
      <Text style={styles.reason}>{store.reason}</Text>
      <View style={styles.cardBottomRow}>
        <Text style={styles.checked}>Revisado: {formatTime(store.checkedAt)}</Text>
        <Pressable style={styles.openButton} onPress={() => Linking.openURL(store.url)}>
          <Text style={styles.openButtonText}>{buyable ? 'COMPRAR' : 'VER TIENDA'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function App() {
  const [data, setData] = useState<StockPayload | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [pushToken, setPushToken] = useState('');
  const [pushMessage, setPushMessage] = useState('');

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      setData(await loadStock());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string') Linking.openURL(url);
    });
    return () => sub.remove();
  }, []);

  const grouped = useMemo(() => {
    const stores = data?.stores ?? [];
    return {
      usa: stores.filter((s) => s.country === 'USA'),
      colombia: stores.filter((s) => s.country === 'Colombia'),
    };
  }, [data]);

  const configurePush = async () => {
    setPushMessage('');
    try {
      const token = await getExpoPushToken();
      setPushToken(token);
      await copyPushToken(token);
      setPushMessage('Token copiado. Guárdalo en GitHub como secreto EXPO_PUSH_TOKEN.');
    } catch (e) {
      setPushMessage(e instanceof Error ? e.message : 'No fue posible obtener el token.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#ffffff" />}
      >
        <Text style={styles.kicker}>STOCK MONITOR</Text>
        <Text style={styles.title}>Zelda Switch 2</Text>
        <Text style={styles.subtitle}>40th Anniversary Edition</Text>

        <View style={styles.hero}>
          <Text style={styles.triforce}>▲</Text>
          <Text style={styles.heroText}>Nintendo Switch 2 · The Legend of Zelda</Text>
          <Text style={styles.release}>Lanzamiento: 29 de octubre de 2026</Text>
          {data && <Text style={styles.lastUpdate}>Última actualización: {formatTime(data.generatedAt)}</Text>}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>No se pudo cargar el monitor</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.primaryButton} onPress={refresh}>
              <Text style={styles.primaryButtonText}>REINTENTAR</Text>
            </Pressable>
          </View>
        ) : !data ? (
          <ActivityIndicator size="large" />
        ) : (
          <>
            <Text style={styles.section}>Estados Unidos</Text>
            {grouped.usa.map((store) => <StoreCard key={store.id} store={store} />)}

            <Text style={styles.section}>Colombia</Text>
            {grouped.colombia.length ? grouped.colombia.map((store) => <StoreCard key={store.id} store={store} />) : (
              <Text style={styles.empty}>Las tiendas colombianas aparecerán después de la primera ejecución completa del monitor.</Text>
            )}
          </>
        )}

        <View style={styles.pushBox}>
          <Text style={styles.pushTitle}>Notificaciones de la app</Text>
          <Text style={styles.pushText}>Genera el token del dispositivo y cópialo automáticamente. Luego agrégalo a GitHub como secreto EXPO_PUSH_TOKEN.</Text>
          <Pressable style={styles.secondaryButton} onPress={configurePush}>
            <Text style={styles.secondaryButtonText}>GENERAR TOKEN PUSH</Text>
          </Pressable>
          {!!pushToken && <Text selectable style={styles.token}>{pushToken}</Text>}
          {!!pushMessage && <Text style={styles.pushMessage}>{pushMessage}</Text>}
        </View>

        <Text style={styles.footer}>Desliza hacia abajo para actualizar. Las alertas solo se disparan con disponibilidad confirmada.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0a0f0b' },
  content: { padding: 20, paddingBottom: 48 },
  kicker: { color: '#d8b64c', fontWeight: '800', letterSpacing: 3, fontSize: 12, marginTop: 10 },
  title: { color: '#ffffff', fontSize: 36, fontWeight: '900', marginTop: 6 },
  subtitle: { color: '#b7c2b9', fontSize: 18, marginBottom: 16 },
  hero: { backgroundColor: '#111a13', borderWidth: 1, borderColor: '#314435', borderRadius: 22, padding: 20, marginBottom: 20 },
  triforce: { color: '#d8b64c', fontSize: 56, textAlign: 'center', lineHeight: 62 },
  heroText: { color: '#ffffff', textAlign: 'center', fontWeight: '700', fontSize: 16 },
  release: { color: '#d8b64c', textAlign: 'center', marginTop: 8 },
  lastUpdate: { color: '#7f9383', textAlign: 'center', marginTop: 6, fontSize: 12 },
  section: { color: '#ffffff', fontSize: 22, fontWeight: '800', marginTop: 16, marginBottom: 10 },
  card: { backgroundColor: '#111512', borderWidth: 1, borderColor: '#252d27', borderRadius: 18, padding: 16, marginBottom: 12 },
  cardBuyable: { borderColor: '#46d369', borderWidth: 2 },
  cardTopRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  storeName: { color: '#ffffff', fontSize: 17, fontWeight: '800' },
  status: { fontSize: 14, fontWeight: '700', marginTop: 5 },
  price: { color: '#ffffff', fontWeight: '800', fontSize: 16, textAlign: 'right' },
  reason: { color: '#aeb7b0', marginTop: 10, lineHeight: 19 },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14 },
  checked: { flex: 1, color: '#6f7e72', fontSize: 11 },
  openButton: { backgroundColor: '#d8b64c', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 10 },
  openButtonText: { color: '#111111', fontWeight: '900', fontSize: 11 },
  errorBox: { backgroundColor: '#241414', borderColor: '#6b2f2f', borderWidth: 1, borderRadius: 18, padding: 18 },
  errorTitle: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  errorText: { color: '#ffb5b5', marginVertical: 10 },
  primaryButton: { backgroundColor: '#d8b64c', borderRadius: 12, padding: 12, alignItems: 'center' },
  primaryButtonText: { fontWeight: '900', color: '#111111' },
  empty: { color: '#8d9990', marginBottom: 12 },
  pushBox: { backgroundColor: '#10151d', borderWidth: 1, borderColor: '#27364b', borderRadius: 18, padding: 16, marginTop: 26 },
  pushTitle: { color: '#ffffff', fontWeight: '800', fontSize: 18 },
  pushText: { color: '#aab4c2', lineHeight: 19, marginTop: 7, marginBottom: 12 },
  secondaryButton: { borderColor: '#d8b64c', borderWidth: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  secondaryButtonText: { color: '#d8b64c', fontWeight: '900' },
  token: { color: '#d8dfe8', backgroundColor: '#080b10', borderRadius: 8, padding: 10, marginTop: 12, fontSize: 10 },
  pushMessage: { color: '#b7c2b9', marginTop: 10, fontSize: 12 },
  footer: { color: '#667169', textAlign: 'center', marginTop: 26, fontSize: 12, lineHeight: 18 },
});
