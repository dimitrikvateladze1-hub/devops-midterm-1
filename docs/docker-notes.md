# Docker Notes

## 1. Image size: original vs multi-stage

| Image | Base | Disk usage | Content size |
|---|---|---|---|
| `task-api:original` (given Dockerfile) | `node:22` + `COPY . .` + `npm install` | **1.69 GB** | 419 MB |
| `task-api:multistage` (new Dockerfile) | `node:22-alpine`, production deps only | **248 MB** | 62.3 MB |

The new image is about **85% smaller**. The first stage runs `npm ci --omit=dev`, and the final stage copies only `node_modules`, `package.json` and `src/`, so no devDependencies (jest, eslint, supertest), tests, docs, `.git` or local `node_modules` end up in the image.

## 2. Hardening

- **`.dockerignore`** keeps `node_modules`, `.git`, `coverage`, `test`, `docs`, `.env` and other files out of the build context (the context dropped from 41.8 MB to under 1 KB).
- **Non-root user:** the container runs as the built-in `node` user (`docker exec api-test whoami` → `node`).
- **HEALTHCHECK** calls `GET /health` every 10s; `docker ps` showed `Up 12 seconds (healthy)`.
- **`CMD ["node", "src/server.js"]` instead of `npm start`:** with `node` as PID 1 the process receives `SIGTERM` from `docker stop` directly and runs its graceful shutdown handler, while `npm` does not reliably forward signals and adds an extra process.

## 3. APP_VERSION build argument

```bash
docker build -t task-api:multistage --build-arg APP_VERSION=1.0.0 .
docker run -d --name api-test -p 3001:3000 task-api:multistage
curl -s http://localhost:3001/version
# {"version":"1.0.0"}
```

`ARG APP_VERSION` is copied into `ENV APP_VERSION`, which the app reads in `/version`. In Compose it comes from `.env` via `build.args`.

## 4. /health returned 503: cause and fix

With the given `docker-compose.yml`:

```bash
docker compose up --build -d
curl -i http://localhost:3000/health
# HTTP/1.1 503 Service Unavailable
```

**Cause:** `REDIS_URL=redis://localhost:6379`. Inside the `api` container, `localhost` is the api container itself, not Redis, so `store.ping()` fails and `/health` returns 503.

**Fix:** use the Compose service name, `REDIS_URL=redis://redis:6379`. Compose's internal DNS resolves `redis` to the Redis container on the shared network.

Further changes in `docker-compose.yml`:
- Redis `healthcheck` (`redis-cli ping`), and `depends_on: redis: condition: service_healthy`, so the API starts only when Redis is ready
- named volume `redis-data:/data` with `--appendonly yes`, so data survives container removal
- environment variables loaded from `.env` (`env_file`); `.env.example` is committed, `.env` is git-ignored

```text
devops-midterm-1-api-1     Up 5 seconds (healthy)
devops-midterm-1-redis-1   Up 11 seconds (healthy)
$ curl -s http://localhost:3000/health
{"status":"ok"}
```

## 5. Data persistence proof

```bash
$ docker compose up --build -d --wait
$ curl -s -X POST http://localhost:3000/tasks -H 'Content-Type: application/json' -d '{"title":"persist me","priority":"high"}'
{"id":1,"title":"persist me","priority":"high","dueDate":null,"done":false,"completedAt":null,"createdAt":"2026-11-04T18:39:19.636Z"}

$ docker compose down
 ✔ Container devops-midterm-1-api-1   Removed
 ✔ Container devops-midterm-1-redis-1 Removed
 ✔ Network devops-midterm-1_default   Removed

$ docker volume ls | grep redis-data
local     devops-midterm-1_redis-data

$ docker compose up -d --wait
$ curl -s http://localhost:3000/tasks
[{"id":1,"title":"persist me","priority":"high","dueDate":null,"done":false,"completedAt":null,"createdAt":"2026-11-04T18:39:19.636Z"}]
```

The containers were removed, but the task is still there after `up`, because Redis data lives in the named volume `redis-data`.
