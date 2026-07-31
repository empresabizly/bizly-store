import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import DashboardNav from '../components/DashboardNav';
import { Coupon } from '../types';

export default function Coupons() {
  const { business, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [code, setCode] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !business) navigate('/onboarding');
  }, [authLoading, business, navigate]);

  useEffect(() => {
    async function load() {
      if (!business) return;
      const q = query(collection(db, 'coupons'), where('businessId', '==', business.id));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => d.data() as Coupon);
      list.sort((a, b) => b.createdAt - a.createdAt);
      setCoupons(list);
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-heading text-lg font-semibold">Cupones</h2>
            <p className="text-xs text-black/40">
              Códigos de descuento reales que tus clientes aplican al pagar desde tu tienda.
            </p>
          </div>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="px-4 py-2 rounded-full bg-bizly-green text-white text-sm font-semibold shrink-0"
          >
            {showForm ? 'Cancelar' : '+ Nuevo cupón'}
          </button>
        </div>

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
      </main>
    </div>
  );
}
