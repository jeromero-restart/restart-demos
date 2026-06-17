# SIALAR — PoC de Análisis de Video con IA

## What This Is

Sistema de prueba de concepto (PoC) para vigilancia inteligente de video. Permite a administradores configurar áreas de control sobre imágenes de cámara, definir qué entidades monitorear (personas, vehículos, animales) y qué condiciones disparan una alerta. El sistema procesa un video MP4 importado, aplica las reglas configuradas usando YOLOv8, y muestra los eventos detectados en tiempo real simulado.

## Core Value

Un administrador puede configurar una zona de control con sus reglas de alerta, importar un video de prueba, y ver en pantalla qué eventos se detectaron — sin tocar código ni depender de software propietario de cámara.

## Requirements

### Validated

- [x] **INFRA-01**: Docker Compose orquesta backend, frontend, nginx — validado en Phase 01
- [x] **INFRA-02**: FastAPI backend arranca y responde a `/health` — validado en Phase 01
- [x] **INFRA-03**: nginx enruta `/api/`, `/health`, `/cameras` al backend; SPA fallback para el resto — validado en Phase 01
- [x] **INFRA-04**: Frontend Vite+React+TS compila y sirve dentro del contenedor Docker — validado en Phase 01

### Active

- [ ] Administrador puede visualizar el feed de una cámara (video en loop)
- [ ] Administrador puede dibujar un polígono sobre la imagen para definir un área de control
- [ ] Administrador puede seleccionar la entidad a monitorear (persona, vehículo o animal)
- [ ] Administrador puede configurar el disparador de alerta (cantidad simultánea, tiempo de permanencia, dirección/sentido)
- [ ] Administrador puede importar un video MP4 de prueba para ejecutar el análisis
- [ ] Sistema procesa el video con YOLOv8 evaluando las reglas configuradas
- [ ] Sistema muestra bounding boxes sobre las entidades detectadas durante la reproducción
- [ ] Sistema genera eventos cuando se cumple una condición y los muestra en panel lateral

### Out of Scope

- Autenticación/login — PoC es demo interna, no hay usuarios reales
- Gestión de cámaras (CRUD) — cámaras pre-cargadas para simplificar la demo
- Stream de cámara en vivo — se simula con video en loop
- Múltiples áreas por video — PoC valida de a un área por vez
- Múltiples entidades por área — una sola entidad por área en PoC
- Múltiples disparadores por entidad — un solo criterio por entidad en PoC
- Videos de más de 1 minuto — límite para mantener validación ágil
- Integración con VMS/NVR propietario — independencia tecnológica es un objetivo futuro
- Notificaciones externas (email, SMS, webhook) — fuera del alcance PoC

## Context

- Proyecto desarrollado por **Restart (inteligencia iplan\*)** como PoC para cliente SIALAR
- El sistema actual del cliente genera demasiados falsos positivos; el objetivo es demostrar reducción con configuración inteligente basada en contexto
- Independencia tecnológica: no requiere reemplazar cámaras ni depender del software propietario
- Cronograma: Prerrequisitos → Desarrollo → Definición de MVP (fechas TBD)
- La PoC exitosa deriva en propuesta técnica y comercial de MVP con mayor complejidad

## Constraints

- **Stack**: React + Vite (frontend), FastAPI Python (backend), YOLOv8 (detección), Docker (deploy en VM)
- **PoC scope**: 1 área por video, 1 entidad por área, 1 disparador por entidad, videos ≤ 1 min
- **No auth**: demo interna, sin sistema de usuarios
- **Cameras**: pre-cargadas (hardcoded), no hay pantalla de gestión de cámaras
- **Deploy**: contenedores Docker corriendo en VM Linux

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| YOLOv8 para detección | Open-source, soporta persona/vehículo/animal out-of-the-box, sin dependencia propietaria | — Pending |
| Video en loop en lugar de stream en vivo | Simplifica la PoC, permite validación reproducible con escenarios controlados | — Pending |
| Sin auth en PoC | Demo interna, reducir fricción de desarrollo | — Pending |
| Cámaras hardcoded | Acelera validación funcional, gestión de cámaras es v2 | — Pending |
| FastAPI + React+Vite | Stack moderno, desacoplado, compatible con dockerización | — Pending |
| Arquitectura agnóstica de procesamiento | Backend soporta pre-compute (dev/CPU) y realtime (GPU/demo). Rule engine desacoplado del timing. Permite iterar sin GPU y demostrar en vivo con ella. | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-18 — Phase 01 (infrastructure-foundation) complete*
