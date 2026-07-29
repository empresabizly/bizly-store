import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import DashboardNav from '../components/DashboardNav';
import { Order, OrderStatus, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../types';

export default function Orders() {
  const { business, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [filter, setFilter] = useState<OrderStatus | 'todos'>('todos');

  useEffect(() => {
    if (!authLoading && !business) navigate('/onboarding');
  }, [authLoading, business, navigate]);

  useEffect(() => {
    async function load() {
      if (!business) return;
      try {
        const q = query(
          collection(db, 'orders'),
          where('businessId', '==', business.id),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        setOrders(snap.docs.map((d) => ({ ...(d.data() as Order), id: d.id })));
      } catch {
        // Si el índice compuesto todavía no existe en Firestore, reintenta sin orderBy
        const q = query(collection(db, 'orders'), where('businessId', '==', business.id));
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ ...(d.data() as Order), id: d.id }));
        list.sort((a, b) => b.createdAt - a.createdAt);
        setOrders(list);
      }
      setLoadingOrders(false);
    }
    load();
  }, [business]);

  async function changeStatus(orderId: string, status: OrderStatus) {
    await updateDoc(doc(db, 'orders', orderId), { status });
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
  }

  if (authLoading || !business) {
    return <div className="min-h-screen flex items-center justify-center text-black/50">Cargando...</div>;
  }

  const newCount = orders.filter((o) => o.status === 'nuevo').length;
  const totalSales = orders
    .filter((o) => o.status === 'completado')
    .reduce((sum, o) => sum + o.total, 0);
  const filteredOrders = filter === 'todos' ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="min-h-screen bg-bizly-cream">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
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
        <button onClick={logout} className="text-sm text-black/50">
          Cerrar sesión
        </button>
      </header>

      <DashboardNav active="pedidos" />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs text-black/40">Pedidos nuevos</p>
            <p className="text-2xl font-bold text-bizly-dark mt-1">{newCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-xs text-black/40">Total de pedidos</p>
            <p className="text-2xl font-bold text-bizly-dark mt-1">{orders.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 col-span-2 sm:col-span-1">
            <p className="text-xs text-black/40">Ventas completadas</p>
            <p className="text-2xl font-bold text-bizly-green mt-1">${totalSales} MXN</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
          {(['todos', 'nuevo', 'confirmado', 'completado', 'cancelado'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border ${
                filter === f ? 'bg-bizly-dark text-white border-bizly-dark' : 'bg-white text-black/50 border-black/10'
              }`}
            >
              {f === 'todos' ? 'Todos' : ORDER_STATUS_LABELS[f]}
            </button>
          ))}
        </div>

        {loadingOrders ? (
          <p className="text-black/40">Cargando pedidos...</p>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-black/40">
            <p>Todavía no tienes pedidos {filter !== 'todos' ? `en estado "${ORDER_STATUS_LABELS[filter as OrderStatus]}"` : ''}.</p>
            <p className="text-xs mt-1">Los pedidos aparecen aquí cuando un cliente compra desde tu tienda pública.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{order.customerName}</p>
                    {order.customerPhone && (
                      <a
                        href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-bizly-green"
                      >
                        {order.customerPhone}
                      </a>
                    )}
                    <p className="text-xs text-black/30 mt-1">
                      {new Date(order.createdAt).toLocaleString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${ORDER_STATUS_COLORS[order.status]}`}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </span>
                </div>

                <div className="mt-3 border-t pt-3 space-y-1">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-black/60">
                      <span>
                        {item.name} x{item.quantity}
                      </span>
                      <span>${item.price * item.quantity} MXN</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <span className="font-semibold">Total: ${order.total} MXN</span>
                  <select
                    value={order.status}
                    onChange={(e) => changeStatus(order.id, e.target.value as OrderStatus)}
                    className="text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-bizly-green"
                  >
                    {(['nuevo', 'confirmado', 'completado', 'cancelado'] as const).map((s) => (
                      <option key={s} value={s}>
                        {ORDER_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
