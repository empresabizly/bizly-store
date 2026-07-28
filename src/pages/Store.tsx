import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getBusinessBySlug } from '../context/AuthContext';
import { Business, Product, CartItem } from '../types';

export default function Store() {
  const { slug } = useParams();
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCart, setShowCart] = useState(false);

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

  function sendOrder() {
    if (!business || cart.length === 0) return;
    const lines = cart.map((i) => `- ${i.product.name} x${i.quantity}: $${i.product.price * i.quantity} MXN`);
    const message = [
      `Hola, quiero realizar este pedido en ${business.name}:`,
      '',
      ...lines,
      '',
      `Total: $${total} MXN`,
      '',
      'Gracias.',
    ].join('\n');
    const url = `https://wa.me/${business.whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-black/40">Cargando tienda...</div>;
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center text-black/40">
        Esta tienda no existe o fue movida.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bizly-cream pb-24">
      {/* Portada minimalista */}
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-6 py-10 text-center">
          <h1 className="font-heading text-2xl font-bold">{business.name}</h1>
          {business.description && <p className="text-black/50 mt-2">{business.description}</p>}
          {business.location && <p className="text-xs text-black/30 mt-2">📍 {business.location}</p>}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {products.length === 0 ? (
          <p className="text-center text-black/40 py-16">Esta tienda todavía no tiene productos.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {products.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="aspect-square bg-black/5 flex items-center justify-center text-black/20 text-xs">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    'Sin imagen'
                  )}
                </div>
                <div className="p-4">
                  <p className="font-medium">{p.name}</p>
                  {p.description && <p className="text-xs text-black/50 mt-1 line-clamp-2">{p.description}</p>}
                  <div className="flex items-center justify-between mt-3">
                    <span className="font-semibold text-bizly-green">${p.price} MXN</span>
                    <button
                      onClick={() => addToCart(p)}
                      className="px-3 py-1.5 rounded-full bg-bizly-dark text-white text-xs font-medium"
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Barra de carrito flotante */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t shadow-lg">
          {showCart && (
            <div className="max-w-3xl mx-auto px-6 py-4 max-h-64 overflow-y-auto space-y-3">
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
          )}
          <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
            <button onClick={() => setShowCart((s) => !s)} className="text-sm font-medium">
              🛒 {cart.reduce((n, i) => n + i.quantity, 0)} productos · ${total} MXN
            </button>
            <button
              onClick={sendOrder}
              className="px-5 py-2.5 rounded-full bg-bizly-green text-white text-sm font-semibold"
            >
              Enviar pedido por WhatsApp
            </button>
          </div>
        </div>
      )}

      <footer className="text-center text-xs text-black/30 py-6">
        Creado con Bizly Store
      </footer>
    </div>
  );
}
