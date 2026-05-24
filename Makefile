# ==========================
# Skillora Makefile
# ==========================

SHELL := /bin/bash
BACKEND := backend
FRONTEND := frontend


# Run containers
up: ## Start containers (build if needed)
	docker compose up --build -d

down: ## Stop containers
	docker compose down

rebuild: ## Full rebuild (no cache)
	docker compose down
	docker compose build --no-cache
	docker compose up -d

reset: ## Full reset (remove volumes, rebuild)
	docker compose down -v
	docker compose up -d --build

# Shells
exec: ## Open bash inside backend
	docker compose exec backend bash

psql: ## Open PostgreSQL shell
	docker compose exec db psql -U user -d skillora

logs: ## Tail backend logs
	docker compose logs -f backend

# Migrations
migrate-create: ## Create a new migration (usage: make migrate-create name="desc")
	docker compose exec backend alembic revision --autogenerate -m "$(name)"

migrate-up: ## Apply all migrations
	docker compose exec backend alembic upgrade head

migrate-down: ## Revert last migration
	docker compose exec backend alembic downgrade -1

migrate-status: ## Show current migration
	docker compose exec backend alembic current

# Helper
help: ## Show available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'


# Tests 
test: ## Run backend+frontend tests
	$(MAKE) test-backend
	$(MAKE) test-frontend

test-backend: ## Pytest unit suite (no DB required)
	cd $(BACKEND) && pytest -m "not integration" -vv --disable-warnings -ra

test-unit: ## Pytest unit suite (requires @pytest.mark.unit)
	cd $(BACKEND) && pytest -m unit tests/unit -vv -ra

test-integration: ## Pytest integration suite (requires @pytest.mark.integration)
	cd $(BACKEND) && pytest -m integration tests/integration -vv -ra

fix-perms-frontend: ## Fix ownership for node_modules & caches (host)
	sudo chown -R $$USER:$$USER $(FRONTEND)/node_modules $(FRONTEND)/.vite* $(FRONTEND)/.vitest* $(FRONTEND)/coverage 2>/dev/null || true

test-frontend: ## Vitest (non-watch)
	cd $(FRONTEND) && npm run test -- --run

typecheck-frontend: ## TypeScript typecheck
	cd $(FRONTEND) && npm run typecheck

lint-frontend: ## ESLint
	cd $(FRONTEND) && npm run lint

lint-backend: ## Ruff + Black check
	docker compose exec -u root backend sh -lc "ruff check . --no-cache --fix && black --check ."

fmt-backend: ## Autoformat with Black + Ruff
	docker compose exec -u root backend sh -lc "ruff check . --fix --no-cache && black ."

build-frontend: ## Vite build
	cd $(FRONTEND) && npm run build

ci-local: ## Local CI (what Actions will do)
	$(MAKE) fmt-backend
	$(MAKE) lint-backend
	$(MAKE) test-backend
	$(MAKE) lint-frontend
	$(MAKE) fix-perms-frontend
	$(MAKE) typecheck-frontend
	$(MAKE) test-frontend
	$(MAKE) build-frontend
