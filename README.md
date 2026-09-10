# Zelda Stock Watch

Aplicación móvil + monitor en la nube para detectar disponibilidad real de:

**Nintendo Switch 2 – The Legend of Zelda – 40th Anniversary Edition**

Países objetivo: **Estados Unidos y Colombia**.

## Qué incluye

- App móvil React Native / Expo SDK 57 para Android y iPhone.
- Monitor Node.js ejecutable en GitHub Actions.
- Revisión automática cada 10 minutos.
- Validación conservadora para evitar falsos positivos: los estados negativos ganan sobre botones genéricos de compra.
- Detección de páginas bloqueadas / Cloudflare; una página bloqueada nunca genera alerta.
- Notificaciones opcionales por **Expo Push** y/o **Telegram**.
- Estado público servido desde una rama `status` del repositorio, sin acumular miles de commits.

## Tiendas preconfiguradas

### Estados Unidos
- Nintendo Store
- Best Buy
- GameStop
- Walmart
- Target
- Amazon US

### Colombia
- Alkosto
- Ktronix
- Falabella Colombia
- Panamericana
- Mercado Libre Colombia

Los enlaces exactos ya conocidos para Nintendo, Best Buy, GameStop, Walmart y Target vienen precargados. Para tiendas donde todavía no existe una ficha exacta, el monitor usa la búsqueda interna del comercio y exige coincidencia fuerte del nombre del producto antes de considerar un estado positivo.

## Arquitectura

```text
GitHub Actions (cada 10 min)
        |
        v
monitor/monitor.mjs ----> status branch/status.json
        |                         |
        |                         v
        +---- Expo Push       App móvil
        +---- Telegram            |
                                  +--> abrir tienda
```

## Inicio rápido

1. Crea un repositorio nuevo en GitHub, preferiblemente **público**. No publiques tokens; los secretos se guardan en GitHub Actions.
2. Sube todo el contenido de esta carpeta a la raíz del repositorio.
3. En GitHub ve a **Settings → Actions → General → Workflow permissions** y marca **Read and write permissions**.
4. Abre **Actions** y ejecuta manualmente el workflow **Monitor Zelda stock** con **Run workflow**. Después se ejecutará cada 10 minutos.
5. Tras la primera ejecución aparecerá una rama llamada `status` con `status.json`.
6. En `mobile/.env`, configura:

```env
EXPO_PUBLIC_STATUS_URL=https://raw.githubusercontent.com/TU_USUARIO/TU_REPO/status/status.json
EXPO_PUBLIC_EAS_PROJECT_ID=
```

7. En la carpeta `mobile` ejecuta:

```bash
npm install
npx expo install --fix
npx expo start
```

Para una prueba rápida de la interfaz puedes abrirla con Expo Go después de iniciar sesión. En Expo SDK 57 las notificaciones push remotas en Android requieren un development build; Expo Go sí sirve para revisar la interfaz y los datos.

## Notificaciones Telegram (opcional, muy recomendable como respaldo)

Crea estos secretos en **GitHub → Settings → Secrets and variables → Actions**:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Si no existen, el monitor simplemente omite Telegram.

## Notificaciones Expo Push (opcional)

La app puede obtener un Expo Push Token si defines `EXPO_PUBLIC_EAS_PROJECT_ID`. Una vez aparezca el token en la app, cópialo y crea en GitHub Actions el secreto:

- `EXPO_PUSH_TOKEN`

El monitor enviará la alerta al endpoint oficial de Expo Push solo cuando una tienda cambie de no disponible a `PREORDER` o `AVAILABLE`.

## Estados usados

- `AVAILABLE`: disponible para compra.
- `PREORDER`: preventa / reserva habilitada.
- `COMING_SOON`: ficha publicada pero aún no habilitada.
- `OUT_OF_STOCK`: ficha publicada sin stock.
- `LISTED`: producto encontrado, pero la página no permite confirmar compra.
- `NOT_FOUND`: no se encontró el producto exacto.
- `BLOCKED`: el comercio bloqueó la consulta automatizada.
- `ERROR`: error de red o análisis.

Solo `AVAILABLE` y `PREORDER` generan alertas.

## Regla anti-falsos-positivos

El monitor aplica este orden:

1. Detecta bloqueo / CAPTCHA.
2. Confirma que la página corresponde al producto exacto.
3. Busca estados negativos (`Coming Soon`, `Currently Unavailable`, `Out of Stock`, etc.).
4. Solo después busca señales positivas (`Preorder now`, `Add to cart`, `Buy now`, etc.).

Por eso un botón genérico `ADD TO CART` en una página de GameStop que también diga `Currently Unavailable` **no** se considera disponibilidad.

## Ajustar frecuencia

El archivo `.github/workflows/monitor.yml` usa:

```yaml
- cron: '*/10 * * * *'
```

Puedes cambiar `*/10` por `*/15`, `*/30`, etc. GitHub puede retrasar ejecuciones programadas en momentos de alta carga.

## Importante

Las tiendas pueden cambiar HTML, añadir CAPTCHA o bloquear servidores de nube. El monitor se diseñó para fallar de forma segura: ante duda marca `LISTED`, `BLOCKED` o `ERROR`, en vez de enviar una alerta falsa. Si una tienda cambia su página, ajusta sus reglas en `monitor/stores.mjs`.


## Generar un APK Android

Dentro de `mobile`:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

El perfil `preview` incluido en `eas.json` genera un APK de distribución interna. La primera vez Expo te pedirá asociar el proyecto a tu cuenta y creará el `projectId`; cópialo también a `EXPO_PUBLIC_EAS_PROJECT_ID`.
