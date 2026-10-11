# Workflows

## CI (`pipeline.yml`)

Pipeline único para PR y pushes a `develop/main`.

Orden estricto:

1. `lint`
2. `typecheck`
3. `test`
4. `build`

Generación de tipos OpenAPI (`make sync-types`) es local: requiere el backend corriendo en `OPENAPI_URL` (default `http://localhost:3000/api-json`). El archivo regenerado (`src/generated/api-types.ts`) se commitea.

## Release (`release.yml` + `build-apk.yml`)

Al mergear a `main`:

1. `semantic-release` calcula la próxima versión a partir de los Conventional
   Commits (`fix` → patch, `feat` → minor, `BREAKING CHANGE` → major). Si no
   hay nada que liberar (sólo `chore`, `docs`, etc.), termina ahí.
2. Crea el tag `vX.Y.Z` y el GitHub Release con las notas. No commitea a
   `main`: la versión vive sólo en el tag.
3. `build-apk.yml` compila el APK de release firmado y lo adjunta al Release
   como `parkit-X.Y.Z.apk`.

`build-apk.yml` también corre:

- En los PR que tocan el pipeline (`.github/workflows/build-apk.yml`,
  `release.yml`, `plugins/**`, `app.config.js`, `app.json`): deja el APK como
  artefacto de la corrida, para probar cambios de build antes de mergear.
- A mano (`workflow_dispatch`) sobre cualquier rama, también como artefacto.

Desde la pestaña Actions, `Release` se puede correr con `dry_run` para ver qué
versión saldría sin crear nada.

### Configuración del repo (Settings → Secrets and variables → Actions)

Variables (públicas: van embebidas en el bundle):

| Nombre                                    | Valor                         |
| ----------------------------------------- | ----------------------------- |
| `EXPO_PUBLIC_API_URL`                     | URL del backend de producción |
| `EXPO_PUBLIC_SUPABASE_URL`                | URL del proyecto Supabase     |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`           | Publishable / anon key        |
| `EXPO_PUBLIC_SUPABASE_OAUTH_REDIRECT_URL` | `parkit://auth/callback`      |

Secretos:

| Nombre                        | Valor                                     |
| ----------------------------- | ----------------------------------------- |
| `GOOGLE_MAPS_ANDROID_API_KEY` | Key de Maps SDK for Android               |
| `ANDROID_KEYSTORE_BASE64`     | El keystore de release (PKCS12) en base64 |
| `ANDROID_KEYSTORE_PASSWORD`   | Contraseña del keystore                   |
| `ANDROID_KEY_ALIAS`           | Alias de la clave dentro del keystore     |

### Firma

`android/` no se versiona, así que la firma de release la configura el plugin
`plugins/withReleaseSigning.js` durante `expo prebuild`, leyendo el keystore del
entorno. Sin keystore (por ejemplo `make apk` en una máquina cualquiera) el
release se firma con la clave debug, como antes.

**El keystore no se puede regenerar.** Android sólo instala una actualización
encima de la app si está firmada con la misma clave: si se pierde, los usuarios
tienen que desinstalar y volver a instalar, y en Google Play directamente no se
puede volver a publicar la misma app. Guardar una copia fuera de GitHub (los
secretos no se pueden volver a leer).

La primera vez que alguien instale un APK de este pipeline tiene que
desinstalar antes el que haya instalado con `make apk`, porque ese está firmado
con la clave debug.
