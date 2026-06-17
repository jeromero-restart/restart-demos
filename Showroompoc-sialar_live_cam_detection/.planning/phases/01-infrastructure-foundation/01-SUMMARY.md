---
phase: 01-infrastructure-foundation
plan: 01
subsystem: infra
tags: [docker, docker-compose, nginx, fastapi, react, vite, yolov8, cuda, nvidia-gpu]

# Dependency graph
requires: []
provides:
  - docker-compose.yml with frontend, backend, and nginx services
  - nginx reverse proxy with 500MB upload limit and WebSocket support
  - backend Dockerfile with NVIDIA CUDA 12.3 base and YOLOv8s weights baked in
  - frontend Dockerfile with Node 20 and Vite dev server
  - nginx Dockerfile with minimal alpine base
  - backend requirements.txt with all 12 Python dependencies pinned
  - frontend package.json with React 18, Vite 5, Zustand, react-konva, react-use-websocket
  - .dockerignore files for all three services
  - root .gitignore for Docker, Python, Node, and OS artifacts
affects: [02-backend-skeleton, 03-frontend-skeleton, 04-yolo-pipeline, 05-hardening]

# Tech tracking
tech-stack:
  added:
    - docker-compose 3.9 with GPU reservations
    - nginx:alpine reverse proxy
    - nvidia/cuda:12.3.0-cudnn8-runtime-ubuntu22.04 backend base
    - node:20-slim frontend base
    - FastAPI 0.111.0, uvicorn 0.29.0, pydantic 2.5.0
    - ultralytics 8.2.0, torch 2.1.1, torchvision 0.16.1
    - opencv-python-headless 4.10.0.84, numpy 1.26.3
    - shapely 2.0.1, python-multipart 0.0.9, python-dotenv 1.0.0
    - React 18.2.0, react-router-dom 6.20.0, zustand 4.4.0
    - react-konva 18.2.0, konva 9.2.0, react-use-websocket 4.5.0
    - tailwindcss 3.4.0, vite 5.0.0, typescript 5.3.0
  patterns:
    - YOLOv8s weights baked into Docker image at build time (Approach A) to avoid runtime download
    - Separate requirements.txt COPY layer before application COPY for pip cache optimization
    - Non-root appuser in backend container for security baseline
    - nginx reverse proxy routes /api/ to backend, / to frontend SPA with try_files fallback

key-files:
  created:
    - docker-compose.yml
    - nginx/nginx.conf
    - nginx/Dockerfile
    - nginx/.dockerignore
    - backend/Dockerfile
    - backend/requirements.txt
    - backend/.dockerignore
    - frontend/Dockerfile
    - frontend/package.json
    - frontend/.dockerignore
    - .gitignore
  modified: []

key-decisions:
  - "nginx upstream uses docker-compose service name 'backend:8000' — resolves correctly within compose network"
  - "YOLOv8s (not nano) chosen per plan spec — better accuracy tradeoff for PoC demo use case"
  - "torch/torchvision ordered before ultralytics in requirements.txt for correct CUDA wheel resolution"
  - "client_max_body_size 500M in both global http block and /api/ location block — defense in depth for video uploads"

patterns-established:
  - "Layer caching pattern: COPY requirements.txt → pip install → COPY application code"
  - "All Python dependencies pinned with == (no ^, ~, or >=)"
  - "Non-root container user (appuser) for backend security baseline"
  - "WebSocket upgrade headers pre-configured in nginx for real-time frame streaming"

requirements-completed: [INFRA-01, INFRA-04]

# Metrics
duration: 4min
completed: 2026-04-17
---

# Phase 01 Plan 01: Infrastructure Foundation Summary

**Docker Compose orchestration with nginx reverse proxy (500MB upload), NVIDIA CUDA 12.3 backend with YOLOv8s baked in, and React/Vite frontend — all services wired with bridge network**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-17T20:41:17Z
- **Completed:** 2026-04-17T20:45:00Z
- **Tasks:** 9
- **Files modified:** 11 created

## Accomplishments
- docker-compose.yml with three services (frontend, backend, nginx) and NVIDIA GPU reservation — `docker compose config` validates with exit 0
- nginx reverse proxy with 500MB client_max_body_size, 600s timeout, WebSocket upgrade headers, and SPA routing fallback
- Backend Dockerfile on nvidia/cuda:12.3.0-cudnn8-runtime-ubuntu22.04 with YOLOv8s weights baked in and non-root appuser
- All 12 Python dependencies pinned exactly (no range operators) with torch before ultralytics for CUDA ordering
- Frontend package.json with full stack: React 18, Vite 5, Zustand, react-konva, react-use-websocket, Tailwind CSS

## Task Commits

Each task was committed atomically:

1. **Task 1: docker-compose.yml** - `a0f6626` (chore)
2. **Task 2: nginx.conf** - `22ce961` (chore)
3. **Task 3: backend/Dockerfile** - `d742200` (chore)
4. **Task 4: frontend/Dockerfile** - `faecad4` (chore)
5. **Task 5: nginx/Dockerfile** - `5f7882e` (chore)
6. **Task 6: .dockerignore files** - `1d22672` (chore)
7. **Task 7: backend/requirements.txt** - `2a06969` (chore)
8. **Task 8: frontend/package.json** - `52d19f7` (chore)
9. **Task 9: .gitignore** - `53c437a` (chore)

## Files Created/Modified
- `docker-compose.yml` - Three-service orchestration with GPU reservation and bridge network
- `nginx/nginx.conf` - Reverse proxy with 500MB upload, WebSocket support, SPA fallback
- `nginx/Dockerfile` - Minimal nginx:alpine base with custom config
- `nginx/.dockerignore` - Minimal exclusions
- `backend/Dockerfile` - CUDA 12.3 + YOLOv8s weights + non-root user, layer-cached dependencies
- `backend/requirements.txt` - 12 pinned Python dependencies in correct install order
- `backend/.dockerignore` - Excludes __pycache__, .venv, .env, logs
- `frontend/Dockerfile` - node:20-slim with npm ci and Vite dev server on 0.0.0.0
- `frontend/package.json` - Full React ecosystem with react-konva, zustand, websocket
- `frontend/.dockerignore` - Excludes node_modules, dist, .env files
- `.gitignore` - 36-entry root gitignore for Python, Node, Docker, OS, IDE

## Decisions Made
- Used `yolov8s.pt` (small) instead of nano per plan specification — better accuracy for the demo
- torch and torchvision ordered before ultralytics in requirements.txt for CUDA wheel resolution
- client_max_body_size 500M set in both global http block and /api/ location block for defense in depth
- nginx -t validation outside docker-compose network fails by design (upstream DNS not resolvable) — config is syntactically valid and works within compose network

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- nginx -t syntax validation (`docker run --rm -v ... nginx -t`) fails with "host not found in upstream backend:8000" when run outside docker-compose network. This is expected behavior — the upstream hostname `backend` only resolves within the docker-compose bridge network. Config is syntactically valid; all other verification checks passed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Infrastructure scaffold complete — `docker compose config` validates with exit 0
- Backend directory exists, ready for FastAPI application skeleton (Wave 2)
- Frontend directory exists, ready for React/Vite source files (Wave 2)
- Nginx routes configured, ready for actual services to run behind them
- GPU blocker (from STATE.md) remains: VM GPU availability unknown. If CPU-only VM, backend base image should be changed from nvidia/cuda to python:3.11-slim. YOLOv8s on CPU will process ~5fps input at 0.5-2s/frame.

---
*Phase: 01-infrastructure-foundation*
*Completed: 2026-04-17*

## Self-Check: PASSED

All 11 files created and verified to exist on disk. All 9 task commits verified in git log.
