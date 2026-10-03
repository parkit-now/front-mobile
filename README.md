# front-mobile

Frontend mobile de Parkit (Expo + React Native).

## Google Maps

El mapa usa Google Maps en Android e iOS. Para validar tiles y credenciales de
forma representativa se debe usar un development build o build nativo con una
clave restringida por plataforma; la credencial incluida en Expo Go puede no
estar autorizada para todas sus versiones:

```bash
GOOGLE_MAPS_ANDROID_API_KEY="..."
GOOGLE_MAPS_IOS_API_KEY="..."
```

- Android: restringir por package `com.parkit.mobile` y certificado SHA-1.
- iOS: restringir por bundle identifier `com.parkit.mobile`.
- Restringir cada clave exclusivamente al Maps SDK de su plataforma.
- No versionar claves en `app.json` ni en el repositorio.

## Stack

- Expo SDK 52
- React Native
- Bun
- ESLint + Prettier
- Supabase JS
- Tipos de API generados desde OpenAPI

## Primera ejecución

```bash
cp .env.example .env
make install
make env-check
make sync-types
make dev
```

Nota: `make sync-types` requiere backend corriendo y `OPENAPI_URL` accesible (default `http://localhost:3000/api-json`).

## Estructura de carpetas

- `App.tsx`: entrypoint Expo.
- `src/lib/supabase/`: cliente y sesión.
- `src/generated/api-types.ts`: tipos API autogenerados.
- `src/test/`: tests unitarios.

## Contratos API automáticos ("DTOs" en front)

En este repo no usamos DTOs de Nest; usamos tipos OpenAPI generados.

```bash
make sync-types
```

Regla: no editar `src/generated/api-types.ts` a mano.

Si el backend usa otro puerto:

```bash
OPENAPI_URL=http://localhost:3001/api-json make sync-types
```

## Flujo para una feature nueva

1. Crear `src/features/<feature>/`.
2. Separar UI/hooks/services.
3. Tipar requests/responses con `src/generated/api-types.ts`.

## Expo con celular físico por cable (Android)

### Pre-requisitos en la PC

1. Tener `adb` instalado. En Ubuntu/Debian alcanza con:

   ```bash
   sudo apt install adb
   ```

   Eso deja el SDK en `/usr/lib/android-sdk`. `make install` y `make dev` autodetectan esa ruta (también `~/Android/Sdk`, `~/Android/sdk`, `~/Library/Android/sdk` en macOS y `/opt/android-sdk`) y exportan `ANDROID_HOME` para la sesión de Expo — no hace falta tocar tu shell. Si querés persistirlo igual:

   ```bash
   echo 'export ANDROID_HOME=/usr/lib/android-sdk' >> ~/.bashrc
   echo 'export PATH="$PATH:$ANDROID_HOME/platform-tools"' >> ~/.bashrc
   ```

2. `make install` te avisa con `Android SDK detectado en …` si la autodetección funcionó. Si dice `Android SDK no encontrado`, instalá `adb` o seteá `ANDROID_HOME` manualmente.

### Pre-requisitos en el celular (una sola vez)

1. **Settings → About phone → Software information** → tocar **Build number** 7 veces para habilitar **Developer options**.
2. **Settings → Developer options** → activar el switch principal (arriba) y después activar **USB debugging**. Va a aparecer un diálogo de advertencia → **OK**.
3. Conectar el cable USB. En el celular elegí cualquier modo USB que **no sea "Solo cargar"** (File transfer/MTP o PTP sirven).
4. En la pantalla del **celular** va a aparecer un popup **"Allow USB debugging from this computer?"** con una huella RSA → marcá **Always allow from this computer** → **Allow**.

   > Nota: ese popup aparece en el celular, no en la PC. Si te aparece en la PC un error de GVFS tipo `El objeto no existe en la ruta /org/gtk/vfs/mount/1`, ignoralo — es Nautilus intentando montar MTP, no tiene relación con adb.

### Verificación

```bash
adb devices
```

Debe listar tu serial con estado `device`. Si dice `unauthorized`, te perdiste el popup del paso 4; desenchufá, volvé a enchufar y mirá la pantalla del celular.

### Levantar la app

```bash
make dev
```

Vas a ver `→ ANDROID_HOME=… (autodetectado)` seguido del banner de Expo. Apretá **`a`** en la terminal y Expo va a instalar/abrir la app en el celular.

### Entornos: local o producción

| Comando              | Apunta a                             | Para qué                                                                       |
| -------------------- | ------------------------------------ | ------------------------------------------------------------------------------ |
| `make dev-local-usb` | backend y Supabase **locales**       | Desarrollo diario con emulador o celular por USB (configura los `adb reverse`) |
| `make dev`           | backend y Supabase **locales**       | Igual, sin `--localhost` (red LAN)                                             |
| `make dev-prod`      | backend y Supabase de **producción** | Probar contra datos reales, en modo desarrollo                                 |
| `make prod`          | **producción**                       | Bundle minificado, como lo ve el usuario                                       |

Usá estos comandos y no `bun run dev` directo: Expo carga `.env.local` con prioridad sobre `.env`, así que copiar `.env.production` a `.env` no alcanza. Cada target exporta primero las variables de su archivo (las del proceso les ganan a todos los `.env*`) y limpia la caché de Metro (`--clear`), para que no quede un bundle con las URLs del otro entorno. Al cambiar de entorno se cierra la sesión: son dos Supabase distintos.

### Troubleshooting

- Si el cliente Expo no encuentra el bundler, levantá en localhost con port forwarding:

  ```bash
  bun run dev -- --localhost
  adb reverse tcp:8081 tcp:8081
  adb reverse tcp:19000 tcp:19000
  ```

- Si `localhost` falla, probar `bun run dev -- --tunnel`.
- Si usás backend local desde el teléfono sin reverse, usar la IP LAN de tu PC.

## Checklist antes de PR

```bash
make lint
make typecheck
make test
make build
```

## Comandos diarios

```bash
make help
make dev
make sync-types
make lint
make typecheck
make test
make build
```

## Git/PR

- PR siempre a `main`.
- `develop` se usa para validación integrada.
- Conventional Commits.

Ver [CONTRIBUTING.md](./CONTRIBUTING.md).
