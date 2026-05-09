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
- Generar: `make sync-types`.
- Validar drift: `make sync-types-check`.
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
make sync-types-check
```

## Anti-patrones

- No hardcodear URLs de API dentro de componentes.
- No usar `any` en respuestas de backend.
- No acoplar logica de auth/navigation dentro de componentes presentacionales.
