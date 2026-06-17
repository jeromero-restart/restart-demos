export const demosData = [
  {
    id: 3,
    apiUrl: import.meta.env.VITE_MEDIHOME_API_URL || 'http://localhost:8000',
    title: "LECTURA INTELIGENTE DE PLANILLAS MÉDICAS",
    vertical: "Salud",
    tech: "OCR + IA",
    description: "Extrae datos desde planillas médicas digitalizadas, valida reglas de negocio y detecta inconsistencias para reducir carga manual y acelerar los circuitos administrativos y de auditoría.",
    objective: "Reducir tiempos de procesamiento, disminuir errores administrativos y aumentar el nivel de automatización del proceso.",
    ascii: "10100011 11001110",
    impactMetrics: [
      "↓ -50–75% tiempo de procesamiento por planilla",
      "↓ -30–60% errores administrativos",
      "↑ +2.5x productividad por operador",
      "↑ +80% automatización del proceso"
    ]
  },
  {
    id: 4,
    apiUrl: import.meta.env.VITE_AGENTE_API_URL || 'http://localhost:8200',
    botUrl: 'https://t.me/DPI_POC_bot',
    knowledgeBase: [
      {
        doc: 'IT-ME-08 · Inertización con Nitrógeno Rev_01',
        roles: ['Técnico', 'Supervisor'],
        questions: [
          '¿Cuál es el procedimiento de inertización con N₂ de líneas con gas de proceso?',
          '¿Cuáles son las condiciones de presurización y tiempo para la inertización con N₂?',
          '¿Cuáles son los riesgos derivados de la manipulación de N₂?',
        ],
      },
      {
        doc: 'PR-SSMA-03 · Entrega de EPP',
        roles: [],
        questions: [
          '¿En dónde se hace la entrega de indumentaria y EPP?',
          '¿Dónde se guardan las constancias de entrega de EPP?',
        ],
      },
    ],
    title: "ASISTENTE INTELIGENTE CON CONOCIMIENTO EMPRESARIAL",
    vertical: "Todas",
    tech: "LLM + RAG",
    description: "Asistente conversacional que responde preguntas sobre procesos, documentación y conocimiento interno de la organización, recuperando información relevante en tiempo real desde bases documentales.",
    objective: "Reducir tiempos de búsqueda, mejorar la calidad de respuesta y escalar el acceso al conocimiento sin depender de atención manual.",
    ascii: "00010010 11101100",
    impactMetrics: [
      "↓ -40–65% tiempo de búsqueda de información",
      "↑ +60–85% consultas resueltas sin intervención humana",
      "↓ -30–50% tickets repetitivos",
      "↑ +20–35% satisfacción del usuario"
    ]
  },
  {
    id: 5,
    apiUrl: import.meta.env.VITE_LIVECAM_API_URL || 'http://localhost:8001',
    title: "DETECCIÓN DE EVENTOS EN CÁMARA EN VIVO",
    vertical: "Seguridad",
    tech: "Vision AI",
    description: "Detecta personas, vehículos y animales en tiempo real mediante IA de Visión. Definí zonas de interés sobre el video y configurá reglas de alerta por conteo, permanencia o dirección de ingreso.",
    objective: "Reducir incidentes de seguridad, automatizar la vigilancia y generar alertas accionables sin intervención humana continua.",
    ascii: "10110010 01101101",
    impactMetrics: [
      "↓ -60% tiempo de respuesta ante incidentes",
      "↑ +80% cobertura de vigilancia automatizada",
      "↓ -45% falsos positivos vs. detección manual",
      "↑ +3x capacidad de monitoreo simultáneo"
    ]
  },
  {
    id: 6,
    apiUrl: import.meta.env.VITE_EPP_API_URL || 'http://localhost:8005',
    title: "DETECCIÓN DE EPP Y FUEGO EN PLANTA",
    vertical: "Seguridad",
    tech: "Vision AI",
    description: "Monitorea cámaras de planta y detecta en tiempo real el uso de casco (EPP), personas sin protección y focos de fuego/humo, generando alertas inmediatas para prevenir incidentes.",
    objective: "Reducir accidentes por falta de EPP, acelerar la respuesta ante incendios y automatizar el control de cumplimiento de seguridad.",
    ascii: "01000101 01010000",
    impactMetrics: [
      "↓ -50% incidentes por falta de EPP",
      "↑ +90% cobertura de control de seguridad",
      "↓ -70% tiempo de detección de fuego/humo",
      "↑ +100% trazabilidad de cumplimiento"
    ]
  },
  {
    id: 2,
    apiUrl: import.meta.env.VITE_AGENTES_API_URL || 'http://localhost:8002',
    title: "AGENTES TELEFÓNICOS AUTÓNOMOS",
    vertical: "Todas",
    tech: "Voice AI",
    description: "Agentes de IA que ejecutan campañas de contacto telefónico de forma autónoma, con lenguaje natural, alta concurrencia y una experiencia de voz más ágil y consistente.",
    objective: "Reducir costo por contacto, aumentar la tasa de contacto efectivo y mejorar la conversión de campañas.",
    ascii: "11101010 00111011",
    impactMetrics: [
      "↓ -35–60% costo por contacto",
      "↑ +20–45% tasa de contacto efectivo",
      "↑ +15–30% conversión en campañas",
      "↑ +70% automatización de llamadas salientes"
    ]
  },
  {
    id: 1,
    apiUrl: import.meta.env.VITE_PERFILADOR_API_URL || 'http://localhost:8004',
    title: "PERFILADOR DE CLIENTE EN TIENDA (Vision AI)",
    vertical: "Retail",
    tech: "Vision AI",
    description: "Analiza imágenes en tienda para estimar perfil demográfico y patrones de comportamiento de los visitantes, generando insights accionables para marketing, layout y estrategia comercial.",
    objective: "Mejorar segmentación, aumentar conversión de campañas y elevar ventas en locales intervenidos.",
    ascii: "01001100 01101111",
    impactMetrics: [
      "↑ +18–32% conversión en campañas segmentadas",
      "↑ +12–20% ticket promedio por tienda",
      "↑ +25% uso de insights en decisiones comerciales",
      "↑ +10–18% ventas en locales intervenidos"
    ]
  },
];

export const verticals = ["Todas", "Finanzas", "Retail", "Salud", "Legal", "Manufactura", "Seguridad"];
