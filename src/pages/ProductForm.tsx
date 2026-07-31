import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import { Product, ProductBadge, PRODUCT_BADGE_LABELS, Category } from '../types';
import ProductImageUploader from '../components/ProductImageUploader';
import { CloudinaryUploadResult } from '../cloudinary/upload';
import { deleteCloudinaryImage } from '../cloudinary/deleteImage';

export default function ProductForm() {
  const { business } = useAuth();
  const navigate = useNavigate();
  const { productId } = useParams();
  const isEditing = productId && productId !== 'nuevo';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [badge, setBadge] = useState<ProductBadge | ''>('');
  const [stock, setStock] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageCloudinaryId, setImageCloudinaryId] = useState('');
  const [imageCreatedAt, setImageCreatedAt] = useState<number | undefined>(undefined);
  const [available, setAvailable] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [businessCategories, setBusinessCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function loadCategories() {
      if (!business) return;
      const q = query(collection(db, 'categories'), where('businessId', '==', business.id));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => d.data() as Category);
      list.sort((a, b) => a.createdAt - b.createdAt);
      setBusinessCategories(list);
    }
    loadCategories();
  }, [business]);

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
        setBrand(p.brand || '');
        setModel(p.model || '');
        setBadge(p.badge || '');
        setStock(p.stock !== undefined ? String(p.stock) : '');
        setImageUrl(p.imageUrl || '');
        setImageCloudinaryId(p.imageCloudinaryId || '');
        setImageCreatedAt(p.imageCreatedAt);
        setAvailable(p.available);
        setFeatured(p.featured);
      }
    }
    load();
  }, [isEditing, productId]);

  function handleImageUploaded(result: CloudinaryUploadResult) {
    if (imageCloudinaryId && imageCloudinaryId !== result.cloudinaryId) {
      deleteCloudinaryImage(imageCloudinaryId);
    }
    setImageUrl(result.url);
    setImageCloudinaryId(result.cloudinaryId);
    setImageCreatedAt(Date.now());
  }

  function handleImageRemoved() {
    deleteCloudinaryImage(imageCloudinaryId);
    setImageUrl('');
    setImageCloudinaryId('');
    setImageCreatedAt(undefined);
  }

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
      ...(brand ? { brand } : {}),
      ...(model ? { model } : {}),
      ...(badge ? { badge } : {}),
      ...(stock !== '' ? { stock: Number(stock) } : {}),
      ...(imageUrl ? { imageUrl } : {}),
      ...(imageCloudinaryId ? { imageCloudinaryId } : {}),
      ...(imageCreatedAt ? { imageCreatedAt } : {}),
    };

    await setDoc(doc(db, 'products', id), product);
    setLoading(false);
    navigate('/dashboard/productos');
  }

  return (
    <div className="min-h-screen bg-bizly-cream flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm p-8">
        <Link to="/dashboard/productos" className="text-sm text-black/40">
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
              <label className="text-sm font-medium">Inventario (opcional)</label>
              <input
                type="number"
                min="0"
                className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="Sin límite"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Categoría</label>
            {businessCategories.length > 0 ? (
              <select
                className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green bg-white"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Sin categoría</option>
                {businessCategories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
                {category && !businessCategories.some((c) => c.name === category) && (
                  <option value={category}>{category} (ya no existe, elige otra)</option>
                )}
              </select>
            ) : (
              <>
                <input
                  className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ej. Ropa"
                />
                <p className="text-xs text-black/30 mt-1">
                  Tip: crea tus categorías desde el panel (con su propio ícono) en{' '}
                  <Link to="/dashboard/categorias" className="text-bizly-green font-medium">
                    Categorías
                  </Link>{' '}
                  y aquí podrás elegirlas de una lista.
                </p>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Marca (opcional)</label>
              <input
                className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ej. Samsung"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Modelo (opcional)</label>
              <input
                className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Ej. Galaxy A54"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Etiqueta (opcional)</label>
            <select
              className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green bg-white"
              value={badge}
              onChange={(e) => setBadge(e.target.value as ProductBadge | '')}
            >
              <option value="">Sin etiqueta</option>
              {(Object.keys(PRODUCT_BADGE_LABELS) as ProductBadge[]).map((b) => (
                <option key={b} value={b}>
                  {PRODUCT_BADGE_LABELS[b]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Foto del producto</label>
            <ProductImageUploader
              currentImageUrl={imageUrl}
              onUploaded={handleImageUploaded}
              onRemoved={handleImageRemoved}
            />
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
