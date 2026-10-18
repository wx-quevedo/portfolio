import type { Lang } from '../i18n/ui';

export interface Project {
  id: string;
  name: string;
  kicker: Record<Lang, string>;
  description: Record<Lang, string>;
  chips: string[];
  repo?: string;
  live?: string;
}

const GITHUB = 'https://github.com/wx-quevedo';

export const featured: Project = {
  id: 'buscapez',
  name: 'Buscapez',
  kicker: { en: '', es: '' },
  description: {
    en: 'An on-device tuna detector built for a Stanford project. A 4-class YOLO model trained in PyTorch runs fully offline on iOS and Android through ExecuTorch, and the same model is served with ONNX Runtime on the server. Available on the App Store and Google Play.',
    es: 'Un detector de atún que corre en el dispositivo, construido para un proyecto de Stanford. Un modelo YOLO de 4 clases entrenado en PyTorch funciona sin conexión en iOS y Android con ExecuTorch, y el mismo modelo se sirve con ONNX Runtime en el servidor. Disponible en App Store y Google Play.',
  },
  chips: ['PyTorch', 'YOLO', 'ExecuTorch', 'ONNX Runtime', 'FastAPI'],
};

export const projects: Project[] = [
  {
    id: 'ask-washington',
    name: 'Ask Washington',
    kicker: { en: 'Retrieval · 2026', es: 'Recuperación · 2026' },
    description: {
      en: 'A retrieval assistant that answers questions about my work and cites its public sources. Hybrid search over pgvector, answers written by Claude, with a daily budget and logs.',
      es: 'Un asistente de recuperación que responde preguntas sobre mi trabajo y cita sus fuentes públicas. Búsqueda híbrida sobre pgvector, respuestas escritas por Claude, con presupuesto diario y registros.',
    },
    chips: ['FastAPI', 'LangChain', 'LlamaIndex', 'pgvector', 'Claude'],
    repo: `${GITHUB}/ask-washington`,
    live: 'https://ask.inmersoft.com',
  },
  {
    id: 'localia',
    name: 'Localia',
    kicker: { en: 'Generative AI platform', es: 'Plataforma de IA generativa' },
    description: {
      en: 'A self-hosted, invite-only platform that turns local LLM and ComfyUI models into configurable services, with a Redis job queue and real-time progress over WebSockets.',
      es: 'Una plataforma autoalojada y solo por invitación que convierte modelos locales de LLM y ComfyUI en servicios configurables, con cola de trabajos en Redis y progreso en tiempo real por WebSockets.',
    },
    chips: ['Laravel', 'React', 'Redis', 'Reverb', 'ComfyUI'],
    repo: `${GITHUB}/localia-genai-platform`,
  },
  {
    id: 'agent-office-visualizer',
    name: 'Agent Office Visualizer',
    kicker: { en: 'Agent tooling', es: 'Herramientas para agentes' },
    description: {
      en: 'A live 3D office, on the web and on iPhone, that shows what every Claude Code agent is doing across machines, with permission approval and orchestrator-led teams.',
      es: 'Una oficina 3D en vivo, en la web y en iPhone, que muestra qué hace cada agente de Claude Code en cada máquina, con aprobación de permisos y equipos dirigidos por un orquestador.',
    },
    chips: ['FastAPI', 'SQLite', '3D web', 'iOS'],
    repo: `${GITHUB}/agent-office-visualizer`,
  },
  {
    id: 'focus',
    name: 'Focus',
    kicker: { en: 'Computer vision', es: 'Visión por computador' },
    description: {
      en: 'Gaze tracking with an ordinary webcam: an ETH-XGaze CNN, per-session screen calibration and a click-through desktop overlay, with no infrared hardware.',
      es: 'Seguimiento de la mirada con una webcam común: una CNN ETH-XGaze, calibración de pantalla por sesión y una capa transparente sobre el escritorio, sin hardware infrarrojo.',
    },
    chips: ['PyTorch', 'MediaPipe', 'PyQt6', 'CUDA'],
    repo: `${GITHUB}/focus`,
  },
];
