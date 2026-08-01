import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import DashboardNav from '../components/DashboardNav';
import { Coupon, Order } from '../types';
import * as XLSX from 'xlsx';

type Tab = 'cupones' | 'vendedores';

export default function Coupons() {
  const { business, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<Tab>('cupones');

  const [code, setCode] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [commissionPercent, setCommissionPercent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !business) navigate('/onboarding');
  }, [authLoading, business, navigate]);

  useEffect(() => {
    async function load() {
      if (!business) return;
      const [couponsSnap, ordersSnap] = await Promise.all([
        getDocs(query(collection(db, 'coupons'), where('businessId', '==', business.id))),
        getDocs(query(collection(db, 'orders'), where('businessId', '==', business.id))),
      ]);
      const list = couponsSnap.docs.map((d) => d.data() as Coupon);
      list.sort((a, b) => b.createdAt - a.createdAt);
      setCoupons(list);
      setOrders(ordersSnap.docs.map((d) => ({ ...(d.data() as Order), id: d.id })));
      setLoadingCoupons(false);
    }
    load();
  }, [business]);

  function resetForm() {
    setCode('');
    setType('percentage');
    setValue('');
    setMinOrderAmount('');
    setExpiresAt('');
    setUsageLimit('');
    setSellerName('');
    setCommissionPercent('');
    setError('');
    setShowForm(false);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!business) return;
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      setError('Escribe un código.');
      return;
    }
    if (coupons.some((c) => c.code === normalizedCode)) {
      setError('Ya tienes un cupón con ese código.');
      return;
    }
    const numericValue = Number(value);
    if (!numericValue || numericValue <= 0) {
      setError('El valor del descuento debe ser mayor a 0.');
      return;
    }
    if (type === 'percentage' && numericValue > 100) {
      setError('Un porcentaje no puede ser mayor a 100.');
      return;
    }

    setSaving(true);
    const id = `${business.id}-${Date.now()}`;
    const coupon: Coupon = {
      id,
      businessId: business.id,
      code: normalizedCode,
      type,
      value: numericValue,
      usageCount: 0,
      active: true,
      createdAt: Date.now(),
      ...(minOrderAmount ? { minOrderAmount: Number(minOrderAmount) } : {}),
      ...(expiresAt ? { expiresAt: new Date(expiresAt).getTime() } : {}),
      ...(usageLimit ? { usageLimit: Number(usageLimit) } : {}),
      ...(sellerName.trim() ? { sellerName: sellerName.trim() } : {}),
      ...(commissionPercent ? { commissionPercent: Number(commissionPercent) } : {}),
    };
    await setDoc(doc(db, 'coupons', id), coupon);
    setCoupons((prev) => [coupon, ...prev]);
    setSaving(false);
    resetForm();
  }

  async function toggleActive(coupon: Coupon) {
    await updateDoc(doc(db, 'coupons', coupon.id), { active: !coupon.active });
    setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? { ...c, active: !c.active } : c)));
  }

  async function handleDelete(couponId: string) {
    if (!confirm('¿Eliminar este cupón? Ya no se podrá usar.')) return;
    await deleteDoc(doc(db, 'coupons', couponId));
    setCoupons((prev) => prev.filter((c) => c.id !== couponId));
  }

  // Ventas reales generadas por cada cupón (a partir de pedidos completados
  // que usaron ese código), para poder calcular cuánto pagarle a cada vendedor.
  function sellerStats() {
    return coupons
      .filter((c) => c.sellerName)
      .map((c) => {
        const relatedOrders = orders.filter((o) => o.couponCode === c.code && o.status !== 'cancelado');
        const completedOrders = relatedOrders.filter((o) => o.status === 'completado');
        const totalSales = completedOrders.reduce((sum, o) => sum + o.total, 0);
        const commission = c.commissionPercent ? Math.round((totalSales * c.commissionPercent) / 100) : 0;
        return {
          sellerName: c.sellerName!,
          code: c.code,
          ordersCount: relatedOrders.length,
          completedCount: completedOrders.length,
          totalSales,
          commissionPercent: c.commissionPercent || 0,
          commission,
        };
      });
  }

  function exportToExcel() {
    const stats = sellerStats();
    const rows = stats.map((s) => ({
      Vendedor: s.sellerName,
      'Código de cupón': s.code,
      'Pedidos totales': s.ordersCount,
      'Pedidos completados': s.completedCount,
      'Ventas completadas (MXN)': s.totalSales,
      'Comisión (%)': s.commissionPercent,
      'A pagar (MXN)': s.commission,
    }));

    const totalRow = {
      Vendedor: 'TOTAL',
      'Código de cupón': '',
      'Pedidos totales': stats.reduce((s, r) => s + r.ordersCount, 0),
      'Pedidos completados': stats.reduce((s, r) => s + r.completedCount, 0),
      'Ventas completadas (MXN)': stats.reduce((s, r) => s + r.totalSales, 0),
      'Comisión (%)': '',
      'A pagar (MXN)': stats.reduce((s, r) => s + r.commission, 0),
    };

    const worksheet = XLSX.utils.json_to_sheet([...rows, totalRow]);
    worksheet['!cols'] = [
      { wch: 20 }, // Vendedor
      { wch: 16 }, // Código
      { wch: 14 }, // Pedidos totales
      { wch: 18 }, // Pedidos completados
      { wch: 22 }, // Ventas
      { wch: 12 }, // Comisión %
      { wch: 14 }, // A pagar
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendedores');

    const dateLabel = new Date().toLocaleDateString('es-MX').replace(/\//g, '-');
    XLSX.writeFile(workbook, `${business?.name || 'bizly'}-vendedores-${dateLabel}.xlsx`);
  }

  if (authLoading || !business) {
    return <div className="min-h-screen flex items-center justify-center text-black/50">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-bizly-cream">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="font-heading font-bold">{business.name}</h1>
        <button onClick={logout} className="text-sm text-black/50">
          Cerrar sesión
        </button>
      </header>

      <DashboardNav active="cupones" />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-heading text-lg font-semibold">Cupones</h2>
            <p className="text-xs text-black/40">
              Códigos de descuento reales que tus clientes aplican al pagar desde tu tienda.
            </p>
          </div>
          {tab === 'cupones' && (
            <button
              onClick={() => setShowForm((s) => !s)}
              className="px-4 py-2 rounded-full bg-bizly-green text-white text-sm font-semibold shrink-0"
            >
              {showForm ? 'Cancelar' : '+ Nuevo cupón'}
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('cupones')}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              tab === 'cupones' ? 'bg-bizly-dark text-white' : 'bg-white text-black/50 border border-black/10'
            }`}
          >
            🎟️ Cupones
          </button>
          <button
            onClick={() => setTab('vendedores')}
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              tab === 'vendedores' ? 'bg-bizly-dark text-white' : 'bg-white text-black/50 border border-black/10'
            }`}
          >
            👤 Panel de vendedores
          </button>
        </div>

        {tab === 'cupones' && (
          <>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-5 mb-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-black/50">Código</label>
                <input
                  className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green uppercase"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ej. VERANO10"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-black/50">Tipo de descuento</label>
                <select
                  className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green bg-white"
                  value={type}
                  onChange={(e) => setType(e.target.value as 'percentage' | 'fixed')}
                >
                  <option value="percentage">Porcentaje (%)</option>
                  <option value="fixed">Monto fijo (MXN)</option>
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-black/50">
                  Valor {type === 'percentage' ? '(%)' : '(MXN)'}
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={type === 'percentage' ? 'Ej. 10' : 'Ej. 50'}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-black/50">Compra mínima (opcional)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(e.target.value)}
                  placeholder="Sin mínimo"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-black/50">Límite de usos (opcional)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  placeholder="Sin límite"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-black/50">Expira (opcional)</label>
              <input
                type="date"
                className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>

            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-black/60 mb-2">
                Vendedor (opcional) — para llevar el control de comisiones
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-black/50">Nombre del vendedor</label>
                  <input
                    className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    placeholder="Ej. Ana Torres"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-black/50">Comisión (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(e.target.value)}
                    placeholder="Ej. 10"
                  />
                </div>
              </div>
              <p className="text-[11px] text-black/30 mt-1">
                Si asignas un vendedor, este cupón aparece en el "Panel de vendedores" con sus
                ventas y comisión calculada automáticamente.
              </p>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-full bg-bizly-green text-white font-semibold disabled:opacity-60"
            >
              {saving ? 'Creando...' : 'Crear cupón'}
            </button>
          </form>
        )}

        {loadingCoupons ? (
          <p className="text-black/40">Cargando cupones...</p>
        ) : coupons.length === 0 ? (
          <p className="text-center text-black/40 py-10">Todavía no tienes cupones. Crea el primero arriba.</p>
        ) : (
          <div className="space-y-3">
            {coupons.map((c) => {
              const expired = c.expiresAt && c.expiresAt < Date.now();
              const exhausted = c.usageLimit !== undefined && c.usageCount >= c.usageLimit;
              return (
                <div key={c.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-mono font-bold text-sm">{c.code}</p>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          c.active && !expired && !exhausted
                            ? 'bg-green-100 text-green-700'
                            : 'bg-black/5 text-black/40'
                        }`}
                      >
                        {!c.active ? 'Inactivo' : expired ? 'Expirado' : exhausted ? 'Agotado' : 'Activo'}
                      </span>
                    </div>
                    <p className="text-xs text-black/50 mt-1">
                      {c.type === 'percentage' ? `${c.value}% de descuento` : `$${c.value} MXN de descuento`}
                      {c.minOrderAmount ? ` · compra mínima $${c.minOrderAmount}` : ''}
                    </p>
                    <p className="text-[11px] text-black/30 mt-0.5">
                      Usado {c.usageCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''} veces
                      {c.expiresAt ? ` · expira ${new Date(c.expiresAt).toLocaleDateString('es-MX')}` : ''}
                    </p>
                    {c.sellerName && (
                      <p className="text-[11px] text-bizly-green font-medium mt-0.5">
                        👤 {c.sellerName}{c.commissionPercent ? ` · ${c.commissionPercent}% comisión` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs">
                    <button onClick={() => toggleActive(c)} className="text-bizly-green font-medium">
                      {c.active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="text-red-500 font-medium">
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </>
        )}

        {tab === 'vendedores' && (
          <VendorsPanel stats={sellerStats()} onExport={exportToExcel} />
        )}

      </main>
    </div>
  );
}

interface SellerStat {
  sellerName: string;
  code: string;
  ordersCount: number;
  completedCount: number;
  totalSales: number;
  commissionPercent: number;
  commission: number;
}

function VendorsPanel({ stats, onExport }: { stats: SellerStat[]; onExport: () => void }) {
  const totalSales = stats.reduce((s, r) => s + r.totalSales, 0);
  const totalCommission = stats.reduce((s, r) => s + r.commission, 0);

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-black/40">Ventas totales por vendedores</p>
          <p className="text-2xl font-bold text-bizly-dark mt-1">${totalSales} MXN</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-black/40">Total a pagar en comisiones</p>
          <p className="text-2xl font-bold text-bizly-green mt-1">${totalCommission} MXN</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-black/40">
          Cada vendedor se identifica por el cupón que le asignaste con su nombre.
        </p>
        <button
          onClick={onExport}
          disabled={stats.length === 0}
          className="px-4 py-2 rounded-full bg-bizly-dark text-white text-xs font-semibold disabled:opacity-40 shrink-0"
        >
          📊 Descargar Excel
        </button>
      </div>

      {stats.length === 0 ? (
        <div className="text-center py-16 text-black/40 bg-white rounded-xl shadow-sm">
          <p>Todavía no tienes cupones asignados a un vendedor.</p>
          <p className="text-xs mt-1">
            Ve a la pestaña "🎟️ Cupones" → crea uno → llena el campo "Nombre del vendedor".
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-5 gap-2 px-4 py-3 bg-black/[0.03] text-[11px] font-semibold text-black/50">
            <span>Vendedor</span>
            <span>Cupón</span>
            <span className="text-right">Pedidos</span>
            <span className="text-right">Ventas</span>
            <span className="text-right">A pagar</span>
          </div>
          {stats.map((s, i) => (
            <div
              key={i}
              className={`grid grid-cols-5 gap-2 px-4 py-3 text-sm items-center ${i % 2 === 1 ? 'bg-black/[0.015]' : ''}`}
            >
              <span className="font-medium truncate">{s.sellerName}</span>
              <span className="font-mono text-xs text-black/50">{s.code}</span>
              <span className="text-right text-xs text-black/50">
                {s.completedCount}/{s.ordersCount}
              </span>
              <span className="text-right">${s.totalSales}</span>
              <span className="text-right font-semibold text-bizly-green">${s.commission}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
