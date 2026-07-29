import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import DashboardNav from '../components/DashboardNav';
import { Product, Order, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../types';
import { getPlanFeatures } from '../config/plans';

export default function DashboardHome() {
  const { business, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && !business) navigate('/onboarding');
  }, [authLoading, business, navigate]);

  useEffect(() => {
    async function load() {
      if (!business) return;
      const [productsSnap, ordersSnap] = await Promise.all([
        getDocs(query(collection(db, 'products'), where('businessId', '==', business.id))),
        getDocs(query(collection(db, 'orders'), where('businessId', '==', business.id))),
      ]);
      setProducts(productsSnap.docs.map((d) => d.data() as Product));
      const ordersList = ordersSnap.docs.map((d) => ({ ...(d.data() as Order), id: d.id }));
      ordersList.sort((a, b) => b.createdAt - a.createdAt);
      setOrders(ordersList);
      setLoadingData(false);
    }
    load();
  }, [business]);

  if (authLoading || !business) {
    return <div className="min-h-screen flex items-center justify-center text-black/50">Cargando...</div>;
  }

  const planFeatures = getPlanFeatures(business);
  const activeProducts = products.filter((p) => p.available).length;
  const outOfStock = products.filter((p) => p.stock !== undefined && p.stock <= 0).length;
  const newOrders = orders.filter((o) => o.status === 'nuevo').length;
  const completedSales = orders
    .filter((o) => o.status === 'completado')
    .reduce((sum, o) => sum + o.total, 0);
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="min-h-screen bg-bizly-cream">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Bizly Store" className="h-6 w-auto hidden sm:block" />
          {business.logoUrl && (
            <img src={business.logoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
          )}
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
        <button onClick={logout} className="text-sm text-black/50">
          Cerrar sesión
        </button>
      </header>

      <DashboardNav active="resumen" />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-heading text-lg font-semibold">Resumen de tu negocio</h2>
            <p className="text-xs text-black/40">Plan {planFeatures.label}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <MetricCard label="Pedidos nuevos" value={newOrders} accent="text-amber-600" />
          <MetricCard label="Ventas completadas" value={`$${completedSales}`} accent="text-bizly-green" />
          <MetricCard label="Productos activos" value={activeProducts} accent="text-bizly-dark" />
          <MetricCard label="Sin stock" value={outOfStock} accent="text-red-500" />
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Link
            to="/dashboard/productos/nuevo"
            className="bg-white rounded-xl shadow-sm p-4 text-center hover:shadow-md transition"
          >
            <span className="text-2xl">➕</span>
            <p className="text-sm font-medium mt-2">Agregar producto</p>
          </Link>
          <Link
            to="/dashboard/pedidos"
            className="bg-white rounded-xl shadow-sm p-4 text-center hover:shadow-md transition"
          >
            <span className="text-2xl">🛒</span>
            <p className="text-sm font-medium mt-2">Ver pedidos</p>
          </Link>
          <Link
            to="/dashboard/configuracion"
            className="bg-white rounded-xl shadow-sm p-4 text-center hover:shadow-md transition"
          >
            <span className="text-2xl">🎨</span>
            <p className="text-sm font-medium mt-2">Personalizar tienda</p>
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-sm font-semibold">Pedidos recientes</h3>
            <Link to="/dashboard/pedidos" className="text-xs text-bizly-green font-medium">
              Ver todos
            </Link>
          </div>

          {loadingData ? (
            <p className="text-sm text-black/40">Cargando...</p>
          ) : recentOrders.length === 0 ? (
            <p className="text-sm text-black/40 text-center py-6">
              Todavía no tienes pedidos. Comparte tu tienda para empezar a recibirlos.
            </p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{order.customerName}</p>
                    <p className="text-xs text-black/40">
                      {new Date(order.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>${order.total} MXN</span>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${ORDER_STATUS_COLORS[order.status]}`}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <p className="text-xs text-black/40">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent}`}>{value}</p>
    </div>
  );
}
