import type { ImageMetadata } from 'astro';
import type { Lang } from '../i18n/ui';
import vrRunner from '../assets/behance/vr-runner-4.jpg';
import robot from '../assets/behance/robot-teleoperation-1.jpg';
import automotive from '../assets/behance/automotive-assembling-1.jpg';
import heritage from '../assets/behance/antique-buildings-3.jpg';
import drone from '../assets/behance/drone-instrumentation-2.jpg';
import pid from '../assets/behance/pid-to-3d-2.jpg';

export interface XrProject {
  id: string;
  title: Record<Lang, string>;
  description: Record<Lang, string>;
  alt: Record<Lang, string>;
  image: ImageMetadata;
  behance: string;
}

export const xrProjects: XrProject[] = [
  {
    id: 'vr-runner',
    title: { en: 'VR Runner', es: 'VR Runner' },
    description: {
      en: 'Running through a virtual maze on a real treadmill.',
      es: 'Correr por un laberinto virtual sobre una caminadora real.',
    },
    alt: {
      en: 'A person wearing a VR headset runs on a treadmill in a lab',
      es: 'Una persona con visor de realidad virtual corre sobre una caminadora en un laboratorio',
    },
    image: vrRunner,
    behance: 'https://www.behance.net/gallery/162839093/VR-RUNNER',
  },
  {
    id: 'robot-teleoperation',
    title: { en: 'Robot teleoperation', es: 'Teleoperación de un robot' },
    description: {
      en: 'Driving a remote robot from an immersive interface with haptic feedback.',
      es: 'Manejar un robot remoto desde una interfaz inmersiva con retroalimentación háptica.',
    },
    alt: {
      en: 'An operator with a VR headset and headphones controls a haptic device next to a laptop',
      es: 'Un operador con visor de realidad virtual y audífonos maneja un dispositivo háptico junto a una laptop',
    },
    image: robot,
    behance: 'https://www.behance.net/gallery/162835949/TELEOPERATION-OF-A-ROBOT',
  },
  {
    id: 'automotive-assembling',
    title: { en: 'Automotive assembly', es: 'Ensamblaje automotriz' },
    description: {
      en: 'VR training to recognize and assemble engine components.',
      es: 'Capacitación en realidad virtual para reconocer y ensamblar piezas de un motor.',
    },
    alt: {
      en: 'Engine parts laid out on a virtual workbench',
      es: 'Piezas de un motor ordenadas sobre una mesa de trabajo virtual',
    },
    image: automotive,
    behance: 'https://www.behance.net/gallery/162836465/VIRTUAL-AUTOMOTIVE-ASSEMBLING',
  },
  {
    id: 'antique-buildings',
    title: { en: 'Heritage reconstruction', es: 'Reconstrucción patrimonial' },
    description: {
      en: 'Virtual reconstruction of historic buildings and their surroundings.',
      es: 'Reconstrucción virtual de edificios históricos y su entorno.',
    },
    alt: {
      en: 'Aerial view of a reconstructed colonial building with a central courtyard',
      es: 'Vista aérea de un edificio colonial reconstruido con un patio central',
    },
    image: heritage,
    behance: 'https://www.behance.net/gallery/162837061/VIRTUAL-RECONSTRUCTION-OF-ANTIQUE-BUILDINGS',
  },
  {
    id: 'drone-instrumentation',
    title: { en: 'Drone instrumentation', es: 'Instrumentación de un dron' },
    description: {
      en: 'Virtual instrumentation of a multirotor drone with robotic arms.',
      es: 'Instrumentación virtual de un dron multirrotor con brazos robóticos.',
    },
    alt: {
      en: 'An octocopter drone with two robotic arms flying over water',
      es: 'Un dron octocóptero con dos brazos robóticos volando sobre el agua',
    },
    image: drone,
    behance: 'https://www.behance.net/gallery/162838983/VIRTUAL-INTRUMENTATION-OF-A-DRONE',
  },
  {
    id: 'pid-to-3d',
    title: { en: 'P&ID to 3D', es: 'De P&ID a 3D' },
    description: {
      en: 'From a P&ID diagram to an interactive 3D process plant, operated with the hands.',
      es: 'De un diagrama P&ID a una planta de proceso 3D interactiva, operada con las manos.',
    },
    alt: {
      en: 'Virtual hands operating valves and controls of a 3D process tank',
      es: 'Manos virtuales operando válvulas y controles de un tanque de proceso en 3D',
    },
    image: pid,
    behance: 'https://www.behance.net/gallery/162835203/P-ID-DIAGRAM-TO-3D',
  },
];
