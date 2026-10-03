SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help

CYAN  := \033[36m
RESET := \033[0m

ENV_LOCAL := .env.local
ENV_PROD  := .env.production

.PHONY: help install dev dev-local-usb dev-prod prod build lint typecheck test format \
        env-check env-use-local env-use-prod \
        sync-types clean _detect-android-sdk

# Expo carga `.env.local` CON PRIORIDAD sobre `.env`, así que copiar
# `.env.production` a `.env` no alcanza para apuntar a producción: los valores
# locales ganan. Las variables ya exportadas en el proceso sí les ganan a todos
# los archivos `.env*`, así que cada target que levanta Expo exporta primero el
# archivo de su entorno. `--clear` evita que Metro reuse un bundle armado con
# las URLs del otro entorno.
LOAD_ENV_LOCAL := set -a; . ./$(ENV_LOCAL); set +a;
LOAD_ENV_PROD  := set -a; . ./$(ENV_PROD); set +a;

# Bash snippet shared by install/dev: resuelve ANDROID_HOME en $$android_home
# (respeta el del entorno; si está vacío, prueba rutas comunes con platform-tools/adb).
DETECT_ANDROID_SDK := android_home="$${ANDROID_HOME:-}"; \
	if [ -z "$$android_home" ]; then \
		for candidate in /usr/lib/android-sdk "$$HOME/Android/Sdk" "$$HOME/Android/sdk" "$$HOME/Library/Android/sdk" /opt/android-sdk; do \
			if [ -x "$$candidate/platform-tools/adb" ]; then \
				android_home="$$candidate"; \
				break; \
			fi; \
		done; \
	fi

help: ## Mostrar comandos disponibles
	@printf "\n$(CYAN)Parkit mobile$(RESET)\n\n"
	@printf "Uso:\n  make <comando>\n"
	@awk 'BEGIN {FS = ":.*?## "} \
	     /^##@ / {printf "\n$(CYAN)%s$(RESET)\n", substr($$0, 5); next} \
	     /^[a-zA-Z_-]+:.*?## / {printf "  $(CYAN)%-16s$(RESET) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@printf "\n"

##@ Setup
install: ## Instalar dependencias, activar pre-commit y chequear Android SDK
	@command -v bun >/dev/null 2>&1 || { echo "✗ Falta bun"; exit 1; }
	@bun install
	@git config core.hooksPath .githooks
	@$(DETECT_ANDROID_SDK); \
	if [ -n "$$android_home" ]; then \
		echo "✓ Android SDK detectado en $$android_home (se autoinyecta en 'make dev')"; \
	else \
		echo "⚠ Android SDK no encontrado. Para correr en celular físico instalá adb (sudo apt install adb) o seteá ANDROID_HOME."; \
	fi
	@echo "✓ Dependencias instaladas + hook activado"

##@ Entorno
env-use-local: ## Activar entorno local (copia .env.local → .env)
	@if [ ! -f $(ENV_LOCAL) ]; then \
		echo "✗ Falta $(ENV_LOCAL). Copialo desde .env.example y completá los valores locales."; \
		exit 1; \
	fi
	@cp $(ENV_LOCAL) .env
	@echo "✓ .env apunta a entorno LOCAL ($(ENV_LOCAL))"

env-use-prod: ## Activar entorno produccion (copia .env.production → .env)
	@if [ ! -f $(ENV_PROD) ]; then \
		echo "✗ Falta $(ENV_PROD). Copialo desde .env.example y completá los valores de prod."; \
		exit 1; \
	fi
	@cp $(ENV_PROD) .env
	@echo "✓ .env apunta a entorno PRODUCCION ($(ENV_PROD))"

##@ Desarrollo
dev: install env-use-local ## Levantar app apuntando al backend LOCAL (autodetecta ANDROID_HOME)
	@$(LOAD_ENV_LOCAL) $(DETECT_ANDROID_SDK); \
	if [ -z "$$android_home" ]; then \
		echo "⚠ No se encontró el Android SDK; instalá adb (sudo apt install adb) o seteá ANDROID_HOME"; \
		bun run dev -- --clear; \
	else \
		if [ -z "$${ANDROID_HOME:-}" ]; then echo "→ ANDROID_HOME=$$android_home (autodetectado)"; fi; \
		ANDROID_HOME="$$android_home" bun run dev -- --clear; \
	fi

dev-local-usb: install env-use-local ## Dev USB local: adb reverse + Expo --localhost
	@$(LOAD_ENV_LOCAL) $(DETECT_ANDROID_SDK); \
	if [ -z "$$android_home" ]; then \
		echo "⚠ No se encontró el Android SDK; instalá adb (sudo apt install adb) o seteá ANDROID_HOME"; \
		bun run dev -- --localhost --clear; \
	else \
		if [ -z "$${ANDROID_HOME:-}" ]; then echo "→ ANDROID_HOME=$$android_home (autodetectado)"; fi; \
		adb_bin="$$android_home/platform-tools/adb"; \
		if "$$adb_bin" get-state >/dev/null 2>&1; then \
			for port in 3000 54321 8081 19000 19001 19002; do \
				"$$adb_bin" reverse tcp:$$port tcp:$$port >/dev/null 2>&1 || true; \
			done; \
			echo "✓ adb reverse activo: backend 3000, Supabase 54321 y Expo/Metro"; \
		else \
			echo "⚠ No hay un dispositivo Android USB autorizado. Activá depuración USB y aceptá el permiso."; \
		fi; \
		ANDROID_HOME="$$android_home" bun run dev -- --localhost --clear; \
	fi

dev-prod: install env-use-prod ## Dev contra PRODUCCIÓN (datos reales): Expo --localhost + adb reverse de Metro
	@$(LOAD_ENV_PROD) $(DETECT_ANDROID_SDK); \
	echo "⚠ Apuntando a PRODUCCIÓN: $${EXPO_PUBLIC_API_URL}. Lo que hagas son datos reales."; \
	if [ -z "$$android_home" ]; then \
		bun run dev -- --localhost --clear; \
	else \
		adb_bin="$$android_home/platform-tools/adb"; \
		if "$$adb_bin" get-state >/dev/null 2>&1; then \
			"$$adb_bin" reverse tcp:8081 tcp:8081 >/dev/null 2>&1 || true; \
		fi; \
		ANDROID_HOME="$$android_home" bun run dev -- --localhost --clear; \
	fi

prod: env-use-prod ## Levantar Expo en modo prod (--no-dev --minify) con link/QR
	@$(LOAD_ENV_PROD) $(DETECT_ANDROID_SDK); \
	if [ -z "$$android_home" ]; then \
		bunx expo start --no-dev --minify --clear; \
	else \
		if [ -z "$${ANDROID_HOME:-}" ]; then echo "→ ANDROID_HOME=$$android_home (autodetectado)"; fi; \
		ANDROID_HOME="$$android_home" bunx expo start --no-dev --minify --clear; \
	fi

##@ Calidad
build: ## Build con el .env actual (sin tocar el entorno activo)
	@bun run build

lint: ## Ejecutar ESLint
	@bun run lint

typecheck: ## Ejecutar TypeScript sin emitir
	@bun run typecheck

test: ## Ejecutar tests
	@bun run test

format: ## Formatear archivos
	@bun run format

##@ Validación
env-check: ## Validar variables mínimas del .env activo
	@if [ ! -f .env ]; then \
		echo "✗ Falta .env activo. Corré: make env-use-local  ó  make env-use-prod"; exit 1; fi
	@set -a; . ./.env; set +a; \
	if [ -z "$${VITE_SUPABASE_URL:-}" ] && [ -z "$${EXPO_PUBLIC_SUPABASE_URL:-}" ]; then \
		echo "✗ Falta URL de Supabase: VITE_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_URL"; exit 1; \
	fi; \
	if [ -z "$${VITE_SUPABASE_ANON_KEY:-}" ] && [ -z "$${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}" ]; then \
		echo "✗ Falta ANON key: VITE_SUPABASE_ANON_KEY o EXPO_PUBLIC_SUPABASE_ANON_KEY"; exit 1; \
	fi; \
	if [ -z "$${VITE_API_URL:-}" ] && [ -z "$${EXPO_PUBLIC_API_URL:-}" ]; then \
		echo "✗ Falta URL del backend: VITE_API_URL o EXPO_PUBLIC_API_URL"; exit 1; \
	fi; \
	if [ -z "$${OPENAPI_URL:-}" ]; then \
		echo "⚠ OPENAPI_URL no seteada. Se usará http://localhost:3000/api-json"; \
	fi; \
	if [ -z "$${GOOGLE_MAPS_ANDROID_API_KEY:-}" ]; then \
		echo "⚠ GOOGLE_MAPS_ANDROID_API_KEY no seteada. Es obligatoria para builds Android fuera de Expo Go"; \
	fi; \
	if [ -z "$${GOOGLE_MAPS_IOS_API_KEY:-}" ]; then \
		echo "⚠ GOOGLE_MAPS_IOS_API_KEY no seteada. Es obligatoria para builds iOS con Google Maps"; \
	fi
	@echo "✓ .env validado"

##@ API y mantenimiento
sync-types: ## Generar tipos TypeScript desde OpenAPI
	@bun run sync-types

clean: ## Limpiar artefactos locales
	@rm -rf dist dist-electron coverage .expo .vite
	@echo "✓ Limpieza completa"
