import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { BUSINESS_CATEGORIES } from '../types';
import LogoUploader from '../components/LogoUploader';
import CoverUploader from '../components/CoverUploader';
import LockedFeature from '../components/LockedFeature';
import DashboardNav from '../components/DashboardNav';
import { getPlanFeatures, PLAN_FEATURES, PLAN_ORDER } from '../config/plans';

export default function Settings() {
  const { business, refreshBusiness } = useAuth();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [location, setLocation] = useState('');
  const [schedule, setSchedule] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#2E8B00');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!business) return;
    setName(business.name);
    setCategory(business.category);
    setDescription(business.description);
    setWhatsapp(business.whatsapp);
    setLocation(business.location || '');
    setSchedule(business.schedule || '');
    setPrimaryColor(business.primaryColor || '#2E8B00');
    setInstagram(business.socialLinks?.instagram || '');
    setFacebook(business.socialLinks?.facebook || '');
  }, [business]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!business) return;
    setSaving(true);
    setSaved(false);
    await updateDoc(doc(db, 'businesses', business.id), {
      name,
      category,
      description,
      whatsapp,
      location,
      schedule,
      primaryColor,
      socialLinks: { instagram, facebook },
    });
    await refreshBusiness();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (!business) {
    return <div className="min-h-screen flex items-center justify-center text-black/40">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-bizly-cream">
      <header className="bg-white border-b px-6 py-4">
        <h1 className="font-heading font-bold">{business.name}</h1>
      </header>

      <DashboardNav active="configuracion" />

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-heading text-sm font-semibold mb-3">🏪 Logo</h2>
          <LogoUploader />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-heading text-sm font-semibold mb-1">🖼️ Portada de tu tienda</h2>
          <p className="text-xs text-black/40 mb-3">
            Se muestra como banner arriba de tu catálogo público.
          </p>
          {getPlanFeatures(business).customCover ? (
            <CoverUploader />
          ) : (
            <LockedFeature
              requiredPlanLabel={PLAN_FEATURES.basico.label}
              message="Personaliza la portada de tu tienda desde el plan Básico."
            />
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-heading text-sm font-semibold mb-3">💳 Tu plan</h2>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold">{getPlanFeatures(business).label}</p>
              <p className="text-xs text-black/40">{getPlanFeatures(business).price}</p>
            </div>
            <Link to="/#planes" className="text-xs text-bizly-green font-medium">
              Ver todos los planes
            </Link>
          </div>
          <div className="space-y-2 text-sm">
            {PLAN_ORDER.map((p) => (
              <div
                key={p}
                className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                  p === business.plan ? 'bg-bizly-green/10 border border-bizly-green' : 'bg-black/[0.02]'
                }`}
              >
                <span className={p === business.plan ? 'font-semibold' : ''}>{PLAN_FEATURES[p].label}</span>
                <span className="text-xs text-black/40">{PLAN_FEATURES[p].price}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-black/30 mt-3">
            El cobro real de planes todavía no está activo — por ahora, contáctanos para cambiar tu plan manualmente.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <h2 className="font-heading text-sm font-semibold">📋 Información del negocio</h2>

          <div>
            <label className="text-sm font-medium">Nombre del negocio</label>
            <input
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <p className="text-xs text-black/30 mt-1">
              Tu enlace sigue siendo bizly.store/{business.slug} (no cambia aunque edites el nombre).
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Categoría</label>
            <select
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green bg-white"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {BUSINESS_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Descripción</label>
            <textarea
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">WhatsApp (con código de país)</label>
            <input
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Ubicación</label>
            <input
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Horario de atención (opcional)</label>
            <input
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="Ej. Lun-Sáb 9am-8pm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Color de marca</label>
            <div className="flex items-center gap-3 mt-1">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-12 h-10 rounded-lg border cursor-pointer"
              />
              <span className="text-xs text-black/40">
                Se usa en los botones y acentos de tu tienda pública.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Instagram (opcional)</label>
              <input
                className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@tu_negocio"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Facebook (opcional)</label>
              <input
                className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="URL de tu página"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-full bg-bizly-green text-white font-semibold disabled:opacity-60"
          >
            {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
          </button>
        </form>
      </main>
    </div>
  );
}
