export interface Business {
  id: string; // = slug, usado en la URL pública
  ownerId: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  logoUrl?: string;
  logoCloudinaryId?: string;
  logoCreatedAt?: number;
  coverUrl?: string;
  whatsapp: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
  };
  location?: string;
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
  imageUrl?: string;
  imageCloudinaryId?: string;
  imageCreatedAt?: number;
  available: boolean;
  featured: boolean;
  createdAt: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

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
