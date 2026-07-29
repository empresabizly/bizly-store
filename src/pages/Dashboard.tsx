import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { Product } from '../types';
import { getPlanFeatures } from '../config/plans';
import DashboardNav from '../components/DashboardNav';

export default function Dashboard() {
  const { user, business, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    if (!authLoading && user && !business) {
      navigate('/onboarding');
    }
  }, [authLoading, user, business, navigate]);

  useEffect(() => {
    async function load() {
      if (!business) return;
      const q = query(collection(db, 'products'), where('businessId', '==', business.id));
      const snap = await getDocs(q);
      setProducts(snap.docs.map((d) => d.data() as Product));
      setLoadingProducts(false);
    }
    load();
  }, [business]);

  async function handleDelete(productId: string) {
    if (!confirm('¿Eliminar este producto?')) return;
    await deleteDoc(doc(db, 'products', productId));
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  }

  if (authLoading || !business) {
    return <div className="min-h-screen flex items-center justify-center text-black/50">Cargando...</div>;
  }

  const planFeatures = getPlanFeatures(business);
  const atLimit = products.length >= planFeatures.maxProducts;

  return (
    <div className="min-h-screen bg-bizly-cream">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Bizly Store" className="h-6 w-auto opacity-70" />
          <div>
            <h1 className="font-heading font-bold">{business.name}</h1>
            <a
              href={`/tienda/${business.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-bizly-green"
            >
              bizly.store/{business.slug} ↗
            </a>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={logout} className="text-sm text-black/50">
            Cerrar sesión
          </button>
        </div>
      </header>

      <DashboardNav active="productos" />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-heading text-lg font-semibold">📦 Productos</h2>
            <p className="text-xs text-black/40">
              {products.length} / {planFeatures.maxProducts === Infinity ? 'ilimitados' : `${planFeatures.maxProducts} (plan ${planFeatures.label})`}
            </p>
          </div>
          <Link
            to="/dashboard/productos/nuevo"
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              atLimit ? 'bg-black/10 text-black/40 pointer-events-none' : 'bg-bizly-green text-white'
            }`}
          >
            + Nuevo producto
          </Link>
        </div>

        {atLimit && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
            Alcanzaste el límite de {planFeatures.maxProducts} productos del plan {planFeatures.label}. Sube de plan para agregar más.
          </p>
        )}

        {loadingProducts ? (
          <p className="text-black/40">Cargando productos...</p>
        ) : products.length === 0 ? (
          <div className="text-center py-16 text-black/40">
            <p>Todavía no tienes productos.</p>
            <Link to="/dashboard/productos/nuevo" className="text-bizly-green font-medium">
              Agrega tu primer producto
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {products.map((p) => (
              <div key={p.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="aspect-square bg-black/5 flex items-center justify-center text-black/20 text-xs">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    'Sin imagen'
                  )}
                </div>
                <div className="p-3">
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <p className="text-bizly-green font-semibold text-sm">${p.price} MXN</p>
                  <p className="text-xs text-black/40 mt-1">{p.available ? 'Disponible' : 'Agotado'}</p>
                  <div className="flex gap-3 mt-2 text-xs">
                    <Link to={`/dashboard/productos/${p.id}`} className="text-bizly-green">
                      Editar
                    </Link>
                    <button onClick={() => handleDelete(p.id)} className="text-red-500">
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
