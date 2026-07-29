import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { Product } from '../types';

export default function ProductForm() {
  const { business } = useAuth();
  const navigate = useNavigate();
  const { productId } = useParams();
  const isEditing = productId && productId !== 'nuevo';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [available, setAvailable] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      if (!isEditing || !productId) return;
      const snap = await getDoc(doc(db, 'products', productId));
      if (snap.exists()) {
        const p = snap.data() as Product;
        setName(p.name);
        setDescription(p.description);
        setPrice(String(p.price));
        setCategory(p.category);
        setImageUrl(p.imageUrl || '');
        setAvailable(p.available);
        setFeatured(p.featured);
      }
    }
    load();
  }, [isEditing, productId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!business) return;
    setLoading(true);

    const id = isEditing && productId ? productId : `${business.id}-${Date.now()}`;
    const product: Product = {
      id,
      businessId: business.id,
      name,
      description,
      price: Number(price),
      category,
      available,
      featured,
      createdAt: Date.now(),
      ...(imageUrl ? { imageUrl } : {}),
    };

    await setDoc(doc(db, 'products', id), product);
    setLoading(false);
    navigate('/dashboard');
  }

  return (
    <div className="min-h-screen bg-bizly-cream flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm p-8">
        <Link to="/dashboard" className="text-sm text-black/40">
          ← Volver
        </Link>
        <h1 className="font-heading text-xl font-bold mt-2">
          {isEditing ? 'Editar producto' : 'Nuevo producto'}
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre</label>
            <input
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Playera Premium"
              required
            />
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Precio (MXN)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Categoría</label>
              <input
                className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ej. Ropa"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">URL de imagen (opcional)</label>
            <input
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
            />
            <p className="text-xs text-black/40 mt-1">
              La subida directa de fotos requiere activar Firebase Storage (plan Blaze).
            </p>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
              Disponible
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
              Producto destacado
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full bg-bizly-green text-white font-semibold disabled:opacity-60"
          >
            {loading ? 'Guardando...' : 'Guardar producto'}
          </button>
        </form>
      </div>
    </div>
  );
}
