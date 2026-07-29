import { Business } from '../types';

// Mientras se termina de construir y probar la app, todas las funciones están
// desbloqueadas para todos los negocios, sin importar su plan. Cuando estés
// listo para separar funciones por plan de verdad, cambia esto a `true`.
export const ENFORCE_PLAN_LIMITS = false;

export interface PlanFeatures {
  label: string;
  price: string;
  maxProducts: number;
  removeBranding: boolean; // quita "Creado con Bizly Store" de la tienda pública
  customCover: boolean; // subir imagen de portada
  multipleThemes: boolean; // elegir entre los temas de diseño (además de Minimalista)
  advancedStats: boolean; // estadísticas de visitas/ventas (futuro)
  customDomain: boolean; // dominio propio (futuro)
}

export const PLAN_FEATURES: Record<Business['plan'], PlanFeatures> = {
  gratis: {
    label: 'Gratis',
    price: '$0 MXN',
    maxProducts: 10,
    removeBranding: false,
    customCover: false,
    multipleThemes: false,
    advancedStats: false,
    customDomain: false,
  },
  basico: {
    label: 'Básico',
    price: '$49 MXN/mes',
    maxProducts: 50,
    removeBranding: false,
    customCover: true,
    multipleThemes: false,
    advancedStats: false,
    customDomain: false,
  },
  emprendedor: {
    label: 'Emprendedor',
    price: '$129 MXN/mes',
    maxProducts: Infinity,
    removeBranding: true,
    customCover: true,
    multipleThemes: true,
    advancedStats: true,
    customDomain: false,
  },
  negocio: {
    label: 'Negocio',
    price: '$299 MXN/mes',
    maxProducts: Infinity,
    removeBranding: true,
    customCover: true,
    multipleThemes: true,
    advancedStats: true,
    customDomain: true,
  },
};

export function getPlanFeatures(business: Business): PlanFeatures {
  const actual = PLAN_FEATURES[business.plan] || PLAN_FEATURES.gratis;

  if (!ENFORCE_PLAN_LIMITS) {
    // Todo desbloqueado (nivel "Negocio"), pero mostrando el nombre/precio
    // real del plan que tiene el negocio, para no confundir en la UI.
    return { ...PLAN_FEATURES.negocio, label: actual.label, price: actual.price };
  }

  return actual;
}

// Orden de planes, para saber cuál es "superior" a cuál (útil para mensajes de upgrade)
export const PLAN_ORDER: Business['plan'][] = ['gratis', 'basico', 'emprendedor', 'negocio'];

export function nextPlanThatUnlocks(feature: keyof PlanFeatures): Business['plan'] | null {
  for (const plan of PLAN_ORDER) {
    if (PLAN_FEATURES[plan][feature]) return plan;
  }
  return null;
}
