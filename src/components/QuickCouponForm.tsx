import { FormEvent, useEffect, useState } from 'react';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Coupon } from '../types';

/**
 * Mini formulario de cupón para usarse dentro de otras pantallas (como
 * Nuevo producto) — evita que el usuario tenga que salir a la pestaña
 * Cupones solo para crear uno rápido mientras está subiendo productos.
 * Escribe en la misma colección 'coupons' que usa la página completa.
 */
export default function QuickCouponForm({ businessId }: { businessId: string }) {
  const [open, setOpen] = useState(false);
  const [existing, setExisting] = useState<Coupon[]>([]);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!open) return;
    async function load() {
      const q = query(collection(db, 'coupons'), where('businessId', '==', businessId));
      const snap = await getDocs(q);
      setExisting(snap.docs.map((d) => d.data() as Coupon));
    }
    load();
  }, [open, businessId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      setError('Escribe un código.');
      return;
    }
    if (existing.some((c) => c.code === normalizedCode)) {
      setError('Ya tienes un cupón con ese código.');
      return;
    }
    const numericValue = Number(value);
    if (!numericValue || numericValue <= 0 || (type === 'percentage' && numericValue > 100)) {
      setError('Revisa el valor del descuento.');
      return;
    }

    setSaving(true);
    const id = `${businessId}-${Date.now()}`;
    const coupon: Coupon = {
      id,
      businessId,
      code: normalizedCode,
      type,
      value: numericValue,
      usageCount: 0,
      active: true,
      createdAt: Date.now(),
    };
    await setDoc(doc(db, 'coupons', id), coupon);
    setExisting((prev) => [...prev, coupon]);
    setCode('');
    setValue('');
    setSaving(false);
    setSuccess(`Cupón ${normalizedCode} creado.`);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between text-sm font-medium"
      >
        <span>🎟️ ¿Quieres crear un cupón de descuento también?</span>
        <span className="text-black/40">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-4">
          {existing.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {existing.map((c) => (
                <span
                  key={c.id}
                  className={`text-[11px] font-mono px-2 py-1 rounded-full ${
                    c.active ? 'bg-bizly-green/10 text-bizly-green' : 'bg-black/5 text-black/30'
                  }`}
                >
                  {c.code} ({c.type === 'percentage' ? `${c.value}%` : `$${c.value}`})
                </span>
              ))}
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                className="px-3 py-2 border rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-bizly-green"
                placeholder="Código, ej. VERANO10"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <select
                className="px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-bizly-green"
                value={type}
                onChange={(e) => setType(e.target.value as 'percentage' | 'fixed')}
              >
                <option value="percentage">Porcentaje (%)</option>
                <option value="fixed">Monto fijo (MXN)</option>
              </select>
            </div>
            <input
              type="number"
              min="0"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-bizly-green"
              placeholder={type === 'percentage' ? 'Valor, ej. 10' : 'Valor en MXN, ej. 50'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            {success && <p className="text-xs text-bizly-green">{success}</p>}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 rounded-full bg-bizly-dark text-white text-sm font-medium disabled:opacity-60"
            >
              {saving ? 'Creando...' : '+ Crear cupón'}
            </button>
            <p className="text-[11px] text-black/30 text-center">
              Para más opciones (compra mínima, límite de usos, expiración) ve a la pestaña 🎟️ Cupones.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
