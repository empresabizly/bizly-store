/**
 * Sistema de plantillas de tienda por categoría.
 *
 * En vez de construir 5 componentes de página totalmente independientes
 * (StoreTemplate, RestaurantTemplate, FashionTemplate, etc.) que duplicarían
 * casi todo su código, usamos UNA sola página de tienda (Store.tsx) que lee
 * su configuración de aquí según la categoría del negocio: qué etiquetas
 * mostrar, qué texto usar en el botón principal, y qué campos extra de
 * producto destacar (marca/modelo, tallas, portafolio, etc.).
 *
 * Esto cumple el mismo objetivo (cada categoría se ve y se siente distinta)
 * con una arquitectura mucho más fácil de mantener. Agregar una categoría
 * nueva es agregar una entrada aquí, no rehacer el sistema.
 *
 * Si en el futuro una categoría necesita una estructura de página
 * radicalmente distinta (no solo textos/campos), ahí sí se justifica
 * separarla en su propio componente — esta configuración ya deja ese
 * camino preparado.
 */
import { Business } from '../types';

export interface StoreTemplateConfig {
  ctaLabel: string;
  addButtonLabel: string;
  showBadges: boolean;
  showBrandModel: boolean;
  showSchedule: boolean;
  catalogSectionLabel: string;
  emptyStateLabel: string;
  accentStyle: 'rounded' | 'sharp';
}

const DEFAULT_TEMPLATE: StoreTemplateConfig = {
  ctaLabel: '💬 Escribir por WhatsApp',
  addButtonLabel: 'Agregar',
  showBadges: false,
  showBrandModel: false,
  showSchedule: false,
  catalogSectionLabel: 'Catálogo',
  emptyStateLabel: 'Esta tienda todavía no tiene productos.',
  accentStyle: 'rounded',
};

export const STORE_TEMPLATES: Record<string, StoreTemplateConfig> = {
  alimentos: {
    ctaLabel: '🍽️ Pedir por WhatsApp',
    addButtonLabel: 'Agregar al pedido',
    showBadges: true,
    showBrandModel: false,
    showSchedule: true,
    catalogSectionLabel: 'Menú',
    emptyStateLabel: 'El menú todavía no tiene platillos cargados.',
    accentStyle: 'rounded',
  },
  moda: {
    ctaLabel: '💬 Preguntar disponibilidad',
    addButtonLabel: 'Agregar',
    showBadges: true,
    showBrandModel: false,
    showSchedule: false,
    catalogSectionLabel: 'Colección',
    emptyStateLabel: 'Esta boutique todavía no tiene piezas cargadas.',
    accentStyle: 'sharp',
  },
  tecnologia: {
    ctaLabel: '💬 Consultar disponibilidad',
    addButtonLabel: 'Agregar al carrito',
    showBadges: true,
    showBrandModel: true,
    showSchedule: false,
    catalogSectionLabel: 'Catálogo de equipos',
    emptyStateLabel: 'Todavía no hay equipos publicados.',
    accentStyle: 'sharp',
  },
  servicios: {
    ctaLabel: '📋 Solicitar cotización',
    addButtonLabel: 'Cotizar',
    showBadges: false,
    showBrandModel: false,
    showSchedule: false,
    catalogSectionLabel: 'Servicios',
    emptyStateLabel: 'Todavía no hay servicios publicados.',
    accentStyle: 'rounded',
  },
  belleza: {
    ctaLabel: '💬 Agendar por WhatsApp',
    addButtonLabel: 'Agregar',
    showBadges: true,
    showBrandModel: false,
    showSchedule: true,
    catalogSectionLabel: 'Servicios y productos',
    emptyStateLabel: 'Todavía no hay productos o servicios publicados.',
    accentStyle: 'rounded',
  },
};

export function getStoreTemplate(business: Business): StoreTemplateConfig {
  return STORE_TEMPLATES[business.category] || DEFAULT_TEMPLATE;
}
