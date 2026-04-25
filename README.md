# Norish Tools

Norish Tools is a Docker-hostable Node.js service for running utility workflows against the Norish API.

The initial scaffold focuses on the service boundary rather than specific business features:

- Fastify HTTP service with health and capability endpoints
- Bootstrap 5 frontend with a homepage and per-tool pages
- single-token login flow for the frontend
- dedicated persisted calendar feed token with regeneration support
- live Grocy import workflow and recipe delete tool
- live Grocy import workflow, recipe delete tool, and AI recipe creation tool
- validated environment configuration
- reusable Norish API client
- modular route and service layout for future tools
- Dockerfile and Compose configuration for container hosting

## Requirements

- Node.js 22+
- npm 10+

## Environment

Copy `.env.example` to `.env` and set the required values.

The calendar feed token is not stored in `.env`. It is generated automatically on first run and persisted to `.data/calendar-feed-token`. In Docker Compose, `./.data` is mounted into the container so the token survives container recreation.

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | Runtime mode used for cookie security and process behavior |
| `PORT` | No | `3000` | HTTP port for this service |
| `HOST` | No | `0.0.0.0` | HTTP bind host |
| `LOG_LEVEL` | No | `info` | Fastify logger level |
| `APP_ACCESS_TOKEN` | Yes | - | Shared token used to sign in to the frontend |
| `NORISH_BASE_URL` | Yes | - | Base Norish host, such as `https://norish.samshouse.uk` |
| `NORISH_API_PREFIX` | No | `/api/v1` | API path prefix |
| `NORISH_API_KEY` | Yes | - | API key sent as `x-api-key` |
| `OPENAI_API_KEY` | No | - | OpenAI API key used to generate full recipe text when a Grocy recipe only has a title |
| `OPENAI_BASE_URL` | No | `https://api.openai.com/v1/` | Override for OpenAI-compatible API hosts |
| `OPENAI_MODEL` | No | `gpt-4.1-mini` | Model used to expand title-only Grocy recipes into full recipe text |

## Local Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm start
```

## Docker

```bash
docker compose up --build
```

## Current Endpoints

- `GET /login` serves the frontend login page
- `POST /login` validates the shared token and starts a signed session
- `POST /logout` clears the frontend session
- `GET /health` returns local service health
- `GET /health/ready` verifies the Norish API health endpoint is reachable
- `GET /norish/status` returns upstream Norish health details
- `GET /` serves the authenticated frontend homepage
- `GET /tools` lists placeholder tool modules as JSON
- `POST /calendar/token/regenerate` rotates the dedicated calendar feed token for authenticated users
- `GET /calendar/planned-recipes/month.ics` returns a monthly ICS feed from Norish planned recipes
- `GET /app/tools/:slug` serves an authenticated frontend page per tool
- `POST /tools/create-recipe/generate` generates a full recipe from a dish title for review
- `POST /tools/create-recipe/import` imports reviewed recipe text into Norish
- `POST /tools/grocy-import/connect` validates the Grocy connection and lists importable recipes
- `POST /tools/grocy-import/import` imports a Grocy recipe into Norish, generating recipe text with OpenAI when Grocy only provides a title
- `POST /tools/delete-recipe/search` searches the Norish recipe catalog for the delete tool
- `POST /tools/delete-recipe/delete` deletes a Norish recipe by id for the delete tool

## Project Layout

```text
src/
  config/     Environment parsing and shared config
  routes/     HTTP route modules
  services/   Norish API integration and future tool services
  types/      Type augmentation and shared types
```
