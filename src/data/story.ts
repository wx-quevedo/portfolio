import type { ImageMetadata } from 'astro';
import type { Lang } from '../i18n/ui';
import simulator from '../assets/behance/unity-matlab-simulator-1.png';
import robot from '../assets/behance/robot-teleoperation-3.jpg';
import automotive from '../assets/behance/automotive-assembling-1.jpg';
import drone from '../assets/behance/drone-instrumentation-2.jpg';
import heritage from '../assets/behance/antique-buildings-3.jpg';
import vrRunner from '../assets/behance/vr-runner-4.jpg';

/**
 * One real project photo per milestone of "The story", in chronological order of the projects.
 * The caption names the project shown, so a photo is never presented as the milestone itself.
 */
export interface StoryPhoto {
  image: ImageMetadata;
  alt: Record<Lang, string>;
  caption: Record<Lang, string>;
}

export const storyPhotos: StoryPhoto[] = [
  {
    image: simulator,
    alt: {
      en: 'Unity3D-MatLab simulator: a mobile manipulator robot scanning rocks on a virtual terrain',
      es: 'Simulador Unity3D-MatLab: un robot manipulador móvil escaneando rocas en un terreno virtual',
    },
    caption: { en: 'Unity3D–MatLab robotics simulator', es: 'Simulador de robótica Unity3D–MatLab' },
  },
  {
    image: robot,
    alt: {
      en: 'Augmented reality interface for teleoperating a small mobile robot, with telemetry around the view',
      es: 'Interfaz de realidad aumentada para teleoperar un pequeño robot móvil, con telemetría alrededor de la vista',
    },
    caption: { en: 'Robot teleoperation in augmented reality', es: 'Teleoperación de un robot en realidad aumentada' },
  },
  {
    image: automotive,
    alt: {
      en: 'Engine parts laid out on a virtual workbench',
      es: 'Piezas de un motor ordenadas sobre una mesa de trabajo virtual',
    },
    caption: { en: 'VR training for automotive assembly', es: 'Capacitación en realidad virtual para ensamblaje automotriz' },
  },
  {
    image: drone,
    alt: {
      en: 'An octocopter drone with two robotic arms flying over water',
      es: 'Un dron octocóptero con dos brazos robóticos volando sobre el agua',
    },
    caption: { en: 'Virtual instrumentation of a drone', es: 'Instrumentación virtual de un dron' },
  },
  {
    image: heritage,
    alt: {
      en: 'Aerial view of a reconstructed colonial building with a central courtyard',
      es: 'Vista aérea de un edificio colonial reconstruido con un patio central',
    },
    caption: { en: 'Virtual reconstruction of a historic building', es: 'Reconstrucción virtual de un edificio histórico' },
  },
  {
    image: vrRunner,
    alt: {
      en: 'A person wearing a VR headset runs on a treadmill in a lab',
      es: 'Una persona con visor de realidad virtual corre sobre una caminadora en un laboratorio',
    },
    caption: { en: 'VR Runner, running in VR on a real treadmill', es: 'VR Runner, correr en realidad virtual sobre una caminadora real' },
  },
];
