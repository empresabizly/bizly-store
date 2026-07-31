import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getBusinessBySlug } from '../context/AuthContext';
import {
  Business,
  Product,
  CartItem,
  BUSINESS_CATEGORIES,
  OrderItem,
  PRODUCT_BADGE_LABELS,
  Category,
  Coupon,
} from '../types';
import { getPlanFeatures } from '../config/plans';
import { getStoreEngine, getSectionOrder } from '../config/storeTemplates';
import { useFavorites } from '../utils/useFavorites';

type SortOption = 'relevancia' | 'precio_asc' | 'precio_desc' | 'nuevo';

function foodCategoryIcon(category: string) {
  const key = category.toLowerCase();
  if (key.includes('pastel') || key.includes('cake')) return '🍰';
  if (key.includes('cupcake')) return '🧁';
  if (key.includes('galleta') || key.includes('cookie')) return '🍪';
  if (key.includes('bebida') || key.includes('drink')) return '🥤';
  if (key.includes('promo')) return '🏷️';
  if (key.includes('individual')) return '🍨';
  return '🍽️';
}

export default function Store() {
  const { slug } = useParams();
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [businessCategories, setBusinessCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('relevancia');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [sendingOrder, setSendingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const { favorites, toggleFavorite, isFavorite } = useFavorites(business?.id || slug || 'tienda');

  useEffect(() => {
    async function load() {
      if (!slug) return;
      const b = await getBusinessBySlug(slug);
      setBusiness(b);
      if (b) {
        const q = query(collection(db, 'products'), where('businessId', '==', b.id), where('available', '==', true));
        const snap = await getDocs(q);
        setProducts(snap.docs.map((d) => d.data() as Product));

        const catQ = query(collection(db, 'categories'), where('businessId', '==', b.id));
        const catSnap = await getDocs(catQ);
        setBusinessCategories(catSnap.docs.map((d) => d.data() as Category));

        // Registro de visita, silencioso (si falla, no afecta la experiencia del cliente).
        addDoc(collection(db, 'events'), {
          businessId: b.id,
          type: 'store_view',
          createdAt: Date.now(),
        }).catch(() => {});
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  function openProductDetail(product: Product) {
    setSelectedProduct(product);
    if (business) {
      addDoc(collection(db, 'events'), {
        businessId: business.id,
        type: 'product_view',
        productId: product.id,
        createdAt: Date.now(),
      }).catch(() => {});
    }
  }

  function addToCart(product: Product, quantity = 1) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
        );
      }
      return [...prev, { product, quantity }];
    });
    setCartOpen(true);
    setSelectedProduct(null);
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  const subtotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const discountAmount = appliedCoupon
    ? appliedCoupon.type === 'percentage'
      ? Math.round((subtotal * appliedCoupon.value) / 100)
      : Math.min(appliedCoupon.value, subtotal)
    : 0;
  const total = Math.max(0, subtotal - discountAmount);
  const cartCount = cart.reduce((n, i) => n + i.quantity, 0);

  async function applyCoupon() {
    if (!business || !couponInput.trim()) return;
    setCouponError('');
    setCheckingCoupon(true);
    const normalizedCode = couponInput.trim().toUpperCase();

    try {
      const q = query(
        collection(db, 'coupons'),
        where('businessId', '==', business.id),
        where('code', '==', normalizedCode)
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setCouponError('Ese código no existe.');
        setCheckingCoupon(false);
        return;
      }
      const found = snap.docs[0].data() as Coupon;

      if (!found.active) {
        setCouponError('Este cupón ya no está activo.');
      } else if (found.expiresAt && found.expiresAt < Date.now()) {
        setCouponError('Este cupón ya expiró.');
      } else if (found.usageLimit !== undefined && found.usageCount >= found.usageLimit) {
        setCouponError('Este cupón ya alcanzó su límite de usos.');
      } else if (found.minOrderAmount && subtotal < found.minOrderAmount) {
        setCouponError(`Este cupón requiere una compra mínima de $${found.minOrderAmount} MXN.`);
      } else {
        setAppliedCoupon(found);
        setCouponInput('');
      }
    } catch {
      setCouponError('No se pudo validar el cupón. Intenta de nuevo.');
    }
    setCheckingCoupon(false);
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponError('');
  }

  async function sendOrder() {
    if (!business || cart.length === 0) return;
    if (!customerName.trim()) {
      setOrderError('Escribe tu nombre para enviar el pedido.');
      return;
    }
    setOrderError('');
    setSendingOrder(true);

    const items: OrderItem[] = cart.map((i) => ({
      productId: i.product.id,
      name: i.product.name,
      price: i.product.price,
      quantity: i.quantity,
    }));

    try {
      await addDoc(collection(db, 'orders'), {
        businessId: business.id,
        items,
        total,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || null,
        status: 'nuevo',
        createdAt: Date.now(),
        ...(appliedCoupon ? { couponCode: appliedCoupon.code, discountAmount } : {}),
      });
      if (appliedCoupon) {
        await updateDoc(doc(db, 'coupons', appliedCoupon.id), { usageCount: appliedCoupon.usageCount + 1 }).catch(
          () => {}
        );
      }
    } catch {
      // Si falla el guardado, igual dejamos que el pedido se mande por WhatsApp.
    }

    const lines = cart.map((i) => `- ${i.product.name} x${i.quantity}: $${i.product.price * i.quantity} MXN`);
    const message = [
      `Hola, soy ${customerName.trim()}. Quiero realizar este pedido en ${business.name}:`,
      '',
      ...lines,
      '',
      `Subtotal: $${subtotal} MXN`,
      ...(appliedCoupon ? [`Cupón ${appliedCoupon.code}: -$${discountAmount} MXN`] : []),
      `Total: $${total} MXN`,
      '',
      'Gracias.',
    ].join('\n');
    const url = `https://wa.me/${business.whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    setSendingOrder(false);
    setAppliedCoupon(null);
  }

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
    [products]
  );

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (activeCategory) list = list.filter((p) => p.category === activeCategory);
    if (showFavoritesOnly) list = list.filter((p) => favorites.includes(p.id));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      );
    }
    if (sort === 'precio_asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'precio_desc') list.sort((a, b) => b.price - a.price);
    else if (sort === 'nuevo') list.sort((a, b) => b.createdAt - a.createdAt);
    return list;
  }, [products, activeCategory, search, sort, showFavoritesOnly, favorites]);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function customCategoryIcon(categoryName: string): string | undefined {
    return businessCategories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase())?.imageUrl;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bizly-cream text-black/40">
        Cargando tienda...
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bizly-cream text-black/40">
        Esta tienda no existe o fue movida.
      </div>
    );
  }

  const accent = business.primaryColor || '#2E8B00';
  const categoryLabel = BUSINESS_CATEGORIES.find((c) => c.value === business.category)?.label;
  const featured = filteredProducts.filter((p) => p.featured);
  const rest = filteredProducts.filter((p) => !p.featured);
  const showBranding = !getPlanFeatures(business).removeBranding;
  const engine = getStoreEngine(business);
  const sectionOrder = getSectionOrder(business);
  const hiddenSections = business.hiddenSections || [];
  const buttonRadiusClass = engine.buttonRadius === 'full' ? 'rounded-full' : 'rounded-lg';
  const newArrivals = [...products].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4);
  const showNewArrivals = !activeCategory && !search.trim() && !showFavoritesOnly && sort === 'relevancia' && products.length >= 4;
  const promotions = filteredProducts.filter((p) => p.badge === 'promocion');

  return (
    <div className="min-h-screen bg-bizly-cream pb-24">
      {/* Nav superior */}
      <nav className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {business.logoUrl && (
              <img src={business.logoUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
            )}
            <span className="font-heading font-semibold text-sm truncate">{business.name}</span>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-white px-3 py-1.5 rounded-full shrink-0"
            style={{ backgroundColor: accent }}
          >
            🛒 {cartCount}
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div id="inicio" className="relative">
        {business.coverUrl ? (
          <div className="w-full h-32 sm:h-56 bg-black/10">
            <img src={business.coverUrl} alt="Portada" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full h-20 sm:h-28" style={{ background: `linear-gradient(135deg, ${accent}, #111)` }} />
        )}

        <div className="max-w-3xl mx-auto px-6">
          <div className="bg-white rounded-3xl shadow-lg -mt-8 sm:-mt-12 px-5 py-5 flex flex-col items-center text-center relative z-10">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={business.name}
                className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-md -mt-12 bg-white"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-full border-4 border-white shadow-md -mt-12 text-white flex items-center justify-center font-heading text-xl font-bold"
                style={{ backgroundColor: accent }}
              >
                {business.name.charAt(0).toUpperCase()}
              </div>
            )}

            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">{business.name}</h1>
            {business.tagline && (
              <p className="text-xs font-medium mt-0.5" style={{ color: accent }}>
                {business.tagline}
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-2 text-xs">
              {categoryLabel && (
                <span
                  className="px-2.5 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: `${accent}15`, color: accent }}
                >
                  {categoryLabel}
                </span>
              )}
              {business.location && (
                <span className="px-2.5 py-0.5 rounded-full bg-black/5 text-black/50 font-medium">
                  📍 {business.location}
                </span>
              )}
              {engine.showSchedule && business.schedule && (
                <span className="px-2.5 py-0.5 rounded-full bg-black/5 text-black/50 font-medium">
                  🕒 {business.schedule}
                </span>
              )}
            </div>

            {business.description && (
              <p className="text-black/55 mt-2 max-w-md text-xs leading-snug">{business.description}</p>
            )}

            {(business.socialLinks?.instagram || business.socialLinks?.facebook) && (
              <div className="flex gap-3 mt-2 text-xs">
                {business.socialLinks?.instagram && (
                  <a
                    href={`https://instagram.com/${business.socialLinks.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-black/45 font-medium"
                  >
                    📷 Instagram
                  </a>
                )}
                {business.socialLinks?.facebook && (
                  <a href={business.socialLinks.facebook} target="_blank" rel="noreferrer" className="text-black/45 font-medium">
                    📘 Facebook
                  </a>
                )}
              </div>
            )}

            <a
              href={`https://wa.me/${business.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              id="contacto"
              className={`inline-flex items-center gap-2 mt-3 px-6 py-2.5 ${buttonRadiusClass} text-white text-sm font-semibold shadow-md hover:opacity-90 transition`}
              style={{ backgroundColor: accent }}
            >
              {engine.ctaLabel}
            </a>
          </div>
        </div>
      </div>

      {/* Buscador + orden */}
      <div id="catalogo" className="max-w-3xl mx-auto px-6 pt-8 scroll-mt-16">
        <div className="bg-white rounded-2xl shadow-sm p-3 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder={`Buscar en ${engine.catalogSectionLabel.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-black/[0.03] text-sm focus:outline-none"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="px-4 py-2.5 rounded-xl bg-black/[0.03] text-sm"
          >
            <option value="relevancia">Relevancia</option>
            <option value="nuevo">Más nuevos</option>
            <option value="precio_asc">Precio: menor a mayor</option>
            <option value="precio_desc">Precio: mayor a menor</option>
          </select>
        </div>
      </div>

      {business.deliveryInfo && (
        <div className="max-w-3xl mx-auto px-6 pt-4">
          <div
            className="rounded-2xl px-4 py-3 text-sm font-medium flex items-center gap-2"
            style={{ backgroundColor: `${accent}12`, color: accent }}
          >
            🚚 {business.deliveryInfo}
          </div>
        </div>
      )}

      {/* Categorías visuales */}
      {categories.length >= 1 && (
        <div className="max-w-3xl mx-auto px-6 pt-6">
          <p className="text-xs text-black/40 mb-2 font-medium">Explora por categoría</p>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setActiveCategory(null)}
              className={
                engine.key === 'food'
                  ? 'shrink-0 flex flex-col items-center gap-1.5 w-16'
                  : 'shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-2xl border text-xs font-medium'
              }
              style={
                engine.key === 'food'
                  ? undefined
                  : !activeCategory
                  ? { backgroundColor: accent, color: 'white', borderColor: accent }
                  : { color: 'rgba(0,0,0,0.6)', borderColor: 'rgba(0,0,0,0.1)', backgroundColor: 'white' }
              }
            >
              {engine.key === 'food' ? (
                <>
                  <span
                    className="w-14 h-14 rounded-full flex items-center justify-center text-xl"
                    style={
                      !activeCategory
                        ? { backgroundColor: accent, color: 'white' }
                        : { backgroundColor: 'white', color: 'rgba(0,0,0,0.6)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                    }
                  >
                    🍽️
                  </span>
                  <span className="text-[11px] text-black/60 font-medium">Todo</span>
                </>
              ) : (
                <>
                  <span className="text-lg">🗂️</span>
                  Todo
                </>
              )}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={
                  engine.key === 'food'
                    ? 'shrink-0 flex flex-col items-center gap-1.5 w-16'
                    : 'shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-2xl border text-xs font-medium px-1 text-center'
                }
                style={
                  engine.key === 'food'
                    ? undefined
                    : activeCategory === cat
                    ? { backgroundColor: accent, color: 'white', borderColor: accent }
                    : { color: 'rgba(0,0,0,0.6)', borderColor: 'rgba(0,0,0,0.1)', backgroundColor: 'white' }
                }
              >
                {engine.key === 'food' ? (
                  <>
                    <span
                      className="w-14 h-14 rounded-full flex items-center justify-center text-xl overflow-hidden"
                      style={
                        activeCategory === cat
                          ? { backgroundColor: accent, color: 'white' }
                          : { backgroundColor: 'white', color: 'rgba(0,0,0,0.6)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                      }
                    >
                      {customCategoryIcon(cat) ? (
                        <img src={customCategoryIcon(cat)} alt={cat} className="w-full h-full object-cover" />
                      ) : (
                        foodCategoryIcon(cat)
                      )}
                    </span>
                    <span className="text-[11px] text-black/60 font-medium truncate w-full text-center">{cat}</span>
                  </>
                ) : (
                  <>
                    {customCategoryIcon(cat) ? (
                      <img src={customCategoryIcon(cat)} alt={cat} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <span className="text-lg">🏷️</span>
                    )}
                    <span className="truncate w-full">{cat}</span>
                    <span className="text-[10px] opacity-70">
                      {products.filter((p) => p.category === cat).length}
                    </span>
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-6 py-8">
        {showFavoritesOnly && (
          <div className="flex items-center justify-between mb-6 bg-white rounded-xl shadow-sm px-4 py-3">
            <span className="text-sm font-medium">❤️ Viendo tus favoritos</span>
            <button onClick={() => setShowFavoritesOnly(false)} className="text-xs font-medium" style={{ color: accent }}>
              Ver todo
            </button>
          </div>
        )}
        {products.length === 0 ? (
          <p className="text-center text-black/40 py-16">{engine.emptyStateLabel}</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-center text-black/40 py-16">
            {showFavoritesOnly ? 'Todavía no tienes favoritos guardados.' : 'No encontramos productos con esa búsqueda.'}
          </p>
        ) : (
          <div className="space-y-10">
            {sectionOrder.map((key) => {
              if (hiddenSections.includes(key) && key !== 'catalogo') return null;

              if (key === 'nuevos_lanzamientos' && showNewArrivals) {
                return (
                  <section key={key}>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-heading text-lg font-bold flex items-center gap-2">
                        <span className="w-1.5 h-5 rounded-full" style={{ backgroundColor: accent }} />
                        🆕 {engine.newArrivalsLabel}
                      </h2>
                      <button
                        onClick={() => scrollTo('catalogo')}
                        className="text-xs font-medium"
                        style={{ color: accent }}
                      >
                        Ver todo
                      </button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
                      {newArrivals.map((p) => (
                        <div key={p.id} className="w-40 shrink-0">
                          <ProductCard product={p} onAdd={addToCart} onOpenDetail={() => openProductDetail(p)} engine={engine} accent={accent} buttonRadiusClass={buttonRadiusClass} isFavorite={isFavorite(p.id)} onToggleFavorite={() => toggleFavorite(p.id)} />
                        </div>
                      ))}
                    </div>
                  </section>
                );
              }

              if (key === 'promociones' && promotions.length > 0) {
                return (
                  <section key={key}>
                    <div
                      className="rounded-2xl p-4 mb-4 flex items-center gap-2"
                      style={{ backgroundColor: `${accent}12` }}
                    >
                      <span className="text-xl">🏷️</span>
                      <h2 className="font-heading text-lg font-semibold" style={{ color: accent }}>
                        Promociones
                      </h2>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {promotions.map((p) => (
                        <ProductCard key={p.id} product={p} onAdd={addToCart} onOpenDetail={() => openProductDetail(p)} engine={engine} accent={accent} buttonRadiusClass={buttonRadiusClass} isFavorite={isFavorite(p.id)} onToggleFavorite={() => toggleFavorite(p.id)} highlight />
                      ))}
                    </div>
                  </section>
                );
              }

              if (key === 'destacados' && featured.length > 0) {
                return (
                  <section key={key}>
                    <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-5 rounded-full" style={{ backgroundColor: accent }} />
                      ⭐ Destacados
                    </h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {featured.map((p) => (
                        <ProductCard key={p.id} product={p} onAdd={addToCart} onOpenDetail={() => openProductDetail(p)} engine={engine} accent={accent} buttonRadiusClass={buttonRadiusClass} isFavorite={isFavorite(p.id)} onToggleFavorite={() => toggleFavorite(p.id)} highlight />
                      ))}
                    </div>
                  </section>
                );
              }

              if (key === 'catalogo') {
                return (
                  <section key={key}>
                    <h2 className="font-heading text-lg font-bold mb-4 flex items-center gap-2">
                      <span className="w-1.5 h-5 rounded-full" style={{ backgroundColor: accent }} />
                      {engine.catalogSectionLabel}
                    </h2>
                    {engine.key === 'business' && (
                      <div className="space-y-3">
                        {rest.map((p) => (
                          <ProductListRow key={p.id} product={p} onAdd={addToCart} onOpenDetail={() => openProductDetail(p)} engine={engine} accent={accent} buttonRadiusClass={buttonRadiusClass} isFavorite={isFavorite(p.id)} onToggleFavorite={() => toggleFavorite(p.id)} />
                        ))}
                      </div>
                    )}
                    {engine.key === 'restaurant' && (
                      <div className="space-y-6">
                        {(activeCategory ? [activeCategory] : categories.length > 0 ? categories : ['']).map((cat) => {
                          const items = rest.filter((p) => (cat ? p.category === cat : !p.category));
                          if (items.length === 0) return null;
                          return (
                            <div key={cat || 'sin-categoria'}>
                              {cat && <h3 className="text-sm font-semibold text-black/70 mb-2">{cat}</h3>}
                              <div className="space-y-3">
                                {items.map((p) => (
                                  <RestaurantMenuRow key={p.id} product={p} onAdd={addToCart} onOpenDetail={() => openProductDetail(p)} engine={engine} accent={accent} isFavorite={isFavorite(p.id)} onToggleFavorite={() => toggleFavorite(p.id)} />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {engine.key !== 'business' && engine.key !== 'restaurant' && (
                      <div className={`grid gap-5 ${engine.key === 'fashion' ? 'grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
                        {rest.map((p) => (
                          <ProductCard key={p.id} product={p} onAdd={addToCart} onOpenDetail={() => openProductDetail(p)} engine={engine} accent={accent} buttonRadiusClass={buttonRadiusClass} isFavorite={isFavorite(p.id)} onToggleFavorite={() => toggleFavorite(p.id)} />
                        ))}
                      </div>
                    )}
                  </section>
                );
              }

              return null;
            })}
          </div>
        )}
      </main>

      {business.aboutText && (
        <section className="max-w-3xl mx-auto px-6 pb-10">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-heading text-lg font-semibold mb-3">Sobre nosotros</h2>
            <p className="text-sm text-black/60 leading-relaxed whitespace-pre-line">{business.aboutText}</p>
          </div>
        </section>
      )}

      <footer className="border-t mt-4 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-8">
            <div className="text-center sm:text-left">
              {business.logoUrl ? (
                <img src={business.logoUrl} alt={business.name} className="w-10 h-10 rounded-full object-cover mx-auto sm:mx-0" />
              ) : (
                <div
                  className="w-10 h-10 rounded-full text-white flex items-center justify-center font-heading font-bold mx-auto sm:mx-0"
                  style={{ backgroundColor: accent }}
                >
                  {business.name.charAt(0).toUpperCase()}
                </div>
              )}
              <p className="font-heading font-semibold text-sm mt-2">{business.name}</p>
              {business.description && (
                <p className="text-xs text-black/40 mt-1 max-w-xs">{business.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-8 text-center sm:text-left">
              <div>
                <p className="text-xs font-semibold text-black/70 mb-2">Contacto</p>
                <ul className="space-y-1.5 text-xs text-black/50">
                  <li>
                    <a href={`https://wa.me/${business.whatsapp}`} target="_blank" rel="noreferrer">
                      💬 WhatsApp
                    </a>
                  </li>
                  {business.location && <li>📍 {business.location}</li>}
                  {engine.showSchedule && business.schedule && <li>🕒 {business.schedule}</li>}
                </ul>
              </div>

              {(business.socialLinks?.instagram || business.socialLinks?.facebook) && (
                <div>
                  <p className="text-xs font-semibold text-black/70 mb-2">Síguenos</p>
                  <ul className="space-y-1.5 text-xs text-black/50">
                    {business.socialLinks?.instagram && (
                      <li>
                        <a
                          href={`https://instagram.com/${business.socialLinks.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          📷 Instagram
                        </a>
                      </li>
                    )}
                    {business.socialLinks?.facebook && (
                      <li>
                        <a href={business.socialLinks.facebook} target="_blank" rel="noreferrer">
                          📘 Facebook
                        </a>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="border-t mt-8 pt-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-black/30">
            <span>© {new Date().getFullYear()} {business.name}. Todos los derechos reservados.</span>
            {showBranding && <span>Creado con Bizly Store</span>}
          </div>
        </div>
      </footer>

      {/* Carrito lateral */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="relative bg-white w-full max-w-sm h-full flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-heading font-semibold">Tu pedido</h3>
              <button onClick={() => setCartOpen(false)} className="text-black/40 text-xl leading-none">
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {cart.length === 0 ? (
                <p className="text-sm text-black/40 text-center py-10">Todavía no agregas productos.</p>
              ) : (
                cart.map((i) => (
                  <div key={i.product.id} className="flex items-center justify-between text-sm">
                    <div className="min-w-0">
                      <p className="truncate">{i.product.name}</p>
                      <p className="text-xs text-black/40">${i.product.price} MXN</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <button onClick={() => updateQuantity(i.product.id, -1)} className="w-6 h-6 rounded-full bg-black/5">
                        −
                      </button>
                      <span>{i.quantity}</span>
                      <button onClick={() => updateQuantity(i.product.id, 1)} className="w-6 h-6 rounded-full bg-black/5">
                        +
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t px-5 py-4 space-y-3">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-bizly-green/10 rounded-lg px-3 py-2 text-xs">
                    <span className="font-medium">
                      🎟️ {appliedCoupon.code} aplicado (-
                      {appliedCoupon.type === 'percentage' ? `${appliedCoupon.value}%` : `$${appliedCoupon.value} MXN`})
                    </span>
                    <button onClick={removeCoupon} className="text-black/40 font-medium">
                      Quitar
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Código de descuento"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none uppercase"
                      />
                      <button
                        onClick={applyCoupon}
                        disabled={checkingCoupon || !couponInput.trim()}
                        className="px-4 py-2 rounded-lg bg-black/5 text-xs font-semibold disabled:opacity-50"
                      >
                        {checkingCoupon ? '...' : 'Aplicar'}
                      </button>
                    </div>
                    {couponError && <p className="text-xs text-red-600 mt-1">{couponError}</p>}
                  </div>
                )}

                <div className="space-y-1">
                  {appliedCoupon && (
                    <>
                      <div className="flex items-center justify-between text-xs text-black/50">
                        <span>Subtotal</span>
                        <span>${subtotal} MXN</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-bizly-green">
                        <span>Descuento</span>
                        <span>-${discountAmount} MXN</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between font-semibold text-sm">
                    <span>Total</span>
                    <span>${total} MXN</span>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Tu nombre"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                />
                <input
                  type="tel"
                  placeholder="Tu teléfono (opcional)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
                />
                {orderError && <p className="text-xs text-red-600">{orderError}</p>}
                <button
                  onClick={sendOrder}
                  disabled={sendingOrder}
                  className="w-full py-3 rounded-full text-white text-sm font-semibold disabled:opacity-60"
                  style={{ backgroundColor: accent }}
                >
                  {sendingOrder ? 'Enviando...' : 'Finalizar pedido por WhatsApp'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          engine={engine}
          accent={accent}
          buttonRadiusClass={buttonRadiusClass}
          isFavorite={isFavorite(selectedProduct.id)}
          onToggleFavorite={() => toggleFavorite(selectedProduct.id)}
          onClose={() => setSelectedProduct(null)}
          onAdd={addToCart}
        />
      )}

      {/* Barra persistente de carrito (solo móvil, estilo apps de comida) */}
      {cart.length > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-[68px] inset-x-4 z-40 sm:hidden rounded-full text-white text-sm font-semibold py-3 px-5 shadow-lg flex items-center justify-between"
          style={{ backgroundColor: accent }}
        >
          <span>🛒 {cartCount} {cartCount === 1 ? 'producto' : 'productos'}</span>
          <span>${total} MXN · Ver pedido →</span>
        </button>
      )}

      {/* Navegación inferior estilo app (solo móvil) */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t flex sm:hidden">
        <button onClick={() => scrollTo('inicio')} className="flex-1 py-3 text-center text-xs text-black/60">
          🏠<br />Inicio
        </button>
        <button
          onClick={() => {
            setShowFavoritesOnly(false);
            scrollTo('catalogo');
          }}
          className="flex-1 py-3 text-center text-xs text-black/60"
        >
          🗂️<br />{engine.key === 'food' ? 'Menú' : 'Catálogo'}
        </button>
        <button
          onClick={() => {
            setShowFavoritesOnly(true);
            scrollTo('catalogo');
          }}
          className="flex-1 py-3 text-center text-xs relative"
          style={showFavoritesOnly ? { color: accent } : { color: 'rgba(0,0,0,0.6)' }}
        >
          {showFavoritesOnly ? '❤️' : '🤍'}<br />Favoritos
          {favorites.length > 0 && (
            <span
              className="absolute top-1 right-1/3 text-[10px] text-white rounded-full w-4 h-4 flex items-center justify-center"
              style={{ backgroundColor: accent }}
            >
              {favorites.length}
            </span>
          )}
        </button>
        <button onClick={() => setCartOpen(true)} className="flex-1 py-3 text-center text-xs text-black/60 relative">
          🛒<br />{engine.key === 'food' ? 'Pedido' : 'Carrito'}
          {cartCount > 0 && (
            <span
              className="absolute top-1 right-1/3 text-[10px] text-white rounded-full w-4 h-4 flex items-center justify-center"
              style={{ backgroundColor: accent }}
            >
              {cartCount}
            </span>
          )}
        </button>
        <a
          href={`https://wa.me/${business.whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className="flex-1 py-3 text-center text-xs text-black/60"
        >
          💬<br />Contacto
        </a>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  onAdd,
  onOpenDetail,
  engine,
  accent,
  buttonRadiusClass,
  isFavorite = false,
  onToggleFavorite,
  highlight = false,
}: {
  product: Product;
  onAdd: (p: Product) => void;
  onOpenDetail: () => void;
  engine: ReturnType<typeof getStoreEngine>;
  accent: string;
  buttonRadiusClass: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  highlight?: boolean;
}) {
  const badgeLabel = engine.showBadges && product.badge ? PRODUCT_BADGE_LABELS[product.badge] : null;

  const heartButton = onToggleFavorite && (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggleFavorite();
      }}
      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-sm z-10"
      aria-label="Favorito"
    >
      {isFavorite ? '❤️' : '🤍'}
    </button>
  );

  // Motor Food: imagen protagonista con degradado y precio superpuesto (estilo menú apetitoso)
  if (engine.cardStyle === 'food') {
    return (
      <div
        onClick={onOpenDetail}
        className="relative rounded-2xl overflow-hidden shadow-sm transition hover:shadow-md hover:-translate-y-0.5 aspect-square cursor-pointer"
        style={highlight ? { boxShadow: `0 0 0 2px ${accent}` } : undefined}
      >
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-black/5 flex items-center justify-center text-black/20 text-xs">
            Sin imagen
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        {heartButton}
        {(badgeLabel || product.featured) && (
          <span
            className="absolute top-2 left-2 text-white text-[10px] font-semibold px-2 py-1 rounded-full"
            style={{ backgroundColor: accent }}
          >
            {badgeLabel || 'Destacado'}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-3 text-white">
          <p className="font-semibold text-sm leading-tight">{product.name}</p>
          <div className="flex items-center justify-between mt-1">
            <span className="font-bold text-sm">${product.price} MXN</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdd(product);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-lg font-bold shrink-0"
              style={{ backgroundColor: accent }}
              aria-label={engine.addButtonLabel}
            >
              +
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Motor Fashion: tarjeta editorial, minimalista, imagen vertical, texto discreto
  if (engine.cardStyle === 'fashion') {
    return (
      <div className="group cursor-pointer" onClick={onOpenDetail}>
        <div className="relative aspect-[4/5] bg-black/5 overflow-hidden rounded-lg">
          {heartButton}
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover transition group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-black/20 text-xs">Sin imagen</div>
          )}
          {(badgeLabel || product.featured) && (
            <span className="absolute top-2 left-2 bg-white/90 text-black/70 text-[10px] font-semibold px-2 py-1 rounded-full tracking-wide uppercase">
              {badgeLabel || 'Destacado'}
            </span>
          )}
        </div>
        <div className="mt-2.5 text-center">
          <p className="text-xs uppercase tracking-wide text-black/70 font-medium">{product.name}</p>
          <p className="text-sm font-semibold mt-0.5" style={{ color: accent }}>
            ${product.price} MXN
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd(product);
            }}
            className="mt-2 text-[11px] uppercase tracking-wide font-semibold border-b pb-0.5"
            style={{ borderColor: accent, color: accent }}
          >
            {engine.addButtonLabel}
          </button>
        </div>
      </div>
    );
  }

  // Motor Business: tarjeta informativa, corporativa, con marca/modelo si aplica
  return (
    <div
      onClick={onOpenDetail}
      className={`bg-white shadow-sm overflow-hidden transition hover:shadow-md cursor-pointer ${buttonRadiusClass === 'rounded-full' ? 'rounded-2xl' : 'rounded-lg'}`}
      style={highlight ? { boxShadow: `0 0 0 1px ${accent}55` } : undefined}
    >
      <div className="relative aspect-square bg-black/5 flex items-center justify-center text-black/20 text-xs">
        {heartButton}
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          'Sin imagen'
        )}
        {(badgeLabel || product.featured) && (
          <span
            className="absolute top-2 left-2 text-white text-[10px] font-semibold px-2 py-1 rounded-full"
            style={{ backgroundColor: accent }}
          >
            {badgeLabel || 'Destacado'}
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="font-medium">{product.name}</p>
        {engine.showBrandModel && (product.brand || product.model) && (
          <p className="text-xs text-black/40 mt-0.5">
            {[product.brand, product.model].filter(Boolean).join(' · ')}
          </p>
        )}
        {product.description && <p className="text-xs text-black/50 mt-1 line-clamp-2">{product.description}</p>}
        <div className="flex items-center justify-between mt-3">
          <span className="font-semibold" style={{ color: accent }}>
            ${product.price} MXN
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd(product);
            }}
            className={`px-3 py-1.5 ${buttonRadiusClass} bg-bizly-dark text-white text-xs font-medium`}
          >
            {engine.addButtonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Layout de lista (no cuadrícula) para el motor Business — se siente más
 * como un directorio de servicios/catálogo corporativo que como tienda de
 * productos físicos.
 */
function ProductListRow({
  product,
  onAdd,
  onOpenDetail,
  engine,
  accent,
  buttonRadiusClass,
  isFavorite = false,
  onToggleFavorite,
}: {
  product: Product;
  onAdd: (p: Product) => void;
  onOpenDetail: () => void;
  engine: ReturnType<typeof getStoreEngine>;
  accent: string;
  buttonRadiusClass: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}) {
  const badgeLabel = engine.showBadges && product.badge ? PRODUCT_BADGE_LABELS[product.badge] : null;
  return (
    <div
      onClick={onOpenDetail}
      className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition"
    >
      <div className="relative w-20 h-20 rounded-lg bg-black/5 overflow-hidden shrink-0 flex items-center justify-center text-black/20 text-[10px]">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          'Sin imagen'
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{product.name}</p>
          {(badgeLabel || product.featured) && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white shrink-0"
              style={{ backgroundColor: accent }}
            >
              {badgeLabel || 'Destacado'}
            </span>
          )}
        </div>
        {engine.showBrandModel && (product.brand || product.model) && (
          <p className="text-xs text-black/40">{[product.brand, product.model].filter(Boolean).join(' · ')}</p>
        )}
        {product.description && <p className="text-xs text-black/50 mt-0.5 line-clamp-1">{product.description}</p>}
        <p className="font-semibold text-sm mt-1" style={{ color: accent }}>
          ${product.price} MXN
        </p>
      </div>
      <div className="flex flex-col items-center gap-2 shrink-0">
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className="text-lg"
            aria-label="Favorito"
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd(product);
          }}
          className={`px-3 py-1.5 ${buttonRadiusClass} bg-bizly-dark text-white text-xs font-medium whitespace-nowrap`}
        >
          {engine.addButtonLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * Fila de menú estilo Uber Eats / Rappi: información a la izquierda, foto
 * pequeña a la derecha con el botón "+" superpuesto en su esquina.
 */
function RestaurantMenuRow({
  product,
  onAdd,
  onOpenDetail,
  engine,
  accent,
  isFavorite = false,
  onToggleFavorite,
}: {
  product: Product;
  onAdd: (p: Product) => void;
  onOpenDetail: () => void;
  engine: ReturnType<typeof getStoreEngine>;
  accent: string;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}) {
  const badgeLabel = engine.showBadges && product.badge ? PRODUCT_BADGE_LABELS[product.badge] : null;
  return (
    <div
      onClick={onOpenDetail}
      className="bg-white rounded-2xl shadow-sm p-3 flex items-center gap-3 cursor-pointer hover:shadow-md transition"
    >
      <div className="flex-1 min-w-0">
        {(badgeLabel || product.featured) && (
          <span className="text-[10px] font-semibold" style={{ color: accent }}>
            {badgeLabel || 'Destacado'}
          </span>
        )}
        <p className="font-semibold text-sm truncate">{product.name}</p>
        {product.description && (
          <p className="text-xs text-black/45 mt-0.5 line-clamp-2">{product.description}</p>
        )}
        <p className="font-bold text-sm mt-1.5">${product.price} MXN</p>
      </div>

      <div className="relative w-24 h-24 rounded-xl bg-black/5 overflow-hidden shrink-0">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-black/20 text-[10px]">Sin foto</div>
        )}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-xs"
            aria-label="Favorito"
          >
            {isFavorite ? '❤️' : '🤍'}
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd(product);
          }}
          className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center text-white text-base font-bold shadow-sm"
          style={{ backgroundColor: accent }}
          aria-label={engine.addButtonLabel}
        >
          +
        </button>
      </div>
    </div>
  );
}

/**
 * Página de detalle de producto — lo que más aleja a Bizly Store de sentirse
 * como un "menú" y lo acerca a un ecommerce real: foto grande, información
 * completa, selector de cantidad, y agregar desde ahí.
 */
function ProductDetailModal({
  product,
  engine,
  accent,
  buttonRadiusClass,
  isFavorite,
  onToggleFavorite,
  onClose,
  onAdd,
}: {
  product: Product;
  engine: ReturnType<typeof getStoreEngine>;
  accent: string;
  buttonRadiusClass: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
  onAdd: (p: Product, quantity: number) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const badgeLabel = engine.showBadges && product.badge ? PRODUCT_BADGE_LABELS[product.badge] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[90vh] overflow-y-auto shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-lg z-10"
        >
          ×
        </button>
        <button
          onClick={onToggleFavorite}
          className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-sm z-10"
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>

        <div className="aspect-square bg-black/5">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-black/20 text-sm">Sin imagen</div>
          )}
        </div>

        <div className="p-6">
          {badgeLabel && (
            <span
              className="inline-block text-[10px] font-semibold px-2 py-1 rounded-full text-white mb-2"
              style={{ backgroundColor: accent }}
            >
              {badgeLabel}
            </span>
          )}
          <h2 className="font-heading text-xl font-bold">{product.name}</h2>
          {engine.showBrandModel && (product.brand || product.model) && (
            <p className="text-sm text-black/40 mt-0.5">
              {[product.brand, product.model].filter(Boolean).join(' · ')}
            </p>
          )}
          <p className="font-bold text-2xl mt-2" style={{ color: accent }}>
            ${product.price} MXN
          </p>
          {product.description && (
            <p className="text-sm text-black/60 leading-relaxed mt-3">{product.description}</p>
          )}
          {product.stock !== undefined && (
            <p className="text-xs text-black/40 mt-2">
              {product.stock > 0 ? `${product.stock} disponibles` : 'Sin stock'}
            </p>
          )}

          <div className="flex items-center gap-4 mt-6">
            <div className="flex items-center border rounded-full">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-9 h-9 flex items-center justify-center text-lg"
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-9 h-9 flex items-center justify-center text-lg"
              >
                +
              </button>
            </div>
            <button
              onClick={() => onAdd(product, quantity)}
              className={`flex-1 py-3 ${buttonRadiusClass} text-white text-sm font-semibold`}
              style={{ backgroundColor: accent }}
            >
              {engine.addButtonLabel} · ${product.price * quantity} MXN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
