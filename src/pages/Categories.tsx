import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../context/AuthContext';
import DashboardNav from '../components/DashboardNav';
import { Category } from '../types';
import { validateImageFile, validateImageLoads, uploadToCloudinary, CloudinaryUploadResult } from '../cloudinary/upload';

export default function Categories() {
  const { user, business, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !business) navigate('/onboarding');
  }, [authLoading, business, navigate]);

  useEffect(() => {
    async function load() {
      if (!business) return;
      const q = query(collection(db, 'categories'), where('businessId', '==', business.id));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => d.data() as Category);
      list.sort((a, b) => a.createdAt - b.createdAt);
      setCategories(list);
      setLoadingCategories(false);
    }
    load();
  }, [business]);

  async function handleCreate() {
    if (!business || !newName.trim()) return;
    setSaving(true);
    const id = `${business.id}-${Date.now()}`;
    const category: Category = {
      id,
      businessId: business.id,
      name: newName.trim(),
      createdAt: Date.now(),
    };
    await setDoc(doc(db, 'categories', id), category);
    setCategories((prev) => [...prev, category]);
    setNewName('');
    setSaving(false);
  }

  async function handleDelete(categoryId: string) {
    if (!confirm('¿Eliminar esta categoría? Los productos que la usan no se borran, solo dejarán de mostrarla.')) return;
    await deleteDoc(doc(db, 'categories', categoryId));
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
  }

  async function handleImageUploaded(categoryId: string, result: CloudinaryUploadResult) {
    await updateDoc(doc(db, 'categories', categoryId), {
      imageUrl: result.url,
      cloudinaryId: result.cloudinaryId,
    });
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, imageUrl: result.url, cloudinaryId: result.cloudinaryId } : c))
    );
  }

  async function handleImageRemoved(categoryId: string) {
    await updateDoc(doc(db, 'categories', categoryId), {
      imageUrl: deleteField(),
      cloudinaryId: deleteField(),
    });
    setCategories((prev) => prev.map((c) => (c.id === categoryId ? { ...c, imageUrl: undefined } : c)));
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

      <DashboardNav active="categorias" />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <h2 className="font-heading text-lg font-semibold mb-1">Categorías</h2>
        <p className="text-xs text-black/40 mb-6">
          Crea las categorías de tu negocio (ej. Perfumes, Celulares, Relojes) con su propio
          ícono. Al crear o editar un producto, elige una de estas categorías — así se
          mantienen consistentes y aparecen bien organizadas en tu tienda pública.
        </p>

        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <h3 className="text-sm font-semibold mb-3">Nueva categoría</h3>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="text-xs font-medium text-black/50">Nombre</label>
              <input
                className="w-full mt-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-bizly-green"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej. Perfumes"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={saving || !newName.trim()}
              className="px-5 py-2 rounded-full bg-bizly-green text-white text-sm font-semibold disabled:opacity-50 shrink-0"
            >
              {saving ? 'Creando...' : '+ Crear categoría'}
            </button>
          </div>
        </div>

        {loadingCategories ? (
          <p className="text-black/40">Cargando categorías...</p>
        ) : categories.length === 0 ? (
          <p className="text-center text-black/40 py-10">
            Todavía no tienes categorías. Crea la primera arriba.
          </p>
        ) : (
          <div className="space-y-4">
            {categories.map((cat) => (
              <CategoryRow
                key={cat.id}
                category={cat}
                userId={user?.uid || ''}
                onUploaded={(r) => handleImageUploaded(cat.id, r)}
                onRemoved={() => handleImageRemoved(cat.id)}
                onDelete={() => handleDelete(cat.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CategoryRow({
  category,
  userId,
  onUploaded,
  onRemoved,
  onDelete,
}: {
  category: Category;
  userId: string;
  onUploaded: (result: CloudinaryUploadResult) => void;
  onRemoved: () => void;
  onDelete: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setError('');

    const basicCheck = validateImageFile(file);
    if (!basicCheck.valid) {
      setError(basicCheck.error || 'Archivo inválido.');
      return;
    }
    const loadCheck = await validateImageLoads(file);
    if (!loadCheck.valid) {
      setError(loadCheck.error || 'Archivo inválido.');
      return;
    }

    setUploading(true);
    try {
      const result = await uploadToCloudinary(file, userId, 'categories');
      onUploaded(result);
    } catch (err: any) {
      setError(err.message || 'No se pudo subir la imagen.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
      <div className="relative w-14 h-14 rounded-full bg-black/5 overflow-hidden shrink-0 flex items-center justify-center text-black/20 text-[10px]">
        {uploading ? (
          <span className="text-[9px] text-black/40">Subiendo...</span>
        ) : category.imageUrl ? (
          <img src={category.imageUrl} alt={category.name} className="w-full h-full object-cover" />
        ) : (
          '🏷️'
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{category.name}</p>
        <div className="flex gap-3 mt-1 text-xs">
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} className="hidden" id={`cat-file-${category.id}`} />
          <label htmlFor={`cat-file-${category.id}`} className="text-bizly-green font-medium cursor-pointer">
            {category.imageUrl ? 'Cambiar ícono' : 'Subir ícono'}
          </label>
          {category.imageUrl && (
            <button onClick={onRemoved} className="text-black/40 font-medium">
              Quitar ícono
            </button>
          )}
        </div>
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>
      <button onClick={onDelete} className="text-red-500 text-xs font-medium shrink-0">
        Eliminar
      </button>
    </div>
  );
}
