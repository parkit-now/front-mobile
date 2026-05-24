# AGENT GUIDE (IA) — front-mobile

## Mision

Construir features mobile en Expo manteniendo contratos API sincronizados y compatibilidad en dispositivo real.

## Stack y limites

- Expo + React Native + TypeScript.
- Cliente Auth/API: Supabase JS.
- Tipos HTTP: `src/generated/api-types.ts` (OpenAPI).
- Este repo NO maneja migraciones, schema ni seeds.

## Reglas obligatorias

1. No editar `src/generated/api-types.ts` manualmente.
2. No crear tipos de request/response manuales si vienen de OpenAPI.
3. Mantener `App.tsx` como bootstrap simple; features en `src/features/<feature>/`.
4. Evitar APIs web-only (`window`, `document`) en codigo shared de RN.
5. Si cambia contrato backend, correr `make sync-types` antes de codear.

## Politica de contratos API

- Fuente por defecto: `OPENAPI_URL=http://localhost:3000/api-json`.
- Generar: `make sync-types` (requiere backend corriendo). Commitear `src/generated/api-types.ts`.
- Tipos manuales permitidos solo para estado/form/view-model interno.

## Dispositivo fisico por USB (Android)

```bash
adb devices
make dev
```

Si no conecta bien por LAN, usar:

```bash
bun run dev -- --localhost
adb reverse tcp:8081 tcp:8081
adb reverse tcp:19000 tcp:19000
```

Fallback:

```bash
bun run dev -- --tunnel
```

## Donde escribir codigo

- Pantallas/UI: `src/features/<feature>/components`.
- Estado/hooks: `src/features/<feature>/hooks`.
- API/services: `src/features/<feature>/services`.
- Supabase base: `src/lib/supabase/`.
- Tests: `src/test/` o colocalizados.

## Flujo de trabajo recomendado

```bash
cp .env.example .env
make install
make env-check
make sync-types
make dev
```

## Checklist antes de PR

```bash
make lint
make typecheck
make test
make build
```

## Anti-patrones

- No hardcodear URLs de API dentro de componentes.
- No usar `any` en respuestas de backend.
- No acoplar logica de auth/navigation dentro de componentes presentacionales.

## Manejo de errores y traduccion

Todo error que vea el usuario pasa por `src/lib/api/translate.ts`.
NUNCA mostrar `error.message` crudo: viene en ingles del backend.

### Precedencia del lookup

1. `problem.code` (estable, lo emite el backend; catalogo en
   `backend/src/utils/exceptions/error-codes.ts`).
2. `(endpoint, status)` — fallback cuando el backend no envia code.
3. `status` HTTP — fallback generico.
4. Mensaje generico "Ocurrió un error inesperado.".

### Uso desde una feature

```tsx
import { useToast } from '../../lib/notifications/ToastProvider';
import { translateApiError } from '../../lib/api/translate';

const { showToast } = useToast();

try {
  await callApi();
} catch (error) {
  showToast({
    message: translateApiError(error, { endpoint: 'auth.login' }),
    kind: 'error',
  });
}
```

En mobile el toast se renderiza como banner arriba del status bar
(iOS HIG / Android-friendly), con auto-dismiss a los 4s y tap para cerrar.

### Inline field errors (debajo del input)

- El backend devuelve `ValidationFieldErrorDto[]` con `code` = nombre del
  constraint de class-validator (`isEmail`, `minLength`, etc.).
- Usar `translateValidationCode(field, code)` para el texto en español. Permite
  override por `(field, code)` para mensajes mas naturales (ej.
  `password:minLength` -> "La contraseña debe tener al menos 8 caracteres").
- Validacion local antes de submit en `src/features/<feature>/validation.ts`.

### Agregar un caso nuevo

1. Coordinar con backend para que emita el code apropiado del catalogo (o
   agregue uno nuevo si no existe en `error-codes.ts`).
2. `make sync-types` para refrescar `src/generated/api-types.ts`.
3. Agregar la entrada a `CODE_MESSAGES` en `src/lib/api/translate.ts` (sincronizar
   con `front-web` y `front-desktop`).

### Anti-patrones

- No hacer string matching de `error.message` ni de `problem.detail`.
- No mostrar texto del backend tal cual (esta en ingles).
- No duplicar mapeos por status en cada feature: que vivan en `translate.ts`.
- No olvidar el toast envolvente: validar cliente-side primero, luego confiar
  en el `code` del backend para inline.

## Estilo compartido (obligatorio)

- Seguir [SHARED_STYLE_GUIDE.md](./SHARED_STYLE_GUIDE.md) para colores, formas, espaciados y jerarquia visual.
- En pantallas de login: usar botones OAuth con icono de proveedor y sin texto tecnico de debug.
- No introducir variantes visuales fuera de la guia sin actualizar el documento en los 3 repos.
