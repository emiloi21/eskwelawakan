# Eskwelawakan

Integrated School Management Information System (School MIS) for Philippine private basic education schools.

**Stack:** Laravel 12 API (`backend/`) + React 19 / TypeScript SPA (`frontend/`)

## Quick start

```bash
# Backend
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
php artisan serve

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Default dev URLs: API `http://localhost:8000`, SPA `http://localhost:5173`

## Documentation

| Document | Description |
|----------|-------------|
| [docs/HANDOVER.md](docs/HANDOVER.md) | Full developer handover — architecture, modules, deployment |
| [docs/README.md](docs/README.md) | Documentation index and knowledge-base guides |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues and fixes |

Copy `docs/test-login-creds.example.md` to `docs/test-login-creds.md` locally for seeded test account credentials (not committed to git).

## Project layout

```
eskwelawakan/
├── backend/     Laravel 12 REST API
├── frontend/    React 19 SPA (Vite)
├── docs/        Project documentation
└── db/          Local SQL reference snapshots (gitignored)
```
