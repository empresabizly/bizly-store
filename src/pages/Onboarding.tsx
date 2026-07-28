import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { BUSINESS_CATEGORIES, Business } from '../types';

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export default function Onboarding() {
  const { user, refreshBusiness } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [category, setCategory] = useState(BUSINESS_CATEGORIES[0].value);
  const [description, setDescription] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError('');
    setLoading(true);

    try {
      const slug = slugify(name);
      const business: Business = {
        id: slug,
        ownerId: user.uid,
        name,
        slug,
        category,
        description,
        whatsapp,
        location,
        theme: 'minimalista',
        plan: 'gratis',
        createdAt: Date.now(),
      };
      // Cada negocio vive en su propio documento con id = slug
      await setDoc(doc(db, 'businesses', slug), business);
      await refreshBusiness();
      navigate('/dashboard');
    } catch (err) {
      setError('No se pudo crear tu negocio. Intenta con otro nombre.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bizly-cream flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm p-8">
        <h1 className="font-heading text-xl font-bold">Creemos tu tienda en minutos</h1>
        <p className="text-sm text-black/50 mt-1">Paso 1 de 1 — Información del negocio</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre del negocio</label>
            <input
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Boutique Luna"
              required
            />
            {name && (
              <p className="text-xs text-black/40 mt-1">
                Tu tienda estará en: bizly.store/{slugify(name)}
              </p>
            )}
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
              placeholder="Cuéntanos qué vendes"
            />
          </div>

          <div>
            <label className="text-sm font-medium">WhatsApp (con código de país)</label>
            <input
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="523312345678"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Ubicación (opcional)</label>
            <input
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Guadalajara, Jalisco"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-bizly-green text-white font-semibold disabled:opacity-60"
          >
            {loading ? 'Creando tienda...' : 'Crear mi tienda'}
          </button>
        </form>
      </div>
    </div>
  );
}
