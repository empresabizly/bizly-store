export interface Business {
  id: string; // = slug, usado en la URL pública
  ownerId: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  tagline?: string;
  aboutText?: string;
  deliveryInfo?: string;
  logoUrl?: string;
  logoCloudinaryId?: string;
  logoCreatedAt?: number;
  coverUrl?: string;
  coverCloudinaryId?: string;
  coverCreatedAt?: number;
  whatsapp: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
  };
  location?: string;
  schedule?: string;
  primaryColor?: string;
  templateEngine?: 'fashion' | 'food' | 'restaurant' | 'business';
  theme: 'minimalista'; // más temas se agregan después
  plan: 'gratis' | 'basico' | 'emprendedor' | 'negocio';
  createdAt: number;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  brand?: string;
  model?: string;
  stock?: number;
  badge?: ProductBadge;
  imageUrl?: string;
  imageCloudinaryId?: string;
  imageCreatedAt?: number;
  available: boolean;
  featured: boolean;
  createdAt: number;
}

export type ProductBadge = 'mas_vendido' | 'nuevo' | 'recomendado' | 'promocion';

export const PRODUCT_BADGE_LABELS: Record<ProductBadge, string> = {
  mas_vendido: 'Más vendido',
  nuevo: 'Nuevo',
  recomendado: 'Recomendado',
  promocion: 'Promoción',
};

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Category {
  id: string;
  businessId: string;
  name: string;
  imageUrl?: string;
  cloudinaryId?: string;
  createdAt: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export type OrderStatus = 'nuevo' | 'confirmado' | 'completado' | 'cancelado';

export interface Order {
  id: string;
  businessId: string;
  items: OrderItem[];
  total: number;
  customerName: string;
  customerPhone?: string;
  status: OrderStatus;
  createdAt: number;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  nuevo: 'Nuevo',
  confirmado: 'Confirmado',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  nuevo: 'bg-amber-100 text-amber-700',
  confirmado: 'bg-blue-100 text-blue-700',
  completado: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-700',
};

export const BUSINESS_CATEGORIES = [
  { value: 'moda', label: '👕 Moda y ropa' },
  { value: 'alimentos', label: '🍔 Alimentos y restaurantes' },
  { value: 'belleza', label: '💄 Belleza' },
  { value: 'tecnologia', label: '📱 Tecnología' },
  { value: 'hogar', label: '🏠 Hogar' },
  { value: 'regalos', label: '🎁 Regalos y accesorios' },
  { value: 'artesanias', label: '🎨 Artesanías' },
  { value: 'servicios', label: '🛠 Servicios profesionales' },
  { value: 'educacion', label: '📚 Educación' },
  { value: 'otros', label: 'Otros' },
] as const;
