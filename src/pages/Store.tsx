import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getBusinessBySlug } from '../context/AuthContext';
import {
  Business,
  Product,
  CartItem,
  BUSINESS_CATEGORIES,
  OrderItem,
  PRODUCT_BADGE_LABELS,
} from '../types';
import { getPlanFeatures } from '../config/plans';
import { getStoreTemplate } from '../config/storeTemplates';

type SortOption = 'relevancia' | 'precio_asc' | 'precio_desc' | 'nuevo';

export default function Store() {
  const { slug } = useParams();
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('relevancia');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [sendingOrder, setSendingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');

  useEffect(() => {
    async function load() {
      if (!slug) return;
      const b = await getBusinessBySlug(slug);
      setBusiness(b);
      if (b) {
        const q = query(collection(db, 'products'), where('businessId', '==', b.id), where('available', '==', true));
        const snap = await getDocs(q);
        setProducts(snap.docs.map((d) => d.data() as Product));
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { product, quantity: 1 }];
    });
    setCartOpen(true);
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  const total = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const cartCount = cart.reduce((n, i) => n + i.quantity, 0);

  async function sendOrder() {
    if (!business || cart.length === 0) return;
    if (!customerName.trim()) {
      setOrderError('Escribe tu nombre para enviar el pedido.');
      return;
    }
    setOrderError('');
    setSendingOrder(true);

    const items: OrderItem[] = cart.map((i) => ({
      productId: i.product.id,
      name: i.product.name,
      price: i.product.price,
      quantity: i.quantity,
    }));

    try {
      await addDoc(collection(db, 'orders'), {
        businessId: business.id,
        items,
        total,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || null,
        status: 'nuevo',
        createdAt: Date.now(),
      });
    } catch {
      // Si falla el guardado, igual dejamos que el pedido se mande por WhatsApp.
    }

    const lines = cart.map((i) => `- ${i.product.name} x${i.quantity}: $${i.product.price * i.quantity} MXN`);
    const message = [
      `Hola, soy ${customerName.trim()}. Quiero realizar este pedido en ${business.name}:`,
      '',
      ...lines,
      '',
      `Total: $${total} MXN`,
      '',
      'Gracias.',
    ].join('\n');
    const url = `https://wa.me/${business.whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    setSendingOrder(false);
  }

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
    [products]
  );

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (activeCategory) list = list.filter((p) => p.category === activeCategory);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      );
    }
    if (sort === 'precio_asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'precio_desc') list.sort((a, b) => b.price - a.price);
    else if (sort === 'nuevo') list.sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }, [products, activeCategory, search, sort]);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bizly-cream text-black/40">
        Cargando tienda...
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bizly-cream text-black/40">
        Esta tienda no existe o fue movida.
      </div>
    );
  }

  const accent = business.primaryColor || '#2E8B00';
  const categoryLabel = BUSINESS_CATEGORIES.find((c) => c.value === business.category)?.label;
  const featured = filteredProducts.filter((p) => p.featured);
  const rest = filteredProducts.filter((p) => !p.featured);
  const showBranding = !getPlanFeatures(business).removeBranding;
  const template = getStoreTemplate(business);

  return (
    <div className="min-h-screen bg-bizly-cream pb-24">
      {/* Nav superior */}
      <nav className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {business.logoUrl && (
              <img src={business.logoUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
            )}
            <span className="font-heading font-semibold text-sm truncate">{business.name}</span>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-white px-3 py-1.5 rounded-full shrink-0"
            style={{ backgroundColor: accent }}
          >
            🛒 {cartCount}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div id="inicio" className="relative">
        {business.coverUrl ? (
          <div className="w-full h-48 sm:h-72 bg-black/10">
            <img src={business.coverUrl} alt="Portada" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        ) : (
          <div className="w-full h-28 sm:h-36" style={{ background: `linear-gradient(135deg, ${accent}, #111)` }} />
        )}

        <div className="max-w-5xl mx-auto px-6">
          <div className={`flex flex-col items-center text-center ${business.coverUrl ? '-mt-14' : '-mt-10'}`}>
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={business.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg bg-white"
              />
            ) : (
              <div
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg text-white flex items-center justify-center font-heading text-3xl font-bold"
                style={{ backgroundColor: accent }}
              >
                {business.name.charAt(0).toUpperCase()}
              </div>
            )}

            <h1 className="font-heading text-3xl font-bold mt-4">{business.name}</h1>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-2 text-xs text-black/50">
              {categoryLabel && <span className="px-2.5 py-1 rounded-full bg-black/5">{categoryLabel}</span>}
              {business.location && <span className="px-2.5 py-1 rounded-full bg-black/5">📍 {business.location}</span>}
              {template.showSchedule && business.schedule && (
                <span className="px-2.5 py-1 rounded-full bg-black/5">🕒 {business.schedule}</span>
              )}
            </div>

            {business.description && <p className="text-black/60 mt-3 max-w-md">{business.description}</p>}

            {(business.socialLinks?.instagram || business.socialLinks?.facebook) && (
              <div className="flex gap-3 mt-3 text-xs">
                {business.socialLinks?.instagram && (
                  <a
                    href={`https://instagram.com/${business.socialLinks.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-black/50"
                  >
                    📷 Instagram
                  </a>
                )}
                {business.socialLinks?.facebook && (
                  <a href={business.socialLinks.facebook} target="_blank" rel="noreferrer" className="text-black/50">
                    📘 Facebook
                  </a>
                )}
              </div>
            )}

            <a
              href={`https://wa.me/${business.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              id="contacto"
              className="inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-full text-white text-sm font-semibold shadow-sm"
              style={{ backgroundColor: accent }}
            >
              {template.ctaLabel}
            </a>
          </div>
        </div>
      </div>

      {/* Buscador + orden */}
      <div id="catalogo" className="max-w-5xl mx-auto px-6 pt-8 flex flex-col sm:flex-row gap-3 scroll-mt-16">
        <input
          type="text"
          placeholder={`Buscar en ${template.catalogSectionLabel.toLowerCase()}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-full border bg-white text-sm focus:outline-none"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="px-4 py-2.5 rounded-full border bg-white text-sm"
        >
          <option value="relevancia">Relevancia</option>
          <option value="nuevo">Más nuevos</option>
          <option value="precio_asc">Precio: menor a mayor</option>
          <option value="precio_desc">Precio: mayor a menor</option>
        </select>
      </div>

      {/* Categorías visuales */}
      {categories.length > 1 && (
        <div className="max-w-5xl mx-auto px-6 pt-6">
          <p className="text-xs text-black/40 mb-2 font-medium">Explora por categoría</p>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setActiveCategory(null)}
              className="shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-2xl border text-xs font-medium"
              style={
                !activeCategory
                  ? { backgroundColor: accent, color: 'white', borderColor: accent }
                  : { color: 'rgba(0,0,0,0.6)', borderColor: 'rgba(0,0,0,0.1)', backgroundColor: 'white' }
              }
            >
              <span className="text-lg">🗂️</span>
              Todo
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-2xl border text-xs font-medium px-1 text-center"
                style={
                  activeCategory === cat
                    ? { backgroundColor: accent, color: 'white', borderColor: accent }
                    : { color: 'rgba(0,0,0,0.6)', borderColor: 'rgba(0,0,0,0.1)', backgroundColor: 'white' }
                }
              >
                <span className="text-lg">🏷️</span>
                <span className="truncate w-full">{cat}</span>
                <span className="text-[10px] opacity-70">
                  {products.filter((p) => p.category === cat).length}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-6 py-8">
        {products.length === 0 ? (
          <p className="text-center text-black/40 py-16">{template.emptyStateLabel}</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-center text-black/40 py-16">No encontramos productos con esa búsqueda.</p>
        ) : (
          <div className="space-y-10">
            {featured.length > 0 && (
              <section>
                <h2 className="font-heading text-lg font-semibold mb-4">⭐ Destacados</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {featured.map((p) => (
                    <ProductCard key={p.id} product={p} onAdd={addToCart} template={template} accent={accent} highlight />
                  ))}
                </div>
              </section>
            )}
            <section>
              <h2 className="font-heading text-lg font-semibold mb-4">{template.catalogSectionLabel}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {rest.map((p) => (
                  <ProductCard key={p.id} product={p} onAdd={addToCart} template={template} accent={accent} />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      <footer className="text-center py-8 border-t mt-4">
        <p className="font-heading font-semibold text-sm">{business.name}</p>
        {business.location && <p className="text-xs text-black/40 mt-1">📍 {business.location}</p>}
        <a
          href={`https://wa.me/${business.whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium mt-1 inline-block"
          style={{ color: accent }}
        >
          💬 {business.whatsapp}
        </a>
        {showBranding && <p className="text-xs text-black/30 mt-4">Creado con Bizly Store</p>}
      </footer>

      {/* Carrito lateral */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="relative bg-white w-full max-w-sm h-full flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-heading font-semibold">Tu pedido</h3>
              <button onClick={() => setCartOpen(false)} className="text-black/40 text-xl leading-none">
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {cart.length === 0 ? (
                <p className="text-sm text-black/40 text-center py-10">Todavía no agregas productos.</p>
              ) : (
                cart.map((i) => (
                  <div key={i.product.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="truncate">{i.product.name}</p>
                      <p className="text-xs text-black/40">${i.product.price} MXN</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button onClick={() => updateQuantity(i.product.id, -1)} className="w-6 h-6 rounded-full bg-black/5">
                        −
                      </button>
                      <span>{i.quantity}</span>
                      <button onClick={() => updateQuantity(i.product.id, 1)} className="w-6 h-6 rounded-full bg-black/5">
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t px-5 py-4 space-y-3">
                <div className="flex items-center justify-between font-semibold text-sm">
                  <span>Total</span>
                  <span>${total} MXN</span>
                </div>
                <input
                  type="text"
                  placeholder="Tu nombre"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                />
                <input
                  type="tel"
                  placeholder="Tu teléfono (opcional)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                />
                {orderError && <p className="text-xs text-red-600">{orderError}</p>}
                <button
                  onClick={sendOrder}
                  disabled={sendingOrder}
                  className="w-full py-3 rounded-full text-white text-sm font-semibold disabled:opacity-60"
                  style={{ backgroundColor: accent }}
                >
                  {sendingOrder ? 'Enviando...' : 'Finalizar pedido por WhatsApp'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navegación inferior estilo app (solo móvil) */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t flex sm:hidden">
        <button onClick={() => scrollTo('inicio')} className="flex-1 py-3 text-center text-xs text-black/60">
          🏠<br />Inicio
        </button>
        <button onClick={() => scrollTo('catalogo')} className="flex-1 py-3 text-center text-xs text-black/60">
          🗂️<br />Catálogo
        </button>
        <button onClick={() => setCartOpen(true)} className="flex-1 py-3 text-center text-xs text-black/60 relative">
          🛒<br />Carrito
          {cartCount > 0 && (
            <span
              className="absolute top-1 right-1/3 text-[10px] text-white rounded-full w-4 h-4 flex items-center justify-center"
              style={{ backgroundColor: accent }}
            >
              {cartCount}
            </span>
          )}
        </button>
        <a
          href={`https://wa.me/${business.whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className="flex-1 py-3 text-center text-xs text-black/60"
        >
          💬<br />Contacto
        </a>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  onAdd,
  template,
  accent,
  highlight = false,
}: {
  product: Product;
  onAdd: (p: Product) => void;
  template: ReturnType<typeof getStoreTemplate>;
  accent: string;
  highlight?: boolean;
}) {
  return (
    <div
      className="bg-white rounded-2xl shadow-sm overflow-hidden transition hover:shadow-md hover:-translate-y-0.5"
      style={highlight ? { boxShadow: `0 0 0 1px ${accent}55` } : undefined}
    >
      <div className="relative aspect-square bg-black/5 flex items-center justify-center text-black/20 text-xs">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          'Sin imagen'
        )}
        {template.showBadges && product.badge && (
          <span
            className="absolute top-2 left-2 text-white text-[10px] font-semibold px-2 py-1 rounded-full"
            style={{ backgroundColor: accent }}
          >
            {PRODUCT_BADGE_LABELS[product.badge]}
          </span>
        )}
        {product.featured && !product.badge && (
          <span
            className="absolute top-2 left-2 text-white text-[10px] font-semibold px-2 py-1 rounded-full"
            style={{ backgroundColor: accent }}
          >
            Destacado
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="font-medium">{product.name}</p>
        {template.showBrandModel && (product.brand || product.model) && (
          <p className="text-xs text-black/40 mt-0.5">
            {[product.brand, product.model].filter(Boolean).join(' · ')}
          </p>
        )}
        {product.description && <p className="text-xs text-black/50 mt-1 line-clamp-2">{product.description}</p>}
        <div className="flex items-center justify-between mt-3">
          <span className="font-semibold" style={{ color: accent }}>
            ${product.price} MXN
          </span>
          <button
            onClick={() => onAdd(product)}
            className="px-3 py-1.5 rounded-full bg-bizly-dark text-white text-xs font-medium"
          >
            {template.addButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
