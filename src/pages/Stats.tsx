import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import DashboardNav from '../components/DashboardNav';
import LockedFeature from '../components/LockedFeature';
import { getPlanFeatures, PLAN_FEATURES } from '../config/plans';
import { AnalyticsEvent, Order, Product } from '../types';

const DAYS_TO_SHOW = 14;

export default function Stats() {
  const { business, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && !business) navigate('/onboarding');
  }, [authLoading, business, navigate]);

  useEffect(() => {
    async function load() {
      if (!business) return;
      const [ordersSnap, eventsSnap, productsSnap] = await Promise.all([
        getDocs(query(collection(db, 'orders'), where('businessId', '==', business.id))),
        getDocs(query(collection(db, 'events'), where('businessId', '==', business.id))),
        getDocs(query(collection(db, 'products'), where('businessId', '==', business.id))),
      ]);
      setOrders(ordersSnap.docs.map((d) => ({ ...(d.data() as Order), id: d.id })));
      setEvents(eventsSnap.docs.map((d) => ({ ...(d.data() as AnalyticsEvent), id: d.id })));
      setProducts(productsSnap.docs.map((d) => d.data() as Product));
      setLoadingData(false);
    }
    load();
  }, [business]);

  if (authLoading || !business) {
    return <div className="min-h-screen flex items-center justify-center text-black/50">Cargando...</div>;
  }

  const hasAccess = getPlanFeatures(business).advancedStats;

  return (
    <div className="min-h-screen bg-bizly-cream">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="font-heading font-bold">{business.name}</h1>
        <button onClick={logout} className="text-sm text-black/50">
          Cerrar sesión
        </button>
      </header>

      <DashboardNav active="estadisticas" />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="font-heading text-lg font-semibold mb-1">Estadísticas</h2>
        <p className="text-xs text-black/40 mb-6">
          Datos reales de tu tienda desde que se activó este panel. Las visitas y vistas de
          producto empezaron a contarse a partir de esta actualización — no hay datos de
          antes.
        </p>

        {!hasAccess ? (
          <LockedFeature
            requiredPlanLabel={PLAN_FEATURES.emprendedor.label}
            message="Las estadísticas avanzadas están disponibles desde el plan Emprendedor."
          />
        ) : loadingData ? (
          <p className="text-black/40">Cargando estadísticas...</p>
        ) : (
          <StatsContent orders={orders} events={events} products={products} />
        )}
      </main>
    </div>
  );
}

function StatsContent({
  orders,
  events,
  products,
}: {
  orders: Order[];
  events: AnalyticsEvent[];
  products: Product[];
}) {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

  const storeViews30d = events.filter((e) => e.type === 'store_view' && e.createdAt >= thirtyDaysAgo).length;
  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => o.status === 'completado');
  const completedSales = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(orders.reduce((s, o) => s + o.total, 0) / totalOrders) : 0;
  const conversionRate = storeViews30d > 0 ? Math.min(100, Math.round((totalOrders / storeViews30d) * 100)) : null;

  // Ventas por día, últimos 14 días
  const dayBuckets: { label: string; total: number }[] = [];
  for (let i = DAYS_TO_SHOW - 1; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const total = orders
      .filter((o) => o.createdAt >= dayStart.getTime() && o.createdAt < dayEnd.getTime())
      .reduce((s, o) => s + o.total, 0);
    dayBuckets.push({
      label: dayStart.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }),
      total,
    });
  }
  const maxDayTotal = Math.max(1, ...dayBuckets.map((d) => d.total));

  // Productos más vendidos (por cantidad, sumando todos los pedidos no cancelados)
  const soldQuantities: Record<string, { name: string; quantity: number }> = {};
  orders
    .filter((o) => o.status !== 'cancelado')
    .forEach((o) => {
      o.items.forEach((item) => {
        if (!soldQuantities[item.productId]) soldQuantities[item.productId] = { name: item.name, quantity: 0 };
        soldQuantities[item.productId].quantity += item.quantity;
      });
    });
  const topSelling = Object.values(soldQuantities)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Productos más vistos
  const viewCounts: Record<string, number> = {};
  events
    .filter((e) => e.type === 'product_view' && e.productId)
    .forEach((e) => {
      viewCounts[e.productId!] = (viewCounts[e.productId!] || 0) + 1;
    });
  const topViewed = Object.entries(viewCounts)
    .map(([productId, count]) => ({
      name: products.find((p) => p.id === productId)?.name || 'Producto eliminado',
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <MetricCard label="Visitas (30 días)" value={storeViews30d} />
        <MetricCard label="Pedidos totales" value={totalOrders} />
        <MetricCard label="Ticket promedio" value={`$${avgOrderValue}`} />
        <MetricCard label="Ventas completadas" value={`$${completedSales}`} />
      </div>

      {conversionRate !== null && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-xs text-black/40 mb-1">Tasa de conversión aproximada</p>
          <p className="text-2xl font-bold text-bizly-dark">{conversionRate}%</p>
          <p className="text-[11px] text-black/30 mt-1">
            Pedidos ÷ visitas de los últimos 30 días. Es aproximada porque una misma persona
            puede visitar varias veces sin contarse por separado.
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-5">
        <h3 className="text-sm font-semibold mb-4">Ventas de los últimos {DAYS_TO_SHOW} días</h3>
        <div className="flex items-end gap-1.5 h-32">
          {dayBuckets.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
              <div
                className="w-full bg-bizly-green rounded-t"
                style={{ height: `${(d.total / maxDayTotal) * 100}%`, minHeight: d.total > 0 ? '4px' : '0px' }}
                title={`${d.label}: $${d.total} MXN`}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-1.5 mt-2">
          {dayBuckets.map((d, i) => (
            <div key={i} className="flex-1 text-center">
              {i % 3 === 0 && <span className="text-[9px] text-black/30">{d.label.split(' ')[0]}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-3">🏆 Productos más vendidos</h3>
          {topSelling.length === 0 ? (
            <p className="text-xs text-black/40">Todavía no hay ventas registradas.</p>
          ) : (
            <div className="space-y-2">
              {topSelling.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate">{p.name}</span>
                  <span className="text-black/40 text-xs shrink-0">{p.quantity} vendidos</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-3">👀 Productos más vistos</h3>
          {topViewed.length === 0 ? (
            <p className="text-xs text-black/40">Todavía no hay vistas registradas.</p>
          ) : (
            <div className="space-y-2">
              {topViewed.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate">{p.name}</span>
                  <span className="text-black/40 text-xs shrink-0">{p.count} vistas</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <p className="text-xs text-black/40">{label}</p>
      <p className="text-xl font-bold text-bizly-dark mt-1">{value}</p>
    </div>
  );
}
