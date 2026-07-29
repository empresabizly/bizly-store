import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getBusinessBySlug } from '../context/AuthContext';
import { Business, Product, CartItem, BUSINESS_CATEGORIES, OrderItem } from '../types';
import { getPlanFeatures } from '../config/plans';

export default function Store() {
  const { slug } = useParams();
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);
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
    setShowCart(true);
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  const total = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  async function sendOrder() {
    if (!business || cart.length === 0) return;
    if (!customerName.trim()) {
      setOrderError('Escribe tu nombre para enviar el pedido.');
      setShowCart(true);
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
      // Si falla el guardado, igual dejamos que el pedido se mande por
      // WhatsApp — lo importante para el cliente es que su pedido llegue.
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

  function scrollToCategory(cat: string) {
    setActiveCategory(cat);
    const el = document.getElementById(`cat-${cat}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

  const categoryLabel = BUSINESS_CATEGORIES.find((c) => c.value === business.category)?.label;
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  const featured = products.filter((p) => p.featured);
  const showBranding = !getPlanFeatures(business).removeBranding;

  return (
    <div className="min-h-screen bg-bizly-cream pb-28">
      {/* Nav superior fija */}
      <nav className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {business.logoUrl && (
              <img src={business.logoUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
            )}
            <span className="font-heading font-semibold text-sm truncate">{business.name}</span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={() => setShowCart((s) => !s)}
              className="flex items-center gap-1.5 text-sm font-medium bg-bizly-dark text-white px-3 py-1.5 rounded-full shrink-0"
            >
              🛒 {cart.reduce((n, i) => n + i.quantity, 0)}
            </button>
          )}
        </div>
      </nav>

      {/* Hero / portada */}
      <div className="relative">
        {business.coverUrl ? (
          <div className="w-full h-48 sm:h-72 bg-black/10">
            <img src={business.coverUrl} alt="Portada" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        ) : (
          <div className="w-full h-28 sm:h-36 bg-gradient-to-br from-bizly-dark to-black/80" />
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
              <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-bizly-dark text-white flex items-center justify-center font-heading text-3xl font-bold">
                {business.name.charAt(0).toUpperCase()}
              </div>
            )}

            <h1 className="font-heading text-3xl font-bold mt-4">{business.name}</h1>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-2 text-xs text-black/50">
              {categoryLabel && (
                <span className="px-2.5 py-1 rounded-full bg-black/5">{categoryLabel}</span>
              )}
              {business.location && <span className="px-2.5 py-1 rounded-full bg-black/5">📍 {business.location}</span>}
            </div>

            {business.description && (
              <p className="text-black/60 mt-3 max-w-md">{business.description}</p>
            )}

            <a
              href={`https://wa.me/${business.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-full bg-bizly-green text-white text-sm font-semibold shadow-sm"
            >
              💬 Escribir por WhatsApp
            </a>
          </div>
        </div>
      </div>

      {/* Categorías (navegación rápida) */}
      {categories.length > 1 && (
        <div className="sticky top-[49px] z-20 bg-bizly-cream/95 backdrop-blur border-b">
          <div className="max-w-5xl mx-auto px-6 py-3 flex gap-2 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => scrollToCategory(cat)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border transition ${
                  activeCategory === cat
                    ? 'bg-bizly-dark text-white border-bizly-dark'
                    : 'bg-white text-black/60 border-black/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-6 py-10">
        {products.length === 0 ? (
          <p className="text-center text-black/40 py-16">Esta tienda todavía no tiene productos.</p>
        ) : (
          <div className="space-y-12">
            {featured.length > 0 && (
              <section>
                <h2 className="font-heading text-lg font-semibold mb-4">⭐ Destacados</h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {featured.map((p) => (
                    <ProductCard key={p.id} product={p} onAdd={addToCart} highlight />
                  ))}
                </div>
              </section>
            )}

            {categories.length > 0
              ? categories.map((cat) => (
                  <section key={cat} id={`cat-${cat}`} className="scroll-mt-32">
                    <h2 className="font-heading text-lg font-semibold mb-4">{cat}</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {products
                        .filter((p) => p.category === cat)
                        .map((p) => (
                          <ProductCard key={p.id} product={p} onAdd={addToCart} />
                        ))}
                    </div>
                  </section>
                ))
              : products.filter((p) => !p.featured).length > 0 && (
                  <section>
                    <h2 className="font-heading text-lg font-semibold mb-4">Catálogo</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {products
                        .filter((p) => !p.featured)
                        .map((p) => (
                          <ProductCard key={p.id} product={p} onAdd={addToCart} />
                        ))}
                    </div>
                  </section>
                )}
          </div>
        )}
      </main>

      {/* Barra de carrito flotante */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t shadow-lg z-40">
          {showCart && (
            <div className="max-w-5xl mx-auto px-6 py-4 max-h-80 overflow-y-auto space-y-4">
              <div className="space-y-3">
                {cart.map((i) => (
                  <div key={i.product.id} className="flex items-center justify-between text-sm">
                    <span>{i.product.name}</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => updateQuantity(i.product.id, -1)} className="w-6 h-6 rounded-full bg-black/5">
                        −
                      </button>
                      <span>{i.quantity}</span>
                      <button onClick={() => updateQuantity(i.product.id, 1)} className="w-6 h-6 rounded-full bg-black/5">
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-2">
                <input
                  type="text"
                  placeholder="Tu nombre"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bizly-green"
                />
                <input
                  type="tel"
                  placeholder="Tu teléfono (opcional)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bizly-green"
                />
                {orderError && <p className="text-xs text-red-600">{orderError}</p>}
              </div>
            </div>
          )}
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <button onClick={() => setShowCart((s) => !s)} className="text-sm font-medium">
              🛒 {cart.reduce((n, i) => n + i.quantity, 0)} productos · ${total} MXN
            </button>
            <button
              onClick={sendOrder}
              disabled={sendingOrder}
              className="px-5 py-2.5 rounded-full bg-bizly-green text-white text-sm font-semibold disabled:opacity-60"
            >
              {sendingOrder ? 'Enviando...' : 'Enviar pedido por WhatsApp'}
            </button>
          </div>
        </div>
      )}

      <footer className="text-center py-8 border-t mt-4">
        <p className="font-heading font-semibold text-sm">{business.name}</p>
        {business.location && <p className="text-xs text-black/40 mt-1">📍 {business.location}</p>}
        <a
          href={`https://wa.me/${business.whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-bizly-green font-medium mt-1 inline-block"
        >
          💬 {business.whatsapp}
        </a>
        {showBranding && (
          <p className="text-xs text-black/30 mt-4">Creado con Bizly Store</p>
        )}
      </footer>
    </div>
  );
}

function ProductCard({
  product,
  onAdd,
  highlight = false,
}: {
  product: Product;
  onAdd: (p: Product) => void;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm overflow-hidden transition hover:shadow-md ${
        highlight ? 'ring-1 ring-bizly-green/40' : ''
      }`}
    >
      <div className="relative aspect-square bg-black/5 flex items-center justify-center text-black/20 text-xs">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          'Sin imagen'
        )}
        {product.featured && (
          <span className="absolute top-2 left-2 bg-bizly-green text-white text-[10px] font-semibold px-2 py-1 rounded-full">
            Destacado
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="font-medium">{product.name}</p>
        {product.description && (
          <p className="text-xs text-black/50 mt-1 line-clamp-2">{product.description}</p>
        )}
        <div className="flex items-center justify-between mt-3">
          <span className="font-semibold text-bizly-green">${product.price} MXN</span>
          <button
            onClick={() => onAdd(product)}
            className="px-3 py-1.5 rounded-full bg-bizly-dark text-white text-xs font-medium"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
