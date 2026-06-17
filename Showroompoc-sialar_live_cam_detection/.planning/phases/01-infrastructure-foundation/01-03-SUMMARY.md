---
phase: 01-infrastructure-foundation
plan: 03
subsystem: infra
tags: [nginx, reverse-proxy, routing, gap-closure]

# Dependency graph
requires:
  - 01-01-PLAN (nginx.conf baseline with /api/ location block)
  - 01-02-PLAN (backend /health and /cameras endpoints exist)
provides:
  - nginx routing for /health and /health/detailed via prefix match
  - nginx routing for /cameras endpoint
  - All three backend health/camera endpoints reachable through nginx port 80
affects: [verification, end-to-end-testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - nginx prefix-match: location /health covers both /health and /health/detailed without a separate block

key-files:
  created: []
  modified:
    - nginx/nginx.conf

key-decisions:
  - "location /health uses prefix match — covers /health/detailed automatically, no separate block needed"
  - "New blocks placed after /api/ and before SPA catch-all / to ensure correct nginx priority order"

requirements-completed: [INFRA-01, INFRA-03]

# Metrics
duration: 5min
completed: 2026-04-18
---

# Phase 01 Plan 03: Nginx Gap Closure — Health and Camera Routing Summary

**Added two nginx location blocks routing /health (with /health/detailed via prefix match) and /cameras to the FastAPI backend, closing the gap where those endpoints were unreachable through nginx port 80**

## Performance

- **Duration:** 5 min
- **Completed:** 2026-04-18
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- `location /health` block added — proxies `/health` and `/health/detailed` to backend upstream via nginx prefix matching
- `location /cameras` block added — proxies `/cameras` to backend upstream
- Both blocks inserted after `location /api/` and before `location /` SPA catch-all (correct nginx priority order)
- `proxy_pass http://backend` count increased from 1 to 3 (api, health, cameras)
- SPA fallback `try_files $uri $uri/ /index.html` unchanged and still last location block
- `client_max_body_size 500M` still appears in both global http block and /api/ block (2 matches — unchanged)
- nginx config syntax validated: no emerg/crit lines excluding expected upstream DNS resolution error (pre-existing constraint)

## Task Commits

1. **Task 1: Add /health and /cameras location blocks to nginx.conf** - `0ef9f2e` (feat)

## Files Created/Modified

- `nginx/nginx.conf` — Added location /health and location /cameras blocks before SPA catch-all

## Decisions Made

- Used nginx prefix matching for `/health` — a single `location /health` block matches both `/health` and `/health/detailed`, so no separate block for `/health/detailed` is needed per the plan spec.
- Did not add WebSocket upgrade headers to health/camera blocks (not needed — these endpoints return JSON, not WebSocket connections).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- nginx -t syntax validation (`docker run --rm -v ... nginx -t`) reports "host not found in upstream backend:8000" — same pre-existing constraint as plans 01 and 02. The `backend` hostname only resolves within the docker-compose bridge network. Config syntax is valid; no emerg/crit lines after excluding the host-not-found DNS message.

## Threat Flags

None — changes are purely additive nginx routing configuration with no new security surface beyond what is documented in the plan's threat model. The /health/detailed information disclosure and nginx→backend spoofing risks are accepted per T-01-gap03-01 and T-01-gap03-02.

## Self-Check: PASSED

- `nginx/nginx.conf` modified and verified — location blocks for /health and /cameras present in correct order
- Commit `0ef9f2e` verified in git log
- All acceptance criteria verified: location /health count=1, location /cameras count=1, proxy_pass count=3, try_files unchanged, client_max_body_size 500M count=2, proxy_http_version 1.1 count=3, block order /api/ → /health → /cameras → /
