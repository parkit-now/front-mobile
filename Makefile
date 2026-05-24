SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help

CYAN  := \033[36m
RESET := \033[0m

ENV_LOCAL := .env.local
ENV_PROD  := .env.production

.PHONY: help install dev prod build lint typecheck test format \
        env-check env-use-local env-use-prod \
        sync-types clean _detect-android-sdk

# Bash snippet shared by install/dev: resuelve ANDROID_HOME en $$android_home
# (respeta el del entorno; si está vacío, prueba rutas comunes con platform-tools/adb).
DETECT_ANDROID_SDK := android_home="$${ANDROID_HOME:-}"; \
	if [ -z "$$android_home" ]; then \
		for candidate in /usr/lib/android-sdk "$$HOME/Android/Sdk" "$$HOME/Android/sdk" /opt/android-sdk; do \
			if [ -x "$$candidate/platform-tools/adb" ]; then \
				android_home="$$candidate"; \
				break; \
			fi; \
		done; \
	fi

help: ## Mostrar comandos disponibles
	@awk 'BEGIN {FS = ":.*?## "} \
	     /^[a-zA-Z_-]+:.*?## / {printf "  $(CYAN)%-16s$(RESET) %s\\n", $$1, $$2}' $(MAKEFILE_LIST)

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

dev: env-use-local ## Levantar app apuntando al backend LOCAL (autodetecta ANDROID_HOME)
	@$(DETECT_ANDROID_SDK); \
	if [ -z "$$android_home" ]; then \
		echo "⚠ No se encontró el Android SDK; instalá adb (sudo apt install adb) o seteá ANDROID_HOME"; \
		bun run dev; \
	else \
		if [ -z "$${ANDROID_HOME:-}" ]; then echo "→ ANDROID_HOME=$$android_home (autodetectado)"; fi; \
		ANDROID_HOME="$$android_home" bun run dev; \
	fi

prod: env-use-prod ## Levantar Expo en modo prod (--no-dev --minify) con link/QR
	@$(DETECT_ANDROID_SDK); \
	if [ -z "$$android_home" ]; then \
		bunx expo start --no-dev --minify; \
	else \
		if [ -z "$${ANDROID_HOME:-}" ]; then echo "→ ANDROID_HOME=$$android_home (autodetectado)"; fi; \
		ANDROID_HOME="$$android_home" bunx expo start --no-dev --minify; \
	fi

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
	fi
	@echo "✓ .env validado"

sync-types: ## Generar tipos TypeScript desde OpenAPI
	@bun run sync-types

clean: ## Limpiar artefactos locales
	@rm -rf dist dist-electron coverage .expo .vite
	@echo "✓ Limpieza completa"
