export const languages = { en: 'English', es: 'Español' } as const;
export type Lang = keyof typeof languages;

export const CV_URL = '/cv/CV_Washington_X_Quevedo_AI_Engineer_EN.pdf';
export const EMAIL = 'wxquevedo@inmersoft.com';
export const ASK_ORIGIN = 'https://ask.inmersoft.com';

export const social = {
  linkedin: 'https://www.linkedin.com/in/wxquevedo',
  github: 'https://github.com/wx-quevedo',
  behance: 'https://www.behance.net/wxquevedo',
} as const;

const en = {
  meta: {
    title: 'Washington X. Quevedo · AI & XR Engineer',
    description:
      'AI & XR Engineer in Quito, Ecuador, open to remote international roles. Machine learning in production, on-device detection, retrieval systems that cite their sources, and XR in Unity since 2016.',
    ogLocale: 'en_US',
  },
  skipToContent: 'Skip to content',
  navLabel: 'Main',
  menu: 'Menu',
  langLabel: 'Language',
  nav: {
    story: 'Story',
    work: 'Work',
    xr: 'XR',
    research: 'Research',
    ask: 'Ask me',
    contact: 'Contact',
  },
  cv: 'Download CV',
  hero: {
    kicker: 'Quito, Ecuador · Remote · UTC−5 · Open to international roles',
    lead: 'AI & XR Engineer. I ship machine learning to production, from on-device detection for a Stanford project to retrieval systems that cite their sources.',
    watch: 'Watch my story',
    skip: 'Skip to selected work',
    portraitAlt: 'Portrait of Washington X. Quevedo, smiling, wearing a dark sweater against a light gray background',
  },
  stats: {
    label: 'Key numbers',
    items: [
      { value: '0.96', label: 'mAP50, on-device tuna detector, Stanford' },
      { value: '49 ms', label: 'inference per image on a 2-core server' },
      { value: '14', label: 'h-index · 640 citations · 30+ papers' },
      { value: '2016', label: 'building XR in Unity since' },
    ],
  },
  story: {
    title: 'The story',
    note: 'From a robotics simulator in 2016 to on-device detection in 2026. Photos from the original projects.',
    milestones: [
      { year: '2015', text: 'I start studying artificial intelligence at ESPE.' },
      {
        year: '2016',
        text: 'First paper: a real-time Unity3D–MatLab simulator for robotics. 88 citations, still my most cited.',
      },
      { year: '2016', text: 'First place at the Galardones Nacionales, awarded by SENESCYT.' },
      { year: '2018', text: 'I found Inmersoft and register a software patent.' },
      { year: '2020', text: 'At Bagó I build interactive and AI tools.' },
      { year: '2026', text: 'Stanford: on-device detection for Buscapez.' },
    ],
  },
  work: {
    title: 'Selected work',
    intro: 'Machine learning in production, retrieval systems and the tools I use every day.',
    featured: 'Featured · Stanford project · 2026',
    placeholder: 'Visuals not public yet',
    status: 'In development',
    indexLabel: 'Projects',
    repo: 'Repository',
    live: 'Live demo',
    metrics: [
      { value: '0.96', label: 'mAP50' },
      { value: '49 ms', label: 'per image, 2-core server' },
    ],
  },
  detector: {
    title: 'Try the detector',
    text: 'A live demo is on its way: an object detector that runs entirely in your browser with ONNX Runtime Web, so your images never leave your device.',
    soon: 'Demo coming soon',
  },
  xr: {
    title: 'XR Engineering, since 2016',
    intro: 'Virtual and augmented reality for training, robotics and heritage, built in Unity.',
    more: 'See more on Behance',
  },
  research: {
    title: 'Research',
    text: '30+ peer-reviewed papers on virtual reality, robotics and education technology, published by Springer, ACM and IEEE. h-index 14, 640 citations.',
    top: 'Most cited',
    citations: 'citations',
    scholar: 'Google Scholar profile',
    constellation:
      'Each dot is a paper: year on the horizontal axis, size by citations. An interactive version is coming.',
    constellationLabel: 'Papers by year, sized by citations',
  },
  ask: {
    title: 'Ask me anything',
    text: 'Ask Washington answers questions about my experience using only public sources: my CV, papers and repositories. Every answer cites where it comes from.',
    frameTitle: 'Ask Washington, a chat that answers questions about Washington X. Quevedo',
    disclaimer: 'Answers are generated from public sources and may contain errors.',
    open: 'Open Ask Washington in a new tab',
    openChat: 'Open the chat',
    fab: 'Ask me',
    panelTitle: 'Ask Washington',
    close: 'Close chat',
    loading: 'Connecting to Ask Washington',
    unavailable: 'The chat is not available on this page yet.',
  },
  contact: {
    title: "Let's talk.",
    text: 'Open to remote roles in AI engineering and XR.',
    emailLabel: 'Email',
    cvLink: 'CV (PDF)',
    rights: 'Code under the MIT license. Texts and images © Washington X. Quevedo.',
  },
  notFound: {
    title: 'Page not found',
    text: 'This page does not exist.',
    back: 'Back to home',
  },
};

export type Dict = typeof en;

const es: Dict = {
  meta: {
    title: 'Washington X. Quevedo · Ingeniero de IA y XR',
    description:
      'Ingeniero de IA y XR en Quito, Ecuador, disponible para roles remotos internacionales. Machine learning en producción, detección en el dispositivo, sistemas de recuperación que citan sus fuentes y XR en Unity desde 2016.',
    ogLocale: 'es_419',
  },
  skipToContent: 'Saltar al contenido',
  navLabel: 'Principal',
  menu: 'Menú',
  langLabel: 'Idioma',
  nav: {
    story: 'Historia',
    work: 'Trabajo',
    xr: 'XR',
    research: 'Investigación',
    ask: 'Pregúntame',
    contact: 'Contacto',
  },
  cv: 'Descargar CV',
  hero: {
    kicker: 'Quito, Ecuador · Remoto · UTC−5 · Disponible para roles internacionales',
    lead: 'Ingeniero de IA y XR. Llevo machine learning a producción, desde detección en el dispositivo para un proyecto de Stanford hasta sistemas de recuperación que citan sus fuentes.',
    watch: 'Ver mi historia',
    skip: 'Ir al trabajo seleccionado',
    portraitAlt: 'Retrato de Washington X. Quevedo, sonriente, con suéter oscuro sobre un fondo gris claro',
  },
  stats: {
    label: 'Cifras clave',
    items: [
      { value: '0.96', label: 'mAP50, detector de atún en el dispositivo, Stanford' },
      { value: '49 ms', label: 'de inferencia por imagen en un servidor de 2 núcleos' },
      { value: '14', label: 'índice h · 640 citas · más de 30 artículos' },
      { value: '2016', label: 'el año desde el que construyo XR en Unity' },
    ],
  },
  story: {
    title: 'La historia',
    note: 'De un simulador de robótica en 2016 a la detección en el dispositivo en 2026. Fotos de los proyectos originales.',
    milestones: [
      { year: '2015', text: 'Empiezo a estudiar inteligencia artificial en la ESPE.' },
      {
        year: '2016',
        text: 'Primer artículo: un simulador Unity3D–MatLab en tiempo real para robótica. 88 citas, sigue siendo el más citado.',
      },
      { year: '2016', text: 'Primer lugar en los Galardones Nacionales de la SENESCYT.' },
      { year: '2018', text: 'Fundo Inmersoft y registro una patente de software.' },
      { year: '2020', text: 'En Bagó desarrollo herramientas interactivas y de IA.' },
      { year: '2026', text: 'Stanford: detección en el dispositivo para Buscapez.' },
    ],
  },
  work: {
    title: 'Trabajo seleccionado',
    intro: 'Machine learning en producción, sistemas de recuperación y las herramientas que uso a diario.',
    featured: 'Destacado · Proyecto de Stanford · 2026',
    placeholder: 'Imágenes aún no públicas',
    status: 'En desarrollo',
    indexLabel: 'Proyectos',
    repo: 'Repositorio',
    live: 'Ver demo',
    metrics: [
      { value: '0.96', label: 'mAP50' },
      { value: '49 ms', label: 'por imagen, servidor de 2 núcleos' },
    ],
  },
  detector: {
    title: 'Prueba el detector',
    text: 'Pronto habrá una demo en vivo: un detector de objetos que corre por completo en tu navegador con ONNX Runtime Web, así tus imágenes nunca salen de tu dispositivo.',
    soon: 'Demo próximamente',
  },
  xr: {
    title: 'Ingeniería XR, desde 2016',
    intro: 'Realidad virtual y aumentada para capacitación, robótica y patrimonio, hecha en Unity.',
    more: 'Ver más en Behance',
  },
  research: {
    title: 'Investigación',
    text: 'Más de 30 artículos revisados por pares sobre realidad virtual, robótica y tecnología educativa, publicados por Springer, ACM e IEEE. Índice h 14, 640 citas.',
    top: 'Más citados',
    citations: 'citas',
    scholar: 'Perfil en Google Scholar',
    constellation:
      'Cada punto es un artículo: el año en el eje horizontal y el tamaño según sus citas. Pronto habrá una versión interactiva.',
    constellationLabel: 'Artículos por año, con tamaño según sus citas',
  },
  ask: {
    title: 'Pregúntame lo que quieras',
    text: 'Ask Washington responde preguntas sobre mi experiencia usando solo fuentes públicas: mi CV, artículos y repositorios. Cada respuesta cita de dónde sale.',
    frameTitle: 'Ask Washington, un chat que responde preguntas sobre Washington X. Quevedo',
    disclaimer: 'Las respuestas se generan a partir de fuentes públicas y pueden contener errores.',
    open: 'Abrir Ask Washington en una pestaña nueva',
    openChat: 'Abrir el chat',
    fab: 'Pregúntame',
    panelTitle: 'Ask Washington',
    close: 'Cerrar chat',
    loading: 'Conectando con Ask Washington',
    unavailable: 'El chat todavía no está disponible en esta página.',
  },
  contact: {
    title: 'Hablemos.',
    text: 'Disponible para roles remotos de AI engineering y XR.',
    emailLabel: 'Correo',
    cvLink: 'CV (PDF, en inglés)',
    rights: 'Código bajo licencia MIT. Textos e imágenes © Washington X. Quevedo.',
  },
  notFound: {
    title: 'Página no encontrada',
    text: 'Esta página no existe.',
    back: 'Volver al inicio',
  },
};

export const ui: Record<Lang, Dict> = { en, es };
