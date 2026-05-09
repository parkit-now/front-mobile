# front-mobile

Frontend mobile de Parkit (Expo + React Native).

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
make sync-types-check
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

1. Activar `USB debugging` en el celular.
2. Conectar por cable y verificar:

```bash
adb devices
```

3. Levantar Expo:

```bash
make dev
```

4. Si hace falta, levantar en localhost y hacer reverse:

```bash
bun run dev -- --localhost
adb reverse tcp:8081 tcp:8081
adb reverse tcp:19000 tcp:19000
```

5. Abrir Expo Go y correr la app.

Notas:

- Si `localhost` falla, probar `bun run dev -- --tunnel`.
- Si usás backend local desde el teléfono sin reverse, usar la IP LAN de tu PC.

## Checklist antes de PR

```bash
make lint
make typecheck
make test
make build
make sync-types-check
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
