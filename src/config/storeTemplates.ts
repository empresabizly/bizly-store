/**
 * Bizly Store tiene 3 "motores de diseño" — no son componentes de página
 * separados, sino configuraciones que cambian textos, forma de botones y
 * el estilo de tarjeta de producto (ver ProductCard en Store.tsx, que lee
 * `cardStyle` de aquí para renderizar cada motor de forma distinta).
 *
 * - Bizly Fashion  → ropa, accesorios, belleza (editorial, minimalista)
 * - Bizly Food     → restaurantes, cafeterías, repostería (fotos grandes, apetitoso)
 * - Bizly Business → médicos, servicios, tecnología, empresas (corporativo, limpio)
 *
 * Agregar una categoría nueva es mapearla a uno de los 3 motores existentes
 * (o crear un 4to motor aquí) — no hay que tocar Store.tsx para eso.
 */
import { Business } from '../types';

export type EngineKey = 'fashion' | 'food' | 'business';
export type CardStyle = 'fashion' | 'food' | 'business';
export type ButtonRadius = 'full' | 'md';

export interface StoreEngine {
  key: EngineKey;
  engineName: string;
  ctaLabel: string;
  addButtonLabel: string;
  showBadges: boolean;
  showBrandModel: boolean;
  showSchedule: boolean;
  catalogSectionLabel: string;
  newArrivalsLabel: string;
  emptyStateLabel: string;
  cardStyle: CardStyle;
  buttonRadius: ButtonRadius;
}

const ENGINES: Record<EngineKey, StoreEngine> = {
  fashion: {
    key: 'fashion',
    engineName: 'Bizly Fashion',
    ctaLabel: 'Preguntar disponibilidad',
    addButtonLabel: 'Agregar',
    showBadges: true,
    showBrandModel: false,
    showSchedule: false,
    catalogSectionLabel: 'Colección',
    newArrivalsLabel: 'Nuevos lanzamientos',
    emptyStateLabel: 'Esta boutique todavía no tiene piezas cargadas.',
    cardStyle: 'fashion',
    buttonRadius: 'md',
  },
  food: {
    key: 'food',
    engineName: 'Bizly Food',
    ctaLabel: 'Pedir por WhatsApp',
    addButtonLabel: 'Agregar al pedido',
    showBadges: true,
    showBrandModel: false,
    showSchedule: true,
    catalogSectionLabel: 'Menú',
    newArrivalsLabel: 'Recién agregado al menú',
    emptyStateLabel: 'El menú todavía no tiene platillos cargados.',
    cardStyle: 'food',
    buttonRadius: 'full',
  },
  business: {
    key: 'business',
    engineName: 'Bizly Business',
    ctaLabel: 'Solicitar cotización',
    addButtonLabel: 'Cotizar',
    showBadges: false,
    showBrandModel: true,
    showSchedule: false,
    catalogSectionLabel: 'Catálogo',
    newArrivalsLabel: 'Nuevos productos y servicios',
    emptyStateLabel: 'Todavía no hay productos o servicios publicados.',
    cardStyle: 'business',
    buttonRadius: 'md',
  },
};

const CATEGORY_TO_ENGINE: Record<string, EngineKey> = {
  alimentos: 'food',
  moda: 'fashion',
  belleza: 'fashion',
  tecnologia: 'business',
  servicios: 'business',
  hogar: 'business',
  regalos: 'fashion',
  artesanias: 'fashion',
  educacion: 'business',
  otros: 'business',
};

export function getStoreEngine(business: Business): StoreEngine {
  const key = CATEGORY_TO_ENGINE[business.category] || 'business';
  return ENGINES[key];
}
